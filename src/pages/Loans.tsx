import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Banknote, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

const Loans = () => {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const amountColor = isDark ? 'text-white' : 'text-gray-900';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-100';

  const loans = useLiveQuery(() => db.loans.toArray()) || [];

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await db.loans.delete(deleteId);
        toast.success('Préstamo eliminado correctamente');
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting loan:', error);
        toast.error('Error al eliminar el préstamo');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Préstamos</h1>
        <button 
          onClick={() => navigate('/loans/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuevo Préstamo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.length === 0 ? (
           <div className={`col-span-full text-center py-10 ${subTextColor}`}>
             No hay préstamos registrados.
           </div>
        ) : (
          loans.map((loan, index) => (
            <div key={index} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition border border-transparent hover:border-blue-200 dark:hover:border-blue-500 group`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${loan.type === 'Prestamo Recibido' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                  <Banknote size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => navigate(`/loans/edit/${loan.id}`)} 
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(loan.id!)} 
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mb-3">
                <h3 className={`text-lg font-bold ${textColor}`}>{loan.entity}</h3>
                <p className={`text-sm ${subTextColor}`}>{loan.type}</p>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${amountColor}`}>{formatCurrency(loan.amount)}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  loan.status === 'Pagado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                  loan.status === 'Vencido' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {loan.status}
                </span>
              </div>

              <div className={`text-sm ${subTextColor} mt-2 pt-2 border-t ${borderColor}`}>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{new Date(loan.date).toLocaleDateString()}</span>
                </div>
                {loan.dueDate && (
                  <div className="flex justify-between mt-1">
                    <span>Vencimiento:</span>
                    <span>{new Date(loan.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Préstamo"
        message="¿Está seguro de eliminar este préstamo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default Loans;
