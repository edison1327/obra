import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SyncService } from '../services/SyncService';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';
import Modal from '../components/Modal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Transactions = () => {
  const { hasPermission, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputText = isDark ? 'text-white' : 'text-gray-900';

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [viewMoreName, setViewMoreName] = useState<string | null>(null);

  const toSentenceCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Fetch projects
  const projects = useLiveQuery(async () => {
    if (user?.projectId) {
      const userProject = await db.projects.get(Number(user.projectId));
      return userProject ? [userProject] : [];
    }
    return db.projects.toArray();
  }, [user?.projectId]) || [];

  // Auto-select project if user has one assigned
  useEffect(() => {
    if (user?.projectId) {
      setProjectId(user.projectId.toString());
    }
  }, [user?.projectId]);

  const projectOptions = projects.map(p => ({ value: p.id!, label: p.name }));
  
  // Fetch categories
  const categoriesList = useLiveQuery(async () => {
    if (type === 'income') {
      return db.categories.where('type').equals('income').toArray();
    } else {
      return db.categories.where('type').equals('expense').toArray();
    }
  }, [type]) || [];

  const categoryOptions = categoriesList
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => ({ value: c.name, label: c.name }));
  
  // Fetch recent transactions
  const transactions = useLiveQuery(() => 
    db.transactions.orderBy('date').reverse().limit(10).toArray()
  ) || [];

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!projectId || !amount || !category) {
        toast.error('Por favor complete los campos obligatorios');
        return;
      }

      await db.transactions.add({
        projectId,
        type: type === 'income' ? 'Ingreso' : 'Gasto',
        category,
        amount: Number(amount),
        date,
        description
      });

      await SyncService.pushToRemote(false);

      toast.success('Transacción registrada correctamente');
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('');
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Error al registrar transacción');
    }
  };

  const getProjectName = (id: string) => {
    const p = projects.find(proj => proj.id === Number(id));
    return p ? p.name : 'Desconocido';
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor}`}>Registro de Ingreso y Gasto</h1>

      {/* Input Form */}
      {hasPermission('transactions.create') && (
        <div className={`${cardBg} p-6 rounded-lg shadow-sm`}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Seleccionar Obra <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                className="w-full"
                placeholder="Seleccione una obra..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Tipo</label>
              <div className={`flex rounded-lg border ${inputBorder} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : `${inputBg} ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-600`
                  }`}
                >
                  Ingreso
                </button>
                <div className={`w-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'expense' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : `${inputBg} ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-600`
                  }`}
                >
                  Gasto
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Categoría <span className="text-red-500">*</span></label>
              <SearchableSelect
                key={type}
                required
                options={categoryOptions}
                value={category}
                onChange={setCategory}
                className="w-full"
                placeholder="Seleccione categoría..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>
                Ingresar Monto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`${subTextColor}`}>S/</span>
                </div>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} no-spinner`}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Fecha <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
                placeholder="Descripción adicional..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className={`px-6 py-2 text-white rounded-lg transition font-medium flex items-center gap-2 ${
                type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Plus size={20} />
              {type === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
            </button>
          </div>
          </form>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className={`${cardBg} rounded-lg shadow-sm overflow-hidden transition-colors duration-200`}>
        <div className={`p-4 border-b ${borderColor}`}>
          <h3 className={`text-lg font-bold ${textColor}`}>Últimas Transacciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Fecha</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Obra</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Tipo</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Categoría</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Monto</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {transactions.map((t) => (
                <tr key={t.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{t.date}</td>
                  <td className={`px-6 py-4 text-[13px] font-bold text-justify ${isDark ? 'text-white' : 'text-gray-900'} break-words min-w-[200px] max-w-xs`}>
                    <div className="line-clamp-3">
                      {toSentenceCase(getProjectName(t.projectId))}
                    </div>
                    {getProjectName(t.projectId).length > 100 && (
                      <button
                        onClick={() => setViewMoreName(getProjectName(t.projectId))}
                        className="text-blue-500 hover:text-blue-700 text-xs font-normal focus:outline-none mt-1 hover:underline block"
                      >
                        Ver más
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      t.type === 'Ingreso' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{t.category}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    t.type === 'Ingreso' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {t.type === 'Ingreso' ? '+' : '-'} S/ {Number(t.amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-6 py-4 text-center ${subTextColor}`}>No hay transacciones registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewMoreName && (
        <Modal
          isOpen={!!viewMoreName}
          onClose={() => setViewMoreName(null)}
          title="Nombre de Obra"
        >
          <div className="p-1">
            <p className={`text-base text-justify ${isDark ? 'text-white' : 'text-gray-900'} break-words leading-relaxed`}>
              {toSentenceCase(viewMoreName)}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Transactions;