import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, LayoutList, X } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';

  const [viewMoreProject, setViewMoreProject] = useState<{name: string, id: number} | null>(null);

  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const axisColor = isDark ? '#9CA3AF' : '#6B7280';
  const tooltipBg = isDark ? '#1F2937' : '#FFFFFF';
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB';
  const tooltipText = isDark ? '#F3F4F6' : '#111827';

  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [chartFilterProjectId, setChartFilterProjectId] = useState<string>('all');
  
  // Calculate total budget
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  
  // Fetch transactions for dynamic stats
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  
  const activeProjects = projects.filter(p => p.status === 'En Ejecución' || p.status === 'En Planificación' || p.status === 'Atrasado');

  const projectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todas las obras' },
      ...projects.map(p => ({ value: p.id!, label: p.name }))
    ];
  }, [projects]);

  const filteredTransactions = useMemo(() => {
    if (chartFilterProjectId === 'all') return transactions;
    return transactions.filter(t => t.projectId.toString() === chartFilterProjectId);
  }, [transactions, chartFilterProjectId]);

  const filteredProjectsForStats = useMemo(() => {
    if (chartFilterProjectId === 'all') return projects;
    return projects.filter(p => p.id?.toString() === chartFilterProjectId);
  }, [projects, chartFilterProjectId]);

  // Calculate total budget based on filter
  const totalBudget = filteredProjectsForStats.reduce((acc, p) => acc + (p.value || 0), 0);

  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Ingreso') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // Data for PieChart (Expenses by Category)
  const dataExpenses = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'Gasto')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
    
    return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Data for PieChart (Income by Category)
  const dataIncome = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'Ingreso')
      .forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      });
    
    return Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Data for BarChart (Income vs Expense by Month) - Last 6 months
  const dataIncomeVsExpense = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d;
    });

    return last6Months.map(date => {
      const monthStr = date.toLocaleString('es-ES', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();

      const monthlyTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      });

      const income = monthlyTransactions
        .filter(t => t.type === 'Ingreso')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthlyTransactions
        .filter(t => t.type === 'Gasto')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
        Ingreso: income,
        Gasto: expense
      };
    });
  }, [filteredTransactions]);
  
  const cards = [
    { title: 'Proyectos Activos', value: filteredProjectsForStats.length.toString(), icon: LayoutList, color: 'bg-blue-500' },
    { title: 'Valor Total Obras', value: `S/ ${totalBudget.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Gastos Totales', value: `S/ ${stats.expense.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-500' },
    { title: 'Saldo Total', value: `S/ ${(stats.income - stats.expense).toLocaleString()}`, icon: Wallet, color: 'bg-indigo-500' },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En Ejecución': return 'text-green-600';
      case 'En Planificación': return 'text-yellow-600';
      case 'Finalizado': return 'text-red-600';
      case 'Atrasado': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 capitalize">{currentDate}</p>
        </div>
        <SearchableSelect
          options={projectOptions}
          value={chartFilterProjectId}
          onChange={setChartFilterProjectId}
          className="w-full md:w-64"
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`${cardBg} p-6 rounded-xl shadow-sm flex items-center gap-4 transition-colors duration-200`}>
              <div className={`${card.color} p-4 rounded-lg text-white`}>
                <Icon size={24} />
              </div>
              <div>
                <p className={`text-sm ${subTextColor} font-medium`}>{card.title}</p>
                <h3 className={`text-xl font-bold ${textColor}`}>{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {viewMoreProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-lg p-6 max-w-lg w-full relative shadow-xl`}>
            <button
              onClick={() => setViewMoreProject(null)}
              className={`absolute top-4 right-4 text-gray-400 ${isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
            >
              <X size={24} />
            </button>
            <h3 className={`text-lg font-bold ${textColor} mb-4 pr-8`}>Nombre Completo de la Obra</h3>
            <div className={`max-h-[60vh] overflow-y-auto text-justify ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
              {viewMoreProject.name}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewMoreProject(null)}
                className={`bg-gray-100 dark:bg-gray-700 ${isDark ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'} px-4 py-2 rounded-lg transition font-medium`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingreso vs Gasto */}
        <div className={`${cardBg} p-6 rounded-xl shadow-sm lg:col-span-2`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-bold ${textColor}`}>Ingreso vs Gasto</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dataIncomeVsExpense}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend />
                <Bar dataKey="Ingreso" fill="#00C49F" />
                <Bar dataKey="Gasto" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ingresos por Categoría */}
        <div className={`${cardBg} p-6 rounded-xl shadow-sm`}>
          <h3 className={`text-lg font-bold ${textColor} mb-4`}>Ingresos por Categoría</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataIncome}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#00C49F"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataIncome.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gastos por Categoría */}
        <div className={`${cardBg} p-6 rounded-xl shadow-sm transition-colors duration-200`}>
          <h3 className={`text-lg font-bold ${textColor} mb-4`}>Gastos por Categoría</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataExpenses}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#FF8042"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataExpenses.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Obras en Curso */}
      <div className={`${cardBg} p-6 rounded-xl shadow-sm`}>
        <h3 className={`text-lg font-bold ${textColor} mb-4`}>Obras en Curso</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Obra</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Cliente</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Avance</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y divide-gray-200 dark:divide-gray-700`}>
              {activeProjects.length === 0 ? (
                <tr>
                    <td colSpan={4} className={`px-6 py-4 text-center ${subTextColor}`}>No hay obras en curso</td>
                </tr>
              ) : (
                activeProjects.map((project) => (
                <tr key={project.id}>
                  <td className={`px-6 py-4 text-sm font-medium ${textColor} min-w-[200px] max-w-xs`}>
                    <div className="line-clamp-3 whitespace-normal text-justify break-words">
                      {project.name}
                    </div>
                    {project.name.length > 80 && (
                      <button
                        onClick={() => setViewMoreProject({name: project.name, id: project.id!})}
                        className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 block focus:outline-none font-semibold"
                      >
                        Ver más
                      </button>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>{project.client}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                    </div>
                    <span className={`text-xs ${subTextColor} mt-1 block text-right`}>{project.progress || 0}%</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColor(project.status || '')}`}>{project.status}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
