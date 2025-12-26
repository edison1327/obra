import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';

const Payrolls = () => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const [deletePayrollId, setDeletePayrollId] = useState<number | null>(null);
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  
  // Payrolls Data
  const payrolls = useLiveQuery(async () => {
    let allPayrolls;
    if (user?.projectId) {
       allPayrolls = await db.payrolls.where('projectId').equals(user.projectId).toArray();
    } else {
       allPayrolls = await db.payrolls.toArray();
    }
    return allPayrolls;
  }, [user?.projectId]) || [];

  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const getProjectName = (id: string) => projects.find(p => p.id?.toString() === id)?.name || 'Desconocido';

  const handleDeletePayroll = async () => {
    if (deletePayrollId) {
      try {
        await db.payrolls.delete(deletePayrollId);
        await SyncService.pushToRemote(false);
        toast.success('Planilla eliminada correctamente');
        setDeletePayrollId(null);
      } catch (error) {
        console.error('Error deleting payroll:', error);
        toast.error('Error al eliminar la planilla');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Planillas</h1>
      </div>

      <div className="space-y-6">
          {hasPermission('payrolls.create') && (
            <div className="flex justify-end">
              <button 
                onClick={() => navigate('/payrolls/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Nueva Planilla
              </button>
            </div>
          )}

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
                      {hasPermission('payrolls.edit') && (
                        <button 
                          onClick={() => navigate(`/payrolls/edit/${payroll.id}`)} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {hasPermission('payrolls.delete') && (
                        <button 
                          onClick={() => setDeletePayrollId(payroll.id!)} 
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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

      <ConfirmModal
        isOpen={!!deletePayrollId}
        onClose={() => setDeletePayrollId(null)}
        onConfirm={handleDeletePayroll}
        title="Eliminar Planilla"
        message="¿Está seguro de eliminar esta planilla? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default Payrolls;