import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Worker } from '../db/db';
import { Plus, FileText, Edit, Trash2, HardHat } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

const Payrolls = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'payrolls' | 'workers'>('payrolls');
  const [deletePayrollId, setDeletePayrollId] = useState<number | null>(null);
  const [deleteWorkerId, setDeleteWorkerId] = useState<number | null>(null);
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const tabBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
  const tabActiveBg = isDark ? 'bg-gray-600' : 'bg-white';
  const tabInactiveText = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700';
  const tableHeaderBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const tableRowHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const tableText = isDark ? 'text-white' : 'text-gray-900';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  
  // Payrolls Data
  const payrolls = useLiveQuery(async () => {
    const allPayrolls = await db.payrolls.toArray();
    // Enrich with project names if needed, for now just raw data
    // We need to fetch project names for display
    
    // This is async inside, might be tricky in useLiveQuery directly if complex.
    // Simpler: fetch projects map.
    return allPayrolls;
  }) || [];

  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const getProjectName = (id: string) => projects.find(p => p.id?.toString() === id)?.name || 'Desconocido';

  // Workers Data
  const workers = useLiveQuery(() => db.workers.toArray()) || [];

  // Worker Modal State
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerForm, setWorkerForm] = useState<Partial<Worker>>({
    name: '',
    role: '',
    dailyRate: 0,
    status: 'Activo'
  });

  const handleDeletePayroll = async () => {
    if (deletePayrollId) {
      try {
        await db.payrolls.delete(deletePayrollId);
        toast.success('Planilla eliminada correctamente');
        setDeletePayrollId(null);
      } catch (error) {
        console.error('Error deleting payroll:', error);
        toast.error('Error al eliminar la planilla');
      }
    }
  };

  const handleDeleteWorker = async () => {
    if (deleteWorkerId) {
      try {
        await db.workers.delete(deleteWorkerId);
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
    setWorkerForm(worker);
    setIsWorkerModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWorker && editingWorker.id) {
        await db.workers.update(editingWorker.id, workerForm);
      } else {
        await db.workers.add(workerForm as Worker);
      }
      setIsWorkerModalOpen(false);
      setEditingWorker(null);
      setWorkerForm({ name: '', role: '', dailyRate: 0, status: 'Activo' });
      toast.success('Trabajador guardado correctamente');
    } catch (error) {
      console.error('Error saving worker:', error);
      toast.error('Error al guardar el trabajador');
    }
  };

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Planillas y Personal</h1>
        <div className={`flex gap-2 p-1 rounded-lg ${tabBg}`}>
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`px-4 py-2 rounded-md transition ${activeTab === 'payrolls' ? `${tabActiveBg} shadow text-blue-600 dark:text-blue-400 font-medium` : `${tabInactiveText}`}`}
          >
            Planillas
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`px-4 py-2 rounded-md transition ${activeTab === 'workers' ? `${tabActiveBg} shadow text-blue-600 dark:text-blue-400 font-medium` : `${tabInactiveText}`}`}
          >
            Personal
          </button>
        </div>
      </div>

      {activeTab === 'payrolls' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => navigate('/payrolls/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nueva Planilla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payrolls.length === 0 ? (
              <div className={`col-span-full text-center py-10 ${subTextColor}`}>
                No hay planillas registradas.
              </div>
            ) : (
              payrolls.map((payroll) => (
                <div key={payroll.id} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition border border-transparent hover:border-blue-200 dark:hover:border-blue-500 group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <FileText size={24} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit payroll not fully implemented yet, just redirect to new for now or a generic edit */}
                      <button 
                        onClick={() => navigate(`/payrolls/edit/${payroll.id}`)} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletePayrollId(payroll.id!)} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className={`text-lg font-bold ${textColor}`}>{getProjectName(payroll.projectId)}</h3>
                    <p className={`text-sm ${subTextColor}`}>
                      {new Date(payroll.startDate).toLocaleDateString()} - {new Date(payroll.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl font-bold ${textColor}`}>{formatCurrency(payroll.totalAmount)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      payroll.status === 'Pagado' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                      payroll.status === 'Borrador' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {payroll.status}
                    </span>
                  </div>
                  
                  <div className={`mt-2 text-sm ${subTextColor}`}>
                    {payroll.details?.length || 0} Trabajadores
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'workers' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setEditingWorker(null);
                setWorkerForm({ name: '', role: '', dailyRate: 0, status: 'Activo' });
                setIsWorkerModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nuevo Trabajador
            </button>
          </div>

          <div className={`${cardBg} rounded-lg shadow overflow-hidden`}>
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
                {workers.map((worker) => (
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
                      <button 
                        onClick={() => handleEditWorker(worker)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => setDeleteWorkerId(worker.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Worker Modal */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-lg shadow-xl w-full max-w-md p-6`}>
            <h2 className={`text-xl font-bold mb-4 ${textColor}`}>{editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${subTextColor}`}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={workerForm.name}
                  onChange={e => setWorkerForm({...workerForm, name: e.target.value})}
                  className={`mt-1 block w-full rounded-md ${inputBorder} shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${inputBg} ${inputText}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${subTextColor}`}>Cargo / Rol</label>
                <select
                  required
                  value={workerForm.role}
                  onChange={e => setWorkerForm({...workerForm, role: e.target.value})}
                  className={`mt-1 block w-full rounded-md ${inputBorder} shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${inputBg} ${inputText}`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Peon">Peon</option>
                  <option value="Oficial">Oficial</option>
                  <option value="Operario">Operario</option>
                  <option value="Maestro">Maestro</option>
                  <option value="Capataz">Capataz</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${subTextColor}`}>Jornal Diario (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={workerForm.dailyRate}
                  onChange={e => setWorkerForm({...workerForm, dailyRate: parseFloat(e.target.value)})}
                  className={`mt-1 block w-full rounded-md ${inputBorder} shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${inputBg} ${inputText}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${subTextColor}`}>Estado</label>
                <select
                  value={workerForm.status}
                  onChange={e => setWorkerForm({...workerForm, status: e.target.value as any})}
                  className={`mt-1 block w-full rounded-md ${inputBorder} shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${inputBg} ${inputText}`}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className={`px-4 py-2 border ${inputBorder} rounded-md ${subTextColor} hover:${tableHeaderBg}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletePayrollId}
        onClose={() => setDeletePayrollId(null)}
        onConfirm={handleDeletePayroll}
        title="Eliminar Planilla"
        message="¿Está seguro de eliminar esta planilla? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
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

export default Payrolls;