import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SyncService } from '../services/SyncService';
import { Plus, Search, Edit, Trash2, Eye, ArrowUpDown, X, FileText } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const Projects = ({ filterStatus }: { filterStatus?: string }) => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-200';
  const tableHeaderBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [viewMoreProject, setViewMoreProject] = useState<{name: string, id: number} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const projects = useLiveQuery(async () => {
    const allProjects = await db.projects.toArray();
    if (user?.projectId) {
      return allProjects.filter(p => p.id === Number(user.projectId));
    }
    return allProjects;
  }, [user?.projectId]) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const projectBalances = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      const current = map.get(t.projectId) || 0;
      map.set(t.projectId, current + (t.type === 'Ingreso' ? Number(t.amount) : -Number(t.amount)));
    });
    return map;
  }, [transactions]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredProjects = projects
    .map(p => ({
      ...p,
      realBalance: projectBalances.get(p.id?.toString() || '') || 0
    }))
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus ? project.status === filterStatus : true;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;

      if (key === 'balance') {
        return direction === 'asc' 
          ? a.realBalance - b.realBalance
          : b.realBalance - a.realBalance;
      }

      if (key === 'value') {
        // @ts-ignore
        return direction === 'asc'
          ? (a.value || 0) - (b.value || 0)
          : (b.value || 0) - (a.value || 0);
      }
      
      // @ts-ignore
      const aValue = a[key]?.toString().toLowerCase() || '';
      // @ts-ignore
      const bValue = b[key]?.toString().toLowerCase() || '';

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await db.projects.delete(deleteModal.id);
      await SyncService.pushToRemote(false);
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/projects/edit/${id}`);
  };

  const handleViewAnalysis = () => {
    navigate('/analysis');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'En Ejecución': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'En Planificación': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Finalizado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Atrasado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleGenerateReport = async (project: any) => {
    try {
        toast.loading('Generando reporte...', { id: 'report-loading' });
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Fetch Data
        const projectTransactions = await db.transactions.where('projectId').equals(project.id.toString()).toArray();
        const projectInventory = await db.inventory.filter(i => i.projectId === project.id.toString()).toArray();
        const lowStock = projectInventory.filter(i => i.quantity <= (i.minStock || 10));
        
        // Income/Expense
        const income = projectTransactions.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = projectTransactions.filter(t => t.type === 'Gasto').reduce((sum, t) => sum + Number(t.amount), 0);
        const balance = income - expense;

        // Company Logo
        const systemLogo = await db.settings.where('key').equals('system_logo').first();
        const keys = ['company_name', 'company_address', 'company_email'];
        const settings = await db.settings.where('key').anyOf(keys).toArray();
        const companyData = {
            name: settings.find(s => s.key === 'company_name')?.value || '',
            address: settings.find(s => s.key === 'company_address')?.value || '',
            email: settings.find(s => s.key === 'company_email')?.value || ''
        };

        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        if (systemLogo?.value) {
            try {
                const isPng = systemLogo.value.startsWith('data:image/png');
                doc.addImage(systemLogo.value, isPng ? 'PNG' : 'JPEG', 14, 5, 30, 30);
            } catch (e) { console.error(e); }
        }

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN EJECUTIVO DE OBRA', systemLogo?.value ? 50 : 14, 25);
        
        doc.setFontSize(10);
        if (companyData.name) {
            doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
            if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
            if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
        }
        
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

        // Project Info
        doc.setTextColor(0, 0, 0);
        let yPos = 50;
        
        // Risk Calculation & Alert
        let isRisk = false;
        if (project.status !== 'Finalizado' && project.status !== 'Cancelado') {
             const pProgress = project.progress || 0;
             if (pProgress < 80 && project.endDate) {
                 const today = new Date();
                 today.setHours(0,0,0,0);
                 const end = new Date(project.endDate);
                 const diffTime = end.getTime() - today.getTime();
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 if (diffDays <= 30) isRisk = true;
             }
        }

        if (isRisk) {
            doc.setDrawColor(234, 179, 8); // Yellow-500
            doc.setFillColor(254, 252, 232); // Yellow-50
            doc.roundedRect(14, yPos, pageWidth - 28, 15, 2, 2, 'FD');
            
            doc.setTextColor(161, 98, 7); // text-yellow-700
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`ATENCIÓN: Esta obra está próxima a finalizar (${project.endDate}) y su avance es inferior al 80%.`, 18, yPos + 10);
            
            yPos += 25;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Información del Proyecto', 14, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const infoData = [
            ['Nombre:', project.name],
            ['Cliente:', project.client],
            ['Ubicación:', project.location || 'N/A'],
            ['Residente:', project.resident || 'N/A'],
            ['Estado:', project.status],
            ['Inicio - Fin:', `${project.startDate || '-'} / ${project.endDate || '-'}`],
            ['Presupuesto:', `S/ ${Number(project.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
        ];

        autoTable(doc, {
            startY: yPos,
            body: infoData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } }
        });

        // Financial Summary
        yPos = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('2. Resumen Financiero', 14, yPos);

        const financialData = [
            ['Ingresos Totales', `S/ ${income.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Gastos Totales', `S/ ${expense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Balance Actual', `S/ ${balance.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['% Rentabilidad', income > 0 ? `${((balance / income) * 100).toFixed(1)}%` : '0%']
        ];

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Indicador', 'Monto']],
            body: financialData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Inventory Summary
        yPos = (doc as any).lastAutoTable.finalY + 15;
        
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('3. Estado de Almacén', 14, yPos);

        const inventoryData = [
            ['Total Ítems', projectInventory.length.toString()],
            ['Ítems con Stock Bajo', lowStock.length.toString()],
            ['Valorizado Aprox.', `S/ ${(projectInventory.length * 0).toFixed(2)} (Ref)`] // Placeholder for value if we had cost
        ];

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Concepto', 'Valor']],
            body: inventoryData,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] }
        });

        // Critical Items List (if any)
        if (lowStock.length > 0) {
            yPos = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setTextColor(231, 76, 60); // Red
            doc.text(`⚠️ Alerta: ${lowStock.length} ítems con stock crítico`, 14, yPos);
            doc.setTextColor(0, 0, 0);
            
            const lowStockRows = lowStock.map(i => [i.name, `${i.quantity} ${i.unit}`, i.minStock || 10]);
            
            autoTable(doc, {
                startY: yPos + 5,
                head: [['Ítem', 'Stock Actual', 'Mínimo']],
                body: lowStockRows,
                theme: 'striped',
                headStyles: { fillColor: [231, 76, 60] },
                styles: { fontSize: 8 }
            });
        }

        doc.save(`Resumen_Ejecutivo_${project.name.substring(0, 10)}_${new Date().getTime()}.pdf`);
        toast.dismiss('report-loading');
        toast.success('Reporte generado correctamente');

    } catch (error) {
        console.error(error);
        toast.error('Error al generar el reporte');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {filterStatus === 'Finalizado' ? 'Obras Terminadas' : 'Panel de Obras'}
        </h1>
        {!filterStatus && (
          <Link
            to="/projects/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Registrar Nueva Obra
          </Link>
        )}
      </div>

      {/* Filters/Search */}
      <div className={`${cardBg} p-4 rounded-xl shadow-sm flex items-center gap-4`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Buscar obra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${borderColor} rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${textColor} placeholder-gray-400 dark:placeholder-gray-500`}
          />
        </div>
      </div>

      {viewMoreProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full relative shadow-xl">
            <button
              onClick={() => setViewMoreProject(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pr-8">Nombre Completo de la Obra</h3>
            <div className="max-h-[60vh] overflow-y-auto text-justify text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {viewMoreProject.name.charAt(0).toUpperCase() + viewMoreProject.name.slice(1).toLowerCase()}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewMoreProject(null)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Eliminar Obra"
        message="¿Está seguro que desea eliminar esta obra? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Projects List */}
      <div className={`${cardBg} p-6 rounded-xl shadow-sm`}>
        <h3 className={`text-lg font-bold ${textColor} mb-4`}>Listado de Obras</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={`${tableHeaderBg}`}>
              <tr>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider cursor-pointer ${hoverBg} min-w-[200px]`}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Nombre Obra
                    <ArrowUpDown size={14} className={sortConfig?.key === 'name' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider cursor-pointer ${hoverBg}`}
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    <ArrowUpDown size={14} className={sortConfig?.key === 'client' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Valor Obra</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Balance</th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider cursor-pointer ${hoverBg}`}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Estado
                    <ArrowUpDown size={14} className={sortConfig?.key === 'status' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider cursor-pointer ${hoverBg}`}
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center gap-1">
                    % Avance
                    <ArrowUpDown size={14} className={sortConfig?.key === 'progress' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                  </div>
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y divide-gray-200 dark:divide-gray-700`}>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className={`px-6 py-4 text-sm font-medium ${textColor} min-w-[200px] max-w-xs`}>
                    <div className="line-clamp-3 whitespace-normal text-justify break-words">
                      {project.name.charAt(0).toUpperCase() + project.name.slice(1).toLowerCase()}
                    </div>
                    {project.name.length > 80 && (
                      <button
                        onClick={() => setViewMoreProject({name: project.name, id: project.id!})}
                        className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 block focus:outline-none font-semibold"
                      >
                        Ver más
                      </button>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{project.client}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${textColor}`}>
                    S/ {Number(project.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${project.realBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {project.realBalance >= 0 ? '+' : '-'} S/ {Math.abs(Number(project.realBalance)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(project.status || '')}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                    <div className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5 min-w-[100px]`}>
                      <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                    </div>
                    <span className={`text-xs ${subTextColor} mt-1 block text-right`}>{project.progress || 0}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGenerateReport(project)}
                        className="text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400"
                        title="Resumen Ejecutivo PDF"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => handleViewAnalysis()}
                        className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400" 
                        title="Ver Análisis"
                      >
                        <Eye size={18} />
                      </button>
                      {hasPermission('projects.edit') && (
                        <button 
                          onClick={() => handleEdit(project.id!)}
                          className="text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400" 
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {hasPermission('projects.delete') && (
                        <button 
                          onClick={() => handleDelete(project.id!)}
                          className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400" 
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400">
               {searchTerm ? 'No se encontraron obras con ese criterio.' : 'No hay obras registradas.'}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
