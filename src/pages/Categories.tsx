import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const Categories = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const cardHoverBorder = isDark ? 'group-hover:border-blue-500' : 'group-hover:border-blue-200';
  
  const categories = useLiveQuery(async () => {
    const cats = await db.categories.toArray();
    const trans = await db.transactions.toArray();
    
    return cats.map(c => {
      const count = trans.filter(t => t.category === c.name).length;
      return { ...c, count };
    });
  }) || [];

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await db.categories.delete(deleteId);
        toast.success('Categoría eliminada correctamente');
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Error al eliminar la categoría');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Panel de Categorías</h1>
        <button 
          onClick={() => navigate('/categories/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.length === 0 ? (
           <div className={`col-span-full text-center py-10 ${subTextColor}`}>
             No hay categorías registradas.
           </div>
        ) : (
          categories.map((cat, index) => (
            <div key={index} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition border border-transparent ${cardHoverBorder} group`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${
                  cat.type === 'income' 
                    ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                    : (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600')
                }`}>
                  <Tag size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => navigate(`/categories/edit/${cat.id}`)} 
                    className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(cat.id!)} 
                    className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className={`text-lg font-bold ${textColor} mb-1`}>{cat.name}</h3>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${subTextColor} capitalize`}>{cat.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-400'}`}>{cat.count} items</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Categoría"
        message="¿Está seguro de eliminar esta categoría? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default Categories;
