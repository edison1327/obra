import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Worker } from '../db/db';
import { SyncService } from '../services/SyncService';
import { Plus, HardHat, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import WorkerModal from '../components/WorkerModal';

const Workers = () => {
  const { hasPermission } = useAuth();
  const { theme } = useTheme();
  
  const [deleteWorkerId, setDeleteWorkerId] = useState<number | null>(null);
  
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const tableHeaderBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const tableRowHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const tableText = isDark ? 'text-white' : 'text-gray-900';

  // Workers Data
  const workers = useLiveQuery(() => db.workers.toArray()) || [];

  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.documentNumber && worker.documentNumber.includes(searchTerm)) ||
    (worker.role && worker.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Worker Modal State
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  const handleDeleteWorker = async () => {
    if (deleteWorkerId) {
      try {
        await db.workers.delete(deleteWorkerId);
        await SyncService.pushToRemote(false);
        toast.success('Trabajador eliminado correctamente');
        setDeleteWorkerId(null);
      } catch (error) {
        console.error('Error deleting worker:', error);
        toast.error('Error al eliminar el trabajador');
      }
    }
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setIsWorkerModalOpen(true);
  };

  const handleWorkerSuccess = () => {
    setIsWorkerModalOpen(false);
    setEditingWorker(null);
  };

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Gestión de Personal</h1>
        <div className="flex justify-end">
          {hasPermission('workers.create') && (
            <button 
              onClick={() => {
                setEditingWorker(null);
                setIsWorkerModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nuevo Trabajador
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      </div>

      <div className={`${cardBg} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
            <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700`}>
              <thead className={`${tableHeaderBg}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Nombre</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Rol</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Jornal Diario</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Acciones</th>
                </tr>
              </thead>
              <tbody className={`${cardBg} divide-y divide-gray-200 dark:divide-gray-700`}>
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className={`${tableRowHover}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300">
                          <HardHat size={20} />
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${tableText}`}>{worker.name}</div>
                          <div className={`text-sm ${subTextColor}`}>{worker.documentNumber || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{worker.role}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${tableText}`}>{formatCurrency(worker.dailyRate || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        worker.status === 'Activo' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {hasPermission('workers.edit') && (
                          <button 
                            onClick={() => handleEditWorker(worker)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {hasPermission('workers.delete') && (
                          <button 
                            onClick={() => setDeleteWorkerId(worker.id!)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
        </div>
      </div>

      {/* Worker Modal */}
      <WorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => {
          setIsWorkerModalOpen(false);
          setEditingWorker(null);
        }}
        onSuccess={handleWorkerSuccess}
        workerToEdit={editingWorker}
      />

      <ConfirmModal
        isOpen={!!deleteWorkerId}
        onClose={() => setDeleteWorkerId(null)}
        onConfirm={handleDeleteWorker}
        title="Eliminar Trabajador"
        message="¿Está seguro de eliminar este trabajador? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default Workers;
