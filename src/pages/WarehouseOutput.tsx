import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const WarehouseOutput = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  
  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  
  // Fetch projects
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  
  // State
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiver, setReceiver] = useState('');
  const [reason, setReason] = useState('');
  const [withReturn, setWithReturn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. If withReturn is true, create a return record
      if (withReturn) {
        await db.returns.add({
          projectId,
          name,
          receiver,
          dateOut: date,
          quantity: Number(quantity),
          unit,
          status: 'Pending'
        });
      }

      // 2. Try to update inventory stock (Simple name match for now)
      const item = await db.inventory.where({ projectId, name }).first();
      if (item) {
        const newQuantity = item.quantity - Number(quantity);
        await db.inventory.update(item.id!, { quantity: newQuantity });
      }

      toast.success('Salida registrada correctamente');
      navigate('/warehouse');
    } catch (error) {
      console.error('Error registering output:', error);
      toast.error('Hubo un error al registrar la salida');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          Registrar Salida de Almacén
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
                  <option key={project.id} value={project.id?.toString()}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Nombre del Artículo (Searchable ideally, but simple input for now) */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre del Artículo <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="Buscar artículo..."
              />
            </div>

            {/* Fecha de Salida */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Fecha de Salida <span className="text-red-500">*</span></label>
              <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Cantidad a Retirar <span className="text-red-500">*</span></label>
              <input 
                required
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="0"
              />
            </div>

            {/* Unidad */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Unidad <span className="text-red-500">*</span></label>
              <select
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              >
                <option value="">Seleccione unidad...</option>
                <option value="unidades">Unidades</option>
                <option value="bolsas">Bolsas</option>
                <option value="varillas">Varillas</option>
                <option value="m3">Metros Cúbicos (m3)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="lt">Litros (lt)</option>
                <option value="baldes">Baldes</option>
              </select>
            </div>

            {/* Responsable/Receptor */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Entregado a <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="Nombre del personal"
              />
            </div>

            {/* Motivo/Uso */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Motivo / Uso <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="Para qué se utilizará..."
              />
            </div>

            {/* Tipo de Salida (Con Retorno / Sin Retorno) */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-2`}>Tipo de Salida</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWithReturn(false)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-all ${
                    !withReturn 
                      ? (isDark ? 'border-red-500 bg-red-900/30 text-red-400' : 'border-red-600 bg-red-50 text-red-700') 
                      : `border-gray-200 ${subTextColor} hover:border-gray-300 ${isDark ? 'border-gray-600 hover:border-gray-500' : ''}`
                  }`}
                >
                  Sin Retorno
                </button>
                <button
                  type="button"
                  onClick={() => setWithReturn(true)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-all ${
                    withReturn 
                      ? (isDark ? 'border-blue-500 bg-blue-900/30 text-blue-400' : 'border-blue-600 bg-blue-50 text-blue-700')
                      : `border-gray-200 ${subTextColor} hover:border-gray-300 ${isDark ? 'border-gray-600 hover:border-gray-500' : ''}`
                  }`}
                >
                  Con Retorno
                </button>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="bg-red-600 dark:bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Registrar Salida
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default WarehouseOutput;
