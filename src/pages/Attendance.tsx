import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Calendar, Download, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import LogPreview from '../components/LogPreview';

const Attendance = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const thBg = isDark ? 'bg-gray-700' : 'bg-gray-100';

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [previewLog, setPreviewLog] = useState<any>(null);

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

  // Fetch data
  const data = useLiveQuery(async () => {
    if (!selectedProjectId) return null;

    // Get logs for the month
    const logs = await db.dailyLogs
      .where('projectId').equals(selectedProjectId)
      .and(log => log.date.startsWith(selectedMonth))
      .sortBy('date');

    const logIds = logs.map(l => l.id!);
    const attendanceRecords = await db.attendance.where('dailyLogId').anyOf(logIds).toArray();
    
    // Get all workers to resolve current names and group by ID
    const allWorkers = await db.workers.toArray();
    const workersMap = new Map(allWorkers.map(w => [w.id!, w]));

    // Group by workerId
    const workersGrouped = new Map<number, any>();

    // First, populate with any worker that has attendance
    attendanceRecords.forEach(r => {
        if (!workersGrouped.has(r.workerId)) {
            const worker = workersMap.get(r.workerId);
            const name = worker ? worker.name : r.workerName; // Fallback to snapshot name
            workersGrouped.set(r.workerId, { 
                id: r.workerId,
                name: name, 
                attendance: {} 
            });
        }
        
        const log = logs.find(l => l.id === r.dailyLogId);
        if (log) {
            const day = parseInt(log.date.split('-')[2]);
            workersGrouped.get(r.workerId).attendance[day] = r.status;
        }
    });

    return {
        logs,
        workers: Array.from(workersGrouped.values()).sort((a, b) => a.name.localeCompare(b.name)),
        daysInMonth: new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()
    };
  }, [selectedProjectId, selectedMonth]);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Presente': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
          case 'Falta': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
          case 'Permiso': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
          case 'Tardanza': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
          case 'Descanso': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
          case 'Baja': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      }
  };

  const getStatusSymbol = (status: string) => {
      switch (status) {
          case 'Presente': return 'P';
          case 'Falta': return 'F';
          case 'Permiso': return 'L'; // Licencia/Permiso
          case 'Tardanza': return 'T';
          case 'Descanso': return 'D';
          case 'Baja': return 'B';
          default: return '-';
      }
  };

  const handleDayClick = (day: number) => {
      if (!data) return;
      // Find log for this day
      const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
      const log = data.logs.find(l => l.date === dateStr);
      if (log) {
          setPreviewLog(log);
      }
  };

  const handleGeneratePDF = (mode: 'download' | 'preview') => {
    if (!data || !selectedProjectId) {
      toast.error('No hay datos para generar el reporte');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
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
    doc.text('REGISTRO DE ASISTENCIA', systemLogo ? 50 : 14, 25);
    
    // Company Info in Header if available
    if (companyData?.name) {
        doc.setFontSize(10);
        doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
        if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
        if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
    }

    const project = projects.find(p => p.id?.toString() === selectedProjectId);
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    doc.setTextColor(0, 0, 0); // Reset text color for body
    doc.setFontSize(12);
    doc.text(`Obra: ${project?.name || '-'}`, 14, 50);
    doc.text(`Mes: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, pageWidth - 14, 50, { align: 'right' });

    // Table
    const days = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);
    const columns = [
        { header: 'Personal', dataKey: 'name' },
        ...days.map(d => ({ header: d.toString(), dataKey: d.toString() }))
    ];

    const body = data.workers.map((worker: any) => {
        const row: any = { name: worker.name };
        days.forEach(day => {
            row[day.toString()] = getStatusSymbol(worker.attendance[day] || '');
        });
        return row;
    });

    autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: body.map(row => columns.map(c => row[c.dataKey])),
        startY: 60,
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'left', cellWidth: 40 }, // Name column
        },
        didParseCell: (data) => {
             // Center align day columns
             if (data.section === 'body' && data.column.index > 0) {
                 data.cell.styles.halign = 'center';
                 const text = data.cell.text[0];
                 if (text === 'F') data.cell.styles.textColor = [220, 38, 38]; // Red
                 else if (text === 'P') data.cell.styles.textColor = [22, 163, 74]; // Green
                 else if (text === 'T') data.cell.styles.textColor = [234, 88, 12]; // Orange
                 else if (text === 'L') data.cell.styles.textColor = [202, 138, 4]; // Yellow
             }
        }
    });

    // Legend
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('Leyenda: P=Presente, F=Falta, T=Tardanza, L=Licencia, D=Descanso, B=Baja', 14, finalY + 10);

    if (mode === 'download') {
        doc.save(`Asistencia_${project?.name}_${selectedMonth}.pdf`);
        toast.success('Reporte descargado');
    } else {
        window.open(doc.output('bloburl'), '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>Registro de Asistencia</h1>
          <p className={`text-sm ${subTextColor}`}>Vista mensual de asistencia del personal.</p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={() => handleGeneratePDF('preview')}
                className={`p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor} hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2`}
                title="Vista Previa"
            >
                <Printer size={20} />
                <span className="hidden sm:inline">Vista Previa</span>
            </button>
            <button
                onClick={() => handleGeneratePDF('download')}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"
                title="Descargar PDF"
            >
                <Download size={20} />
                <span className="hidden sm:inline">Descargar PDF</span>
            </button>
        </div>
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

      {/* Matrix */}
      <div className={`${cardBg} rounded-lg shadow overflow-hidden border ${borderColor}`}>
        <div className="overflow-x-auto">
            {data && data.workers.length > 0 ? (
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className={`${thBg}`}>
                            <th className={`sticky left-0 z-10 p-3 text-left font-semibold ${textColor} ${thBg} border-b ${borderColor} min-w-[200px]`}>
                                Personal
                            </th>
                            {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map(day => {
                                const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
                                const hasLog = data.logs.some(l => l.date === dateStr);
                                
                                return (
                                    <th 
                                        key={day} 
                                        className={`p-2 text-center font-medium ${subTextColor} border-b ${borderColor} min-w-[30px] ${hasLog ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                                        onClick={() => hasLog && handleDayClick(day)}
                                        title={hasLog ? "Ver Reporte Diario" : "Sin reporte"}
                                    >
                                        {day}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${borderColor}`}>
                        {data.workers.map((worker: any) => (
                            <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className={`sticky left-0 z-10 p-3 ${cardBg} ${textColor} font-medium border-r ${borderColor}`}>
                                    {worker.name}
                                </td>
                                {Array.from({ length: data.daysInMonth }, (_, i) => i + 1).map(day => {
                                    const status = worker.attendance[day];
                                    return (
                                        <td key={day} className={`p-1 text-center border-r ${borderColor} border-opacity-20`}>
                                            {status ? (
                                                <div 
                                                    className={`w-6 h-6 mx-auto flex items-center justify-center rounded-full text-xs font-bold ${getStatusColor(status)}`}
                                                    title={status}
                                                >
                                                    {getStatusSymbol(status)}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className={`p-10 text-center ${subTextColor}`}>
                    <Calendar className="mx-auto mb-2 opacity-20" size={48} />
                    <p>No hay registros de asistencia para este periodo.</p>
                </div>
            )}
        </div>
      </div>
      
      <div className="flex gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold">P</div>
              <span className={subTextColor}>Presente</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold">F</div>
              <span className={subTextColor}>Falta</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-bold">T</div>
              <span className={subTextColor}>Tardanza</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold">L</div>
              <span className={subTextColor}>Licencia</span>
          </div>
           <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold">D</div>
              <span className={subTextColor}>Descanso</span>
          </div>
           <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center font-bold">B</div>
              <span className={subTextColor}>Baja</span>
          </div>
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
                </div>
            </>
        )}
      </Modal>

    </div>
  );
};

export default Attendance;
