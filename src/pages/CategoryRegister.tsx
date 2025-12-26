import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const CategoryRegister = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { id } = useParams();
  const [type, setType] = useState<'income' | 'expense' | 'warehouse'>('income');
  const [classification, setClassification] = useState('Ingreso');
  const [name, setName] = useState('');

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';

  useEffect(() => {
    if (id) {
      db.categories.get(Number(id)).then((cat) => {
        if (cat) {
          setType(cat.type);
          setClassification(cat.classification);
          setName(cat.name);
        }
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    // Safeguard: ensure classification matches type if empty
    let finalClassification = classification;
    if (!finalClassification) {
      if (type === 'income') finalClassification = 'Ingreso';
      else if (type === 'expense') finalClassification = 'Gasto';
      else if (type === 'warehouse') finalClassification = 'Almacen';
      setClassification(finalClassification);
    }

    if (!finalClassification) {
      toast.error('Error: Sub categoría no definida. Seleccione un tipo nuevamente.');
      return;
    }

    try {
      if (id) {
        await db.categories.update(Number(id), {
          name,
          type,
          classification: finalClassification
        });
        toast.success('Categoría actualizada correctamente');
      } else {
        await db.categories.add({
          name,
          type,
          classification: finalClassification
        });
        toast.success('Categoría guardada correctamente');
      }
      navigate('/categories');
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>{id ? 'Editar Categoría' : 'Nueva Categoría'}</h1>
        <button 
          onClick={() => navigate('/categories')}
          className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Type Selection */}
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>Tipo de Categoría</label>
            <div className={`flex rounded-lg border ${inputBorder} overflow-hidden`}>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setClassification('Ingreso');
                }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : `${cardBg} ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-700`
                }`}
              >
                Ingreso
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-600"></div>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setClassification('Gasto');
                }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : `${cardBg} ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-700`
                }`}
              >
                Gasto
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-600"></div>
              <button
                type="button"
                onClick={() => {
                  setType('warehouse');
                  setClassification('Almacen');
                }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'warehouse' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : `${cardBg} ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-700`
                }`}
              >
                Almacén
              </button>
            </div>
          </div>

          {/* Classification (The "campos" requested) */}
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              Sub Categoría <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={classification}
              readOnly
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-100'} ${inputText} opacity-75 cursor-not-allowed outline-none`}
            />
          </div>

          {/* Name */}
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              Nombre de la Categoría <span className="text-red-500">*</span>
            </label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
              placeholder="Ej. Cemento, Mano de Obra Civil..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Categoría
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CategoryRegister;
