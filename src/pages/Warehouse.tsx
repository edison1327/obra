import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Minus, Package, Search, Filter, Calendar, RotateCcw, AlertTriangle, Bell, X, FileText, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import SearchableSelect from '../components/SearchableSelect';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SyncService } from '../services/SyncService';

const Warehouse = () => {
  const { theme } = useTheme();
  const { hasPermission, user } = useAuth();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const tableHeaderBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const hoverRowBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const iconBg = isDark ? 'bg-blue-900/30' : 'bg-blue-100';
  const iconColor = isDark ? 'text-blue-400' : 'text-blue-600';

  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  
  const movements = useLiveQuery(() => db.inventoryMovements.toArray()) || [];

  const projects = useLiveQuery(async () => {
    if (user?.projectId) {
      const userProject = await db.projects.get(Number(user.projectId));
      return userProject ? [userProject] : [];
    }
    return db.projects.toArray();
  }, [user?.projectId]) || [];

  const projectOptions = [
    { value: '', label: 'Todas las Obras' },
    ...projects.map(p => ({ value: p.id!, label: p.name }))
  ];

  // Auto-select project if user has one assigned
  useEffect(() => {
    if (user?.projectId) {
      setSelectedProject(user.projectId.toString());
    }
  }, [user?.projectId]);
  
  const lowStockItems = inventory.filter(item => {
    const threshold = item.minStock !== undefined ? item.minStock : 10;
    return item.quantity <= threshold;
  });

  const filteredInventory = inventory.filter(item => {
    // 1. Filter by Project (Mandatory selection usually, but here we can show all if none selected or filter)
    // The user said "select obra and THEN filter", implying obra is a primary filter.
    if (selectedProject && item.projectId !== selectedProject) return false;

    // 2. Filter by Name (Search Term)
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    // 3. Filter by Dates
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;

    return true;
  });

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await db.inventory.delete(deleteId);
        await SyncService.pushToRemote(false);
        toast.success('Artículo eliminado correctamente');
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Error al eliminar el artículo');
      }
    }
  };

  // Calculate Summary Stats
  const today = new Date().toISOString().split('T')[0];
  
  const todayMovements = movements.filter(m => 
    m.date === today && 
    (!selectedProject || m.projectId === selectedProject)
  ).length;

  const totalItems = filteredInventory.length;
  const criticalStockItems = filteredInventory.filter(i => i.quantity <= (i.minStock || 10)).length;

  // Prepare chart data (Last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    
    const dayMovements = movements.filter(m => 
        m.date === dateStr && 
        (!selectedProject || m.projectId === selectedProject)
    );

    return {
        date: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        Ingresos: dayMovements.filter(m => m.type === 'Ingreso').length,
        Salidas: dayMovements.filter(m => m.type === 'Salida').length
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className={`text-2xl font-bold ${textColor}`}>Almacén</h1>
          <button 
            onClick={() => setShowLowStockModal(true)}
            className={`relative p-2 transition-colors ${
              lowStockItems.length > 0 
                ? (isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700')
                : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <Bell size={24} className={lowStockItems.length > 0 ? 'animate-bell-ring' : ''} />
            {lowStockItems.length > 0 && (
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white ring-2 ring-white dark:ring-gray-900">
                {lowStockItems.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setShowChart(!showChart)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition ${
              showChart 
                ? (isDark ? 'bg-purple-900/30 border-purple-800 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700')
                : (isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
            }`}
          >
            <BarChart2 size={20} />
            <span className="hidden md:inline">Gráfico</span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition ${
              showFilters 
                ? (isDark ? 'bg-blue-900/30 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700')
                : (isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
            }`}
          >
            <Filter size={20} />
            <span className="hidden md:inline">Filtros</span>
          </button>
          {hasPermission('inventory.create') && (
            <>
              <button 
                onClick={() => navigate('/warehouse/new')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
              >
                <Plus size={20} />
                Registrar Ingreso
              </button>
              <button 
                onClick={() => navigate('/warehouse/output')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
              >
                <Minus size={20} />
                Registrar Salida
              </button>
              <button 
                onClick={() => navigate('/warehouse/returns')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <RotateCcw size={20} />
                Ver Retorno
              </button>
              <button 
                onClick={() => navigate('/warehouse/reports')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition"
              >
                <FileText size={20} />
                Reportes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} flex items-center justify-between`}>
          <div>
            <p className={`text-sm font-medium ${subTextColor}`}>Total Ítems</p>
            <p className={`text-2xl font-bold ${textColor}`}>{totalItems}</p>
          </div>
          <div className={`p-3 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            <Package size={24} />
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} flex items-center justify-between`}>
          <div>
            <p className={`text-sm font-medium ${subTextColor}`}>Stock Crítico</p>
            <p className={`text-2xl font-bold ${criticalStockItems > 0 ? 'text-red-500' : textColor}`}>{criticalStockItems}</p>
          </div>
          <div className={`p-3 rounded-full ${criticalStockItems > 0 ? (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600') : (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')}`}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} flex items-center justify-between`}>
          <div>
            <p className={`text-sm font-medium ${subTextColor}`}>Movimientos Hoy</p>
            <p className={`text-2xl font-bold ${textColor}`}>{todayMovements}</p>
          </div>
          <div className={`p-3 rounded-full ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
            <RotateCcw size={24} />
          </div>
        </div>
      </div>

      {/* Low Stock Notification Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardBg} rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border ${borderColor}`}>
            <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
              <div className={`flex items-center gap-2 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`}>
                <AlertTriangle size={24} />
                <h2 className={`text-xl font-bold ${textColor}`}>Alertas de Stock Bajo</h2>
              </div>
              <button 
                onClick={() => setShowLowStockModal(false)}
                className={`${subTextColor} hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {lowStockItems.length > 0 ? (
                <div className="space-y-4">
                  <p className={subTextColor}>
                    Los siguientes {lowStockItems.length} ítems tienen stock crítico y requieren atención:
                  </p>
                  <div className={`${cardBg} border ${borderColor} rounded-lg overflow-hidden`}>
                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      <thead className={tableHeaderBg}>
                        <tr>
                          <th className={`px-4 py-2 text-left text-xs font-medium ${subTextColor} uppercase`}>Item</th>
                          <th className={`px-4 py-2 text-left text-xs font-medium ${subTextColor} uppercase`}>Cantidad</th>
                          <th className={`px-4 py-2 text-left text-xs font-medium ${subTextColor} uppercase`}>Mínimo</th>
                          <th className={`px-4 py-2 text-left text-xs font-medium ${subTextColor} uppercase`}>Obra</th>
                          <th className={`px-4 py-2 text-right text-xs font-medium ${subTextColor} uppercase`}>Acción</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {lowStockItems.map(item => (
                          <tr key={item.id} className={hoverRowBg}>
                            <td className="px-4 py-3">
                              <div className={`font-medium ${textColor}`}>{item.name}</div>
                              <div className={`text-xs ${subTextColor}`}>{item.category}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'}`}>
                                {item.quantity} {item.unit}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm ${subTextColor}`}>
                              {item.minStock !== undefined ? item.minStock : 10}
                            </td>
                            <td className={`px-4 py-3 text-sm ${subTextColor}`}>
                              {projects.find(p => p.id?.toString() === item.projectId)?.name || 'Sin obra'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => {
                                  setShowLowStockModal(false);
                                  navigate('/warehouse/new');
                                }}
                                className={`text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                              >
                                Reabastecer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'} mb-4`}>
                    <Package className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <h3 className={`text-lg font-medium ${textColor}`}>Todo en orden</h3>
                  <p className={`mt-2 ${subTextColor}`}>No hay ítems con stock bajo en este momento.</p>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${borderColor} ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-b-lg flex justify-end`}>
              <button
                onClick={() => setShowLowStockModal(false)}
                className={`px-4 py-2 ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} rounded-lg transition-colors font-medium`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      {showChart && (
        <div className={`${cardBg} p-4 rounded-lg shadow-sm border ${borderColor} h-80 animate-in fade-in slide-in-from-top-4 duration-300`}>
          <h3 className={`text-lg font-bold mb-4 ${textColor}`}>Movimientos (Últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#9ca3af' : '#4b5563'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#4b5563'} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} 
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10B981" name="Ingresos" />
              <Bar dataKey="Salidas" fill="#EF4444" name="Salidas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter Section */}
      <div className={`${cardBg} p-6 rounded-lg shadow-sm space-y-4 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Select Project (Obra) */}
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

          {/* 2. Search by Name */}
          <div className="md:col-span-1">
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Buscar Item</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre del material..."
                className={`w-full pl-10 pr-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${textColor} ${isDark ? 'placeholder-gray-400' : ''}`}
              />
            </div>
          </div>

          {/* 3. Filter by Dates */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Rango de Fechas</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${textColor}`}
                />
              </div>
              <span className={`self-center ${subTextColor}`}>-</span>
              <div className="relative flex-1">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${textColor}`}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Inventory List */}
      <div className={`${cardBg} rounded-lg shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={tableHeaderBg}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Fecha</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Item</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Categoría</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Cantidad</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Unidad</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <tr key={item.id} className={hoverRowBg}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                      {new Date(item.date).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
                          <Package size={20} />
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${textColor}`}>{item.name}</div>
                          <div className={`text-sm ${subTextColor}`}>ID: #{item.id!.toString().padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${textColor}`}>{item.quantity}</span>
                        {/* Simple progress bar for stock level relative to minStock * 3 (arbitrary max visual) */}
                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.quantity <= (item.minStock || 10) 
                                ? 'bg-red-500' 
                                : item.quantity <= (item.minStock || 10) * 2 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((item.quantity / ((item.minStock || 10) * 3)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'In Stock' 
                          ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800')
                          : (isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasPermission('inventory.edit') && (
                        <button 
                          onClick={() => navigate(`/warehouse/edit/${item.id}`)}
                          className={`mr-3 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                        >
                          Editar
                        </button>
                      )}
                      {hasPermission('inventory.delete') && (
                        <button 
                          onClick={() => setDeleteId(item.id!)}
                          className={isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${subTextColor}`}>
                    No se encontraron artículos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Artículo"
        message="¿Está seguro que desea eliminar este artículo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default Warehouse;
