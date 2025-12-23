import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';

const LoanRegister = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'dark:text-white'; // dark:text-white is standard for input text in dark mode if not explicitly set to black in light
  const iconColor = isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700';
  const buttonDefaultBg = isDark ? 'bg-gray-700' : 'bg-white';
  const buttonDefaultText = isDark ? 'text-gray-300' : 'text-gray-600';
  const buttonDefaultHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-50';
  const dividerColor = isDark ? 'bg-gray-600' : 'bg-gray-300';

  const [entity, setEntity] = useState('');
  const [type, setType] = useState<'Prestamo Otorgado' | 'Prestamo Recibido'>('Prestamo Recibido');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'Pendiente' | 'Pagado' | 'Vencido'>('Pendiente');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (id) {
      db.loans.get(Number(id)).then((loan) => {
        if (loan) {
          setEntity(loan.entity);
          setType(loan.type);
          setAmount(loan.amount.toString());
          setDate(loan.date);
          setDueDate(loan.dueDate || '');
          setStatus(loan.status);
          setDescription(loan.description || '');
        }
      });
    } else {
      // Default to today
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loanData = {
        entity,
        type,
        amount: parseFloat(amount) || 0,
        date,
        dueDate,
        status,
        description
      };

      if (id) {
        await db.loans.update(Number(id), loanData);
        toast.success('Préstamo actualizado correctamente');
      } else {
        await db.loans.add(loanData);
        toast.success('Préstamo guardado correctamente');
      }
      navigate('/loans');
    } catch (error) {
      console.error('Error saving loan:', error);
      toast.error('Error al guardar el préstamo');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>{id ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h1>
        <button 
          onClick={() => navigate('/loans')}
          className={`${iconColor}`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Type Selection */}
          <div>
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Tipo de Préstamo</label>
            <div className={`flex rounded-lg border ${inputBorder} overflow-hidden`}>
              <button
                type="button"
                onClick={() => setType('Prestamo Recibido')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'Prestamo Recibido' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : `${buttonDefaultBg} ${buttonDefaultText} ${buttonDefaultHover}`
                }`}
              >
                Préstamo Recibido (Ingreso)
              </button>
              <div className={`w-px ${dividerColor}`}></div>
              <button
                type="button"
                onClick={() => setType('Prestamo Otorgado')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'Prestamo Otorgado' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : `${buttonDefaultBg} ${buttonDefaultText} ${buttonDefaultHover}`
                }`}
              >
                Préstamo Otorgado (Salida)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>
                Entidad / Persona <span className="text-red-500">*</span>
              </label>
              <input 
                required
                type="text" 
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
                placeholder="Ej. Banco BCP, Juan Pérez..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>
                Monto <span className="text-red-500">*</span>
              </label>
              <input 
                required
                type="number" 
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>
                Fecha <span className="text-red-500">*</span>
              </label>
              <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`} 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Fecha de Vencimiento</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`} 
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Descripción / Notas</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none ${inputBg} ${inputText}`}
              placeholder="Detalles adicionales del préstamo..."
            ></textarea>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Préstamo
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LoanRegister;
