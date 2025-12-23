import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Minus, Package, Search, Filter, Calendar, RotateCcw, AlertTriangle, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

const Warehouse = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
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
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  
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
        toast.success('Artículo eliminado correctamente');
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Error al eliminar el artículo');
      }
    }
  };

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
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition ${
              showFilters 
                ? (isDark ? 'bg-blue-900/30 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700')
                : (isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
            }`}
          >
            <Filter size={20} />
            Filtros
          </button>
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

      {/* Filter Section */}
      <div className={`${cardBg} p-6 rounded-lg shadow-sm space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Select Project (Obra) */}
          <div className="lg:col-span-1">
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Obra</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${textColor}`}
            >
              <option value="">Todas las Obras</option>
              {projects.map(project => (
                <option key={project.id} value={project.id?.toString()}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Search by Name */}
          <div className="lg:col-span-1">
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
          <div className="lg:col-span-2">
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${textColor}`}>{item.quantity}</td>
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
                      <button 
                        onClick={() => navigate(`/warehouse/edit/${item.id}`)}
                        className={`mr-3 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => setDeleteId(item.id!)}
                        className={isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                      >
                        Eliminar
                      </button>
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
