import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

const WarehouseReturns = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  
  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const [searchTerm, setSearchTerm] = useState('');
  const [returnId, setReturnId] = useState<number | null>(null);
  
  // Fetch pending returns
  const pendingReturns = useLiveQuery(() => 
    db.returns
      .where('status')
      .equals('Pending')
      .toArray()
  ) || [];

  const handleReturn = async () => {
    if (returnId) {
      try {
        // 1. Mark as returned
        await db.returns.update(returnId, { status: 'Returned' });
        
        // 2. Return to inventory (Optional: find item and increment)
        // For simplicity, we just mark it as returned. In a full system, we'd add stock back.
        const returnItem = await db.returns.get(returnId);
        if (returnItem) {
           const inventoryItem = await db.inventory.where({ projectId: returnItem.projectId, name: returnItem.name }).first();
           if (inventoryItem) {
             await db.inventory.update(inventoryItem.id!, { quantity: inventoryItem.quantity + returnItem.quantity });
           }
        }

        toast.success('Devolución registrada correctamente');
        setReturnId(null);
      } catch (error) {
        console.error('Error processing return:', error);
        toast.error('Error al registrar devolución');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          Devoluciones Pendientes
        </h1>
        <button 
          onClick={() => navigate('/warehouse')}
          className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6`}>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre de artículo o responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
          />
        </div>

        <div className="space-y-4">
          {pendingReturns.length === 0 ? (
            <p className={`text-center ${subTextColor} py-8`}>No hay retornos pendientes</p>
          ) : (
            pendingReturns.map(item => (
              <div key={item.id} className={`border ${isDark ? 'border-gray-700' : 'border-gray-200'} rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-bold ${textColor} text-lg`}>{item.name}</h3>
                    <span className={`text-sm ${subTextColor}`}>{new Date(item.dateOut).toLocaleDateString('es-PE')}</span>
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm ${subTextColor}`}>
                    <p><span className="font-medium">Responsable:</span> {item.receiver}</p>
                    <p><span className="font-medium">Cantidad:</span> {item.quantity} {item.unit}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReturnId(item.id!)}
                  className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition font-medium whitespace-nowrap"
                >
                  Confirmar Retorno
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!returnId}
        onClose={() => setReturnId(null)}
        onConfirm={handleReturn}
        title="Confirmar Devolución"
        message="¿Confirmar la devolución de este artículo al inventario?"
        confirmText="Confirmar"
        variant="info"
      />
    </div>
  );
};

export default WarehouseReturns;
