import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { FileText, Printer, TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Reports = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const projects = useLiveQuery(() => db.projects.toArray()) || [];

  const transactions = useLiveQuery(async () => {
    const all = await db.transactions.toArray();
    return all.filter(t => {
       if (selectedProject && t.projectId !== selectedProject) return false;
       if (startDate && t.date < startDate) return false;
       if (endDate && t.date > endDate) return false;
       return true;
    });
  }, [selectedProject, startDate, endDate]) || [];

  const income = transactions.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'Gasto').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const rentability = income > 0 ? ((balance / income) * 100).toFixed(1) : '0.0';

  const format = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor}`}>Panel de Informes</h1>

      {/* Filters */}
      <div className={`${cardBg} p-6 rounded-lg shadow-sm transition-colors duration-200`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-1">
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre de Obra</label>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white' : 'text-gray-900'} transition-colors duration-200`}
            >
              <option value="">Todas las obras</option>
              {projects.map(p => (
                <option key={p.id} value={p.id?.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>De</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white' : 'text-gray-900'} transition-colors duration-200`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white' : 'text-gray-900'} transition-colors duration-200`}
            />
          </div>

          <div>
            <button 
              onClick={() => { /* Filters apply automatically via state, button can be refresh or removed */ }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'} transition-colors duration-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <p className={`text-sm ${subTextColor} font-medium`}>Ingresos Totales</p>
          </div>
          <h3 className={`text-2xl font-bold ${textColor}`}>{format(income)}</h3>
        </div>

        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'} transition-colors duration-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <TrendingDown size={20} />
            </div>
            <p className={`text-sm ${subTextColor} font-medium`}>Gastos Totales</p>
          </div>
          <h3 className={`text-2xl font-bold ${textColor}`}>{format(expense)}</h3>
        </div>

        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'} transition-colors duration-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Wallet size={20} />
            </div>
            <p className={`text-sm ${subTextColor} font-medium`}>Balance</p>
          </div>
          <h3 className={`text-2xl font-bold ${balance >= 0 ? textColor : 'text-red-600 dark:text-red-400'}`}>{format(balance)}</h3>
        </div>

        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'} transition-colors duration-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Percent size={20} />
            </div>
            <p className={`text-sm ${subTextColor} font-medium`}>Rentabilidad</p>
          </div>
          <h3 className={`text-2xl font-bold ${textColor}`}>{rentability}%</h3>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button className={`flex items-center justify-center gap-2 px-6 py-3 ${cardBg} border ${borderColor} rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <FileText size={20} />
          Exportar CSV
        </button>
        <button className={`flex items-center justify-center gap-2 px-6 py-3 ${cardBg} border ${borderColor} rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <Printer size={20} />
          Imprimir PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
