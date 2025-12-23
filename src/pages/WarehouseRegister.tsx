import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const WarehouseRegister = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { id } = useParams();

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  
  // Fetch projects for dropdown
  const projects = useLiveQuery(() => db.projects.toArray()) || [];

  // Fetch categories
  const categoriesList = useLiveQuery(() => db.categories.toArray()) || [];

  // State
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [status, setStatus] = useState('In Stock');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Load data if editing
  useEffect(() => {
    const loadItem = async () => {
      if (id) {
        const item = await db.inventory.get(Number(id));
        if (item) {
          setProjectId(item.projectId);
          setName(item.name);
          setCategory(item.category);
          setQuantity(item.quantity.toString());
          setUnit(item.unit);
          if (item.minStock !== undefined) setMinStock(item.minStock.toString());
          setStatus(item.status);
          setDate(item.date);
        }
      }
    };
    loadItem();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        projectId,
        name,
        category,
        quantity: Number(quantity),
        unit,
        minStock: Number(minStock),
        status,
        date
      };

      if (id) {
        await db.inventory.update(Number(id), itemData);
      } else {
        await db.inventory.add(itemData);
      }

      toast.success('Ingreso registrado correctamente');
      navigate('/warehouse');
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast.error('Error al registrar el ingreso');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {id ? 'Editar Ingreso' : 'Registrar Ingreso de Material'}
        </h1>
        <button 
          onClick={() => navigate('/warehouse')}
          className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6 md:p-8`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Obra */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Obra <span className="text-red-500">*</span></label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              >
                <option value="">Seleccione una obra...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id?.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre del Artículo <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="Ej. Cemento, Fierro, Pintura..."
              />
            </div>

            {/* Categoría */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Categoría <span className="text-red-500">*</span></label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              >
                <option value="">Seleccione categoría...</option>
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Cantidad y Unidad y Stock Mínimo */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Cantidad Inicial <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Unidad <span className="text-red-500">*</span></label>
                <select
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
                >
                  <option value="">Seleccione...</option>
                  <option value="unidades">Unidades</option>
                  <option value="bolsas">Bolsas</option>
                  <option value="m3">Metros Cúbicos (m3)</option>
                  <option value="m2">Metros Cuadrados (m2)</option>
                  <option value="ml">Metros Lineales (ml)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="litros">Litros</option>
                  <option value="galones">Galones</option>
                  <option value="cajas">Cajas</option>
                  <option value="varillas">Varillas</option>
                  <option value="millares">Millares</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Stock Mínimo (Alerta)</label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="10"
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                />
                <p className={`text-xs ${subTextColor} mt-1`}>Notificar si baja de esta cantidad</p>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Fecha de Ingreso <span className="text-red-500">*</span></label>
              <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/warehouse')}
              className={`px-6 py-2 border ${inputBorder} ${subTextColor} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Ingreso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehouseRegister;