import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, FileText, BookOpen, Trash2, Eye, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';
import SearchableSelect from '../components/SearchableSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LogPreview from '../components/LogPreview';

const DailyLogs = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, hasPermission } = useAuth();
  
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [previewLog, setPreviewLog] = useState<any>(null);
  const [deleteLogId, setDeleteLogId] = useState<number | null>(null);

  const systemLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
  });

  const companyData = useLiveQuery(async () => {
    const keys = ['company_name', 'company_address', 'company_website', 'company_email'];
    const settings = await db.settings.where('key').anyOf(keys).toArray();
    return {
      name: settings.find(s => s.key === 'company_name')?.value || '',
      address: settings.find(s => s.key === 'company_address')?.value || '',
      website: settings.find(s => s.key === 'company_website')?.value || '',
      email: settings.find(s => s.key === 'company_email')?.value || ''
    };
  });

  const projects = useLiveQuery(async () => {
    const all = await db.projects.where('status').anyOf('En Ejecución', 'En Planificación', 'Atrasado').toArray();
    if (user?.projectId) {
      return all.filter(p => p.id === Number(user.projectId));
    }
    return all;
  }, [user?.projectId]) || [];

  const projectOptions = projects.map(p => ({ value: p.id!.toString(), label: p.name }));

  // Set default project
  useMemo(() => {
    if (projects.length > 0 && !selectedProjectId) {
      if (user?.projectId) {
        setSelectedProjectId(user.projectId.toString());
      } else {
        setSelectedProjectId(projects[0].id!.toString());
      }
    }
  }, [projects, user?.projectId, selectedProjectId]);

  const logs = useLiveQuery(async () => {
    if (!selectedProjectId) return [];
    
    // Filter by project and month (string comparison works for ISO dates YYYY-MM)
    return await db.dailyLogs
      .where('projectId').equals(selectedProjectId)
      .and(log => log.date.startsWith(selectedMonth))
      .reverse()
      .sortBy('date');
  }, [selectedProjectId, selectedMonth]) || [];

  const handleDeleteLog = async () => {
    if (!deleteLogId) return;
    try {
        await db.transaction('rw', db.dailyLogs, db.attendance, db.inventory, async () => {
            await db.attendance.where('dailyLogId').equals(deleteLogId).delete();
            await db.dailyLogs.delete(deleteLogId);
        });
        await SyncService.pushToRemote(false);
        toast.success('Reporte eliminado correctamente');
        setDeleteLogId(null);
    } catch (error) {
        console.error('Error deleting log:', error);
        toast.error('Error al eliminar el reporte');
    }
  };

  const handleGenerateMonthlyPDF = async () => {
    if (logs.length === 0) {
      toast.error('No hay reportes para generar en este mes');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const project = projects.find(p => p.id?.toString() === selectedProjectId);
      
      let isFirstPage = true;

      for (const log of logs) {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        // Fetch attendance for this log
        const attendance = await db.attendance.where('dailyLogId').equals(log.id!).toArray();

        // --- DRAW SINGLE PAGE CONTENT (Same logic as handleGeneratePDF) ---
        
        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Logo
        if (systemLogo) {
            try {
                const isPng = systemLogo.startsWith('data:image/png');
                const format = isPng ? 'PNG' : 'JPEG';
                doc.addImage(systemLogo, format, 14, 5, 30, 30);
            } catch (e) {
                console.error('Error adding logo to PDF', e);
            }
        }

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DIARIO DE OBRA', systemLogo ? 50 : 14, 25);
        
        // Company Info
        if (companyData?.name) {
            doc.setFontSize(10);
            doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
            if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
            if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
        }

        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date(log.date + 'T12:00:00').toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

        // Project Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Obra: ${project?.name || 'N/A'}`, 14, 50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Clima: ${log.weather || 'No registrado'}`, 14, 56);

        let yPos = 65;

        // Attendance Summary
        const presentCount = attendance.filter(a => a.status === 'Presente').length;
        const absentCount = attendance.filter(a => a.status === 'Falta').length;
        const totalWorkers = attendance.length;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Resumen de Personal (${totalWorkers})`, 14, yPos);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Presentes: ${presentCount} | Faltas: ${absentCount} | Otros: ${totalWorkers - presentCount - absentCount}`, 14, yPos + 6);

        yPos += 15;

        // Activities
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Actividades Realizadas', 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const splitActivities = doc.splitTextToSize(log.activities, pageWidth - 28);
        doc.text(splitActivities, 14, yPos);
        yPos += (splitActivities.length * 5) + 10;

        // Incidents
        if (log.incidents) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38); // Red for incidents
          doc.text('Incidentes / Observaciones', 14, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 6;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          const splitIncidents = doc.splitTextToSize(log.incidents, pageWidth - 28);
          doc.text(splitIncidents, 14, yPos);
          yPos += (splitIncidents.length * 5) + 10;
        }

        // Materials Used
        if (log.usedMaterials && log.usedMaterials.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Materiales Utilizados', 14, yPos);
          
          const materialsData = log.usedMaterials.map((m: any) => [
              m.name,
              m.quantity.toString(),
              m.unit
          ]);

          autoTable(doc, {
            startY: yPos + 2,
            head: [['Material', 'Cantidad', 'Unidad']],
            body: materialsData,
            theme: 'grid',
            headStyles: { fillColor: [230, 126, 34], textColor: 255 }, // Orange header
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 }
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Attendance Details Table
        doc.text('Detalle de Asistencia', 14, yPos);
        
        const tableData = attendance.map(a => [
          a.workerName,
          a.workerRole,
          a.status,
          a.notes || ''
        ]);

        autoTable(doc, {
          startY: yPos + 2,
          head: [['Nombre', 'Rol', 'Estado', 'Notas']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 8 }
        });

        // Photos (if any)
        if (log.photos && log.photos.length > 0) {
          let photoY = (doc as any).lastAutoTable.finalY + 15;
          
          // Check if we need a new page
          if (photoY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            photoY = 20;
          }

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Registro Fotográfico', 14, photoY);
          photoY += 10;

          let xPos = 14;
          const imgWidth = 80;
          const imgHeight = 60;

          for (let i = 0; i < log.photos.length; i++) {
              // Check page break
              if (photoY + imgHeight > doc.internal.pageSize.height - 10) {
                  doc.addPage();
                  photoY = 20;
                  xPos = 14;
              }

              try {
                  doc.addImage(log.photos[i], 'JPEG', xPos, photoY, imgWidth, imgHeight);
                  
                  // 2 photos per row
                  if (xPos === 14) {
                      xPos += imgWidth + 10;
                  } else {
                      xPos = 14;
                      photoY += imgHeight + 10;
                  }
              } catch (e) {
                  console.error("Error adding image", e);
              }
          }
        }
      }

      doc.save(`Reporte_Mensual_${selectedMonth}.pdf`);
      toast.success('Reporte mensual generado correctamente');

    } catch (error) {
      console.error('Error generating monthly PDF', error);
      toast.error('Error al generar el reporte mensual');
    }
  };

  const handleGeneratePDF = async (logId: number) => {
    try {
      const log = await db.dailyLogs.get(logId);
      if (!log) return;
      
      const project = projects.find(p => p.id?.toString() === log.projectId);
      const attendance = await db.attendance.where('dailyLogId').equals(logId).toArray();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo
      if (systemLogo) {
          try {
              const isPng = systemLogo.startsWith('data:image/png');
              const format = isPng ? 'PNG' : 'JPEG';
              doc.addImage(systemLogo, format, 14, 5, 30, 30);
          } catch (e) {
              console.error('Error adding logo to PDF', e);
          }
      }

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DIARIO DE OBRA', systemLogo ? 50 : 14, 25);
      
      // Company Info
      if (companyData?.name) {
          doc.setFontSize(10);
          doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
          if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
          if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
      }

      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date(log.date + 'T12:00:00').toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

      // Project Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Obra: ${project?.name || 'N/A'}`, 14, 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Clima: ${log.weather || 'No registrado'}`, 14, 56);

      let yPos = 65;

      // Attendance Summary
      const presentCount = attendance.filter(a => a.status === 'Presente').length;
      const absentCount = attendance.filter(a => a.status === 'Falta').length;
      const totalWorkers = attendance.length;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Resumen de Personal (${totalWorkers})`, 14, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Presentes: ${presentCount} | Faltas: ${absentCount} | Otros: ${totalWorkers - presentCount - absentCount}`, 14, yPos + 6);

      yPos += 15;

      // Activities
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Actividades Realizadas', 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const splitActivities = doc.splitTextToSize(log.activities, pageWidth - 28);
      doc.text(splitActivities, 14, yPos);
      yPos += (splitActivities.length * 5) + 10;

      // Incidents
      if (log.incidents) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red for incidents
        doc.text('Incidentes / Observaciones', 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const splitIncidents = doc.splitTextToSize(log.incidents, pageWidth - 28);
        doc.text(splitIncidents, 14, yPos);
        yPos += (splitIncidents.length * 5) + 10;
      }

      // Materials Used
      if (log.usedMaterials && log.usedMaterials.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Materiales Utilizados', 14, yPos);
        
        const materialsData = log.usedMaterials.map((m: any) => [
            m.name,
            m.quantity.toString(),
            m.unit
        ]);

        autoTable(doc, {
          startY: yPos + 2,
          head: [['Material', 'Cantidad', 'Unidad']],
          body: materialsData,
          theme: 'grid',
          headStyles: { fillColor: [230, 126, 34], textColor: 255 }, // Orange header
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Attendance Details Table
      doc.text('Detalle de Asistencia', 14, yPos);
      
      const tableData = attendance.map(a => [
        a.workerName,
        a.workerRole,
        a.status,
        a.notes || ''
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Nombre', 'Rol', 'Estado', 'Notas']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 }
      });

      // Photos (if any)
      if (log.photos && log.photos.length > 0) {
        let photoY = (doc as any).lastAutoTable.finalY + 15;
        
        // Check if we need a new page
        if (photoY > doc.internal.pageSize.height - 60) {
          doc.addPage();
          photoY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Registro Fotográfico', 14, photoY);
        photoY += 10;

        let xPos = 14;
        const imgWidth = 80;
        const imgHeight = 60;

        for (let i = 0; i < log.photos.length; i++) {
            // Check page break
            if (photoY + imgHeight > doc.internal.pageSize.height - 10) {
                doc.addPage();
                photoY = 20;
                xPos = 14;
            }

            try {
                doc.addImage(log.photos[i], 'JPEG', xPos, photoY, imgWidth, imgHeight);
                
                // 2 photos per row
                if (xPos === 14) {
                    xPos += imgWidth + 10;
                } else {
                    xPos = 14;
                    photoY += imgHeight + 10;
                }
            } catch (e) {
                console.error("Error adding image", e);
            }
        }
      }

      doc.save(`Reporte_Diario_${log.date}.pdf`);

    } catch (error) {
      console.error('Error generating PDF', error);
      toast.error('Error al generar el reporte PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>Cuaderno de Obra Digital</h1>
          <p className={`text-sm ${subTextColor}`}>Registro diario de actividades, asistencia e incidencias.</p>
        </div>
        {hasPermission('dailyLogs.create') && (
          <button 
            onClick={() => navigate('/daily-logs/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"
          >
            <Plus size={20} />
            Nuevo Reporte
          </button>
        )}
        <button 
            onClick={handleGenerateMonthlyPDF}
            className={`px-4 py-2 border ${borderColor} ${cardBg} ${textColor} rounded-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm`}
            title="Descargar todos los reportes del mes en un solo PDF"
        >
            <Printer size={20} />
            <span className="hidden sm:inline">Exportar Mes</span>
        </button>
      </div>

      {/* Filters */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} flex flex-col md:flex-row gap-4`}>
        <div className="flex-1">
          <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Obra</label>
          <SearchableSelect
            options={projectOptions}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            className="w-full"
            placeholder="Seleccionar Obra..."
          />
        </div>
        <div className="w-full md:w-48">
          <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Mes</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
          />
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {logs.length === 0 ? (
          <div className={`text-center py-10 ${subTextColor} ${cardBg} rounded-lg border ${borderColor}`}>
            <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
            <p>No hay registros para este mes en la obra seleccionada.</p>
          </div>
        ) : (
          logs.map(log => (
            <div 
              key={log.id} 
              className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} hover:shadow-md transition cursor-pointer group`}
              onClick={() => setPreviewLog(log)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${textColor}`}>
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className={`text-sm ${subTextColor} line-clamp-1`}>
                      {log.activities}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    {log.incidents && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium hidden md:inline-block">
                            Incidente
                        </span>
                    )}
                    
                    <button 
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${subTextColor}`}
                        title="Ver Detalles"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewLog(log);
                        }}
                    >
                        <Eye size={20} />
                    </button>

                    <button 
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${subTextColor}`}
                        title="Descargar PDF"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleGeneratePDF(log.id!);
                        }}
                    >
                        <FileText size={20} />
                    </button>

                    {hasPermission('dailyLogs.delete') && (
                        <button 
                            className={`p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500`}
                            title="Eliminar Reporte"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteLogId(log.id!);
                            }}
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewLog}
        onClose={() => setPreviewLog(null)}
        title="Detalle del Reporte Diario"
        size="lg"
      >
        {previewLog && (
            <>
                <LogPreview log={previewLog} />
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setPreviewLog(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={() => handleGeneratePDF(previewLog.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <FileText size={18} />
                        Descargar PDF
                    </button>
                </div>
            </>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteLogId}
        onClose={() => setDeleteLogId(null)}
        onConfirm={handleDeleteLog}
        title="Eliminar Reporte"
        message="¿Estás seguro de que deseas eliminar este reporte diario? Esta acción no se puede deshacer y también eliminará el registro de asistencia asociado."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default DailyLogs;