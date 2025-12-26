import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import Modal from '../components/Modal';
import { FileText, ArrowDown, ArrowUp, Package, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SearchableSelect from '../components/SearchableSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WarehouseReports = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const tableHeaderBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const hoverRowBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';

  // State
  const [activeTab, setActiveTab] = useState<'ingresos' | 'salidas' | 'stock'>('ingresos');
  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMoreName, setViewMoreName] = useState<string | null>(null);

  const toSentenceCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Data Fetching
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  
  const movements = useLiveQuery(async () => {
    let collection = db.inventoryMovements.toCollection();
    
    // We can't easily filter by multiple fields in Dexie without compound index, so we filter in JS
    // Or use where() on indexed fields. 
    // Let's fetch all and filter in JS for flexibility as volume is likely manageable.
    return collection.toArray();
  }) || [];

  const inventory = useLiveQuery(async () => {
      return db.inventory.toArray();
  }) || [];

  // Fetch Company Data & Logo
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

  const systemLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
  });

  // Filtering
  const filteredMovements = movements.filter(m => {
      if (selectedProject && m.projectId !== selectedProject) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      
      if (activeTab === 'ingresos') return m.type === 'Ingreso';
      if (activeTab === 'salidas') return m.type === 'Salida';
      return false;
  });

  const filteredInventory = inventory.filter(i => {
      if (selectedProject && i.projectId !== selectedProject) return false;
      return true;
  });

  const projectOptions = [
    { value: '', label: 'Todas las Obras' },
    ...projects.map(p => ({ value: p.id!.toString(), label: p.name }))
  ];

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    const title = activeTab === 'ingresos' ? 'Reporte de Ingresos de Almacén' :
                  activeTab === 'salidas' ? 'Reporte de Salidas de Almacén' :
                  'Reporte de Stock Actual';
    
    const project = projects.find(p => p.id?.toString() === selectedProject);
    const projectName = project ? project.name : 'Todas las Obras';
    const dateRange = activeTab !== 'stock' ? `${startDate} al ${endDate}` : new Date().toLocaleDateString();

    // Header Background
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

    // Title
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(title, systemLogo ? 50 : 14, 25);
    
    // Company Info
    if (companyData?.name) {
        doc.setFontSize(10);
        doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
        if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
        if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
    }

    // Reset Text Color for Body
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Project & Date Info
    doc.setFontSize(10);
    doc.text(`Obra: ${projectName}`, 14, 50);
    doc.text(`Fecha: ${dateRange}`, 14, 55);

    const startY = 60;

    if (activeTab === 'stock') {
        const tableData = filteredInventory.map(item => [
            item.name,
            item.category,
            `${item.quantity} ${item.unit}`,
            item.status,
            projects.find(p => p.id?.toString() === item.projectId)?.name || 'N/A'
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Ítem', 'Categoría', 'Cantidad', 'Estado', 'Obra']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });
    } else {
        const tableData = filteredMovements.map(m => [
            new Date(m.date + 'T12:00:00').toLocaleDateString(),
            m.itemName,
            `${m.quantity} ${m.unit}`,
            m.reference || '-',
            m.user || '-',
            projects.find(p => p.id?.toString() === m.projectId)?.name || 'N/A'
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Fecha', 'Ítem', 'Cantidad', activeTab === 'ingresos' ? 'Referencia' : 'Destino', 'Usuario', 'Obra']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });
    }

    doc.save(`reporte_${activeTab}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <button
                onClick={() => navigate('/warehouse')}
                className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
            >
                <ArrowLeft size={24} />
            </button>
            <h1 className={`text-2xl font-bold ${textColor}`}>Reportes de Almacén</h1>
        </div>
        <button 
          onClick={generatePDF}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
        >
          <FileText size={20} />
          Exportar PDF
        </button>
      </div>

      {/* Filters */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Obra</label>
                <SearchableSelect
                    options={projectOptions}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    className="w-full"
                    placeholder="Todas las Obras"
                />
            </div>
            {activeTab !== 'stock' && (
                <>
                    <div className="md:col-span-1">
                        <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full px-3 py-2 border ${inputBorder} rounded-lg outline-none ${inputBg} ${textColor}`}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full px-3 py-2 border ${inputBorder} rounded-lg outline-none ${inputBg} ${textColor}`}
                        />
                    </div>
                </>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ingresos'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ArrowDown size={16} />
          Reporte de Ingresos
        </button>
        <button
          onClick={() => setActiveTab('salidas')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'salidas'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ArrowUp size={16} />
          Reporte de Salidas
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'stock'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Package size={16} />
          Stock Actual
        </button>
      </div>

      {/* Content */}
      <div className={`${cardBg} rounded-lg shadow-sm border ${borderColor} overflow-hidden`}>
        <div className="overflow-x-auto">
            {activeTab === 'stock' ? (
                <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={tableHeaderBg}>
                        <tr>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Ítem</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Categoría</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Cantidad</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Obra</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {filteredInventory.length > 0 ? (
                            filteredInventory.map((item) => {
                                const pName = projects.find(p => p.id?.toString() === item.projectId)?.name || 'N/A';
                                return (
                                <tr key={item.id} className={hoverRowBg}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${textColor}`}>{item.name}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{item.category}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textColor}`}>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            item.quantity <= (item.minStock || 10) ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {item.quantity} {item.unit}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{item.status}</td>
                                    <td className={`px-6 py-4 text-sm ${subTextColor} min-w-[200px] max-w-xs`}>
                                        <div className="line-clamp-3 break-words text-justify">
                                            {toSentenceCase(pName)}
                                        </div>
                                        {pName.length > 80 && (
                                            <button
                                                onClick={() => setViewMoreName(pName)}
                                                className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 block focus:outline-none font-semibold"
                                            >
                                                Ver más
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className={`px-6 py-8 text-center ${subTextColor}`}>
                                    No hay ítems en inventario
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            ) : (
                <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={tableHeaderBg}>
                        <tr>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Fecha</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Ítem</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Cantidad</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>
                                {activeTab === 'ingresos' ? 'Referencia' : 'Destino'}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Usuario</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Obra</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {filteredMovements.length > 0 ? (
                            filteredMovements.map((move) => {
                                const pName = projects.find(p => p.id?.toString() === move.projectId)?.name || 'N/A';
                                return (
                                <tr key={move.id} className={hoverRowBg}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                                        {new Date(move.date + 'T12:00:00').toLocaleDateString()}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${textColor}`}>{move.itemName}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${textColor}`}>
                                        <span className={`font-bold ${activeTab === 'ingresos' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {activeTab === 'salidas' ? '-' : '+'}{move.quantity} {move.unit}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                                        {move.reference || '-'}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                                        {move.user || '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-sm ${subTextColor} min-w-[200px] max-w-xs`}>
                                        <div className="line-clamp-3 break-words text-justify">
                                            {toSentenceCase(pName)}
                                        </div>
                                        {pName.length > 80 && (
                                            <button
                                                onClick={() => setViewMoreName(pName)}
                                                className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 block focus:outline-none font-semibold"
                                            >
                                                Ver más
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className={`px-6 py-8 text-center ${subTextColor}`}>
                                    No hay movimientos registrados en este período
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {viewMoreName && (
        <Modal
          isOpen={!!viewMoreName}
          onClose={() => setViewMoreName(null)}
          title="Nombre de Obra"
        >
          <div className="p-1">
            <p className={`text-base text-justify ${textColor} break-words leading-relaxed`}>
              {toSentenceCase(viewMoreName)}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseReports;
