import { useMemo, useState, useEffect } from 'react';
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
import { Wallet, TrendingUp, TrendingDown, LayoutList, X, AlertTriangle, Clock, Calendar, AlertCircle, Sparkles, CircleDollarSign } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { quotes } from '../utils/quotes';

const Dashboard = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';

  const toSentenceCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

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
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate total budget
  const projects = useLiveQuery(async () => {
    const allProjects = await db.projects.toArray();
    if (user?.projectId) {
      return allProjects.filter(p => p.id === Number(user.projectId));
    }
    return allProjects;
  }, [user?.projectId]) || [];

  useEffect(() => {
    if (user?.projectId) {
      setChartFilterProjectId(user.projectId.toString());
    }
  }, [user?.projectId]);
  
  // Fetch transactions for dynamic stats
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  
  // Fetch Inventory for Low Stock Alerts
  const inventory = useLiveQuery(async () => {
    const all = await db.inventory.toArray();
    if (user?.projectId) {
        return all.filter(i => i.projectId === user.projectId!.toString());
    }
    return all;
  }, [user?.projectId]) || [];

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.minStock !== undefined && item.quantity <= item.minStock);
  }, [inventory]);

  const delayedProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return projects.filter(p => {
        if (p.status === 'Atrasado') return true;
        if (p.status !== 'Finalizado' && p.endDate) {
            const end = new Date(p.endDate);
            // Add one day to include the end date as valid
            end.setDate(end.getDate() + 1);
            if (end < today) return true;
        }
        return false;
    });
  }, [projects]);

  const riskProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projects.filter(p => {
        if (p.status === 'Finalizado' || p.status === 'Cancelado') return false;
        
        const progress = p.progress || 0;
        if (progress >= 80) return false;

        if (p.endDate) {
            const end = new Date(p.endDate);
            // Calculate difference in days
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Less than or equal to 30 days remaining (including overdue)
            return diffDays <= 30;
        }
        return false;
    });
  }, [projects]);

  const activeProjects = projects.filter(p => p.status === 'En Ejecución' || p.status === 'En Planificación' || p.status === 'Atrasado');

  const projectOptions = useMemo(() => {
    return [
      ...(user?.projectId ? [] : [{ value: 'all', label: 'Todas las obras' }]),
      ...projects.map(p => ({ value: p.id!, label: p.name }))
    ];
  }, [projects, user?.projectId]);

  const filteredTransactions = useMemo(() => {
    // Enforce user project restriction first
    let txs = transactions;
    if (user?.projectId) {
      txs = txs.filter(t => t.projectId.toString() === user.projectId!.toString());
    }

    if (chartFilterProjectId === 'all') return txs;
    return txs.filter(t => t.projectId.toString() === chartFilterProjectId);
  }, [transactions, chartFilterProjectId, user?.projectId]);

  const filteredProjectsForStats = useMemo(() => {
    if (chartFilterProjectId === 'all') return projects;
    return projects.filter(p => p.id?.toString() === chartFilterProjectId);
  }, [projects, chartFilterProjectId]);

  // Calculate total budget based on filter
  const totalBudget = filteredProjectsForStats.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Ingreso') {
        acc.income += Number(t.amount) || 0;
      } else {
        acc.expense += Number(t.amount) || 0;
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
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
      });
    
    return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Data for PieChart (Income by Category)
  const dataIncome = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'Ingreso')
      .forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Number(t.amount);
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
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthlyTransactions
        .filter(t => t.type === 'Gasto')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
        Ingreso: income,
        Gasto: expense
      };
    });
  }, [filteredTransactions]);

  const projectFinancials = useMemo(() => {
    return filteredProjectsForStats.map(p => {
        const projectExpenses = transactions
          .filter(t => t.projectId.toString() === p.id?.toString() && t.type === 'Gasto')
          .reduce((sum, t) => sum + Number(t.amount), 0);
          
        return {
          name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
          fullName: p.name,
          Presupuesto: p.value || 0,
          Gastos: projectExpenses
        };
      }).sort((a, b) => b.Presupuesto - a.Presupuesto);
  }, [filteredProjectsForStats, transactions]);
  
  const cards = [
    { title: 'Proyectos Activos', value: filteredProjectsForStats.filter(p => p.status === 'En Ejecución' || p.status === 'En Planificación' || p.status === 'Atrasado').length.toString(), icon: LayoutList, color: 'bg-blue-500' },
    { title: 'Valor Total Obras', value: `S/ ${totalBudget.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Ingresos actuales', value: `S/ ${stats.income.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CircleDollarSign, color: 'bg-emerald-500' },
    { title: 'Gastos Totales', value: `S/ ${stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingDown, color: 'bg-red-500' },
    { title: 'Saldo Total', value: `S/ ${(stats.income - stats.expense).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Wallet, color: 'bg-indigo-500' },
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: tooltipBg, 
          borderColor: tooltipBorder, 
          color: tooltipText,
          borderWidth: '1px',
          borderStyle: 'solid',
          padding: '12px',
          borderRadius: '8px',
          maxWidth: '250px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', wordWrap: 'break-word', lineHeight: '1.2' }}>
            {payload[0].payload.fullName || label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, fontSize: '0.9rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 500 }}>{entry.name}:</span> S/ {Number(entry.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
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

      <div className={`p-4 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <Sparkles className={`mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} size={18} />
          <div className="text-sm italic flex-1">
            <p className={`mb-1 ${isDark ? 'text-blue-200' : 'text-blue-800'} animate-fade-in`}>
              "{quotes[currentQuoteIndex]}"
            </p>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(lowStockItems.length > 0 || delayedProjects.length > 0 || riskProjects.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Risk Projects (New) */}
            {riskProjects.length > 0 && (
                <div className={`${cardBg} p-6 rounded-xl shadow-sm border-l-4 border-yellow-500`}>
                    <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
                        <AlertCircle className="text-yellow-500" />
                        Riesgo de Cumplimiento
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {riskProjects.map(p => (
                            <div key={p.id} className={`flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 last:border-0 last:pb-0`}>
                                <div className="flex-1 pr-2 min-w-0">
                                    <p className={`font-medium ${textColor} text-[14px] line-clamp-2 leading-snug break-words`}>
                                        {toSentenceCase(p.name)}
                                    </p>
                                    {p.name.length > 100 && (
                                        <button 
                                            onClick={() => setViewMoreProject({name: p.name, id: p.id!})}
                                            className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-0.5 block font-bold focus:outline-none"
                                        >
                                            Ver más
                                        </button>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">Fin: {p.endDate}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold whitespace-nowrap block">
                                        {p.progress || 0}% Avance
                                    </span>
                                    <span className="text-[10px] text-red-500 font-semibold">
                                        &lt; 1 Mes
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delayed Projects */}
            {delayedProjects.length > 0 && (
                <div className={`${cardBg} p-6 rounded-xl shadow-sm border-l-4 border-red-500`}>
                    <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
                        <Clock className="text-red-500" />
                        Proyectos con Retraso
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {delayedProjects.map(p => (
                            <div key={p.id} className={`flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 last:border-0 last:pb-0`}>
                                <div className="flex-1 pr-2 min-w-0">
                                    <p className={`font-medium ${textColor} text-[14px] line-clamp-2 leading-snug break-words`}>
                                        {toSentenceCase(p.name)}
                                    </p>
                                    {p.name.length > 100 && (
                                        <button 
                                            onClick={() => setViewMoreProject({name: p.name, id: p.id!})}
                                            className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-0.5 block font-bold focus:outline-none"
                                        >
                                            Ver más
                                        </button>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">Fin: {p.endDate}</p>
                                </div>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold whitespace-nowrap ml-2 flex-shrink-0">
                                    {p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Low Stock */}
            {lowStockItems.length > 0 && (
                 <div className={`${cardBg} p-6 rounded-xl shadow-sm border-l-4 border-orange-500`}>
                    <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
                        <AlertTriangle className="text-orange-500" />
                        Alerta de Stock Bajo
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {lowStockItems.map(item => (
                            <div key={item.id} className={`flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 last:border-0 last:pb-0`}>
                                <div>
                                    <p className={`font-medium ${textColor}`}>{item.name}</p>
                                    <p className="text-xs text-gray-500">Min: {item.minStock} {item.unit}</p>
                                </div>
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold whitespace-nowrap ml-2">
                                    {item.quantity} {item.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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

      {/* Active Projects Progress */}
      {filteredProjectsForStats.filter(p => p.status === 'En Ejecución' || p.status === 'Atrasado').length > 0 && (
        <div className={`${cardBg} p-6 rounded-xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
            <Calendar className="text-blue-500" />
            Avance de Tiempo (Obras Activas)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjectsForStats
              .filter(p => p.status === 'En Ejecución' || p.status === 'Atrasado')
              .map(p => {
                const start = p.startDate ? new Date(p.startDate) : new Date();
                const end = p.endDate ? new Date(p.endDate) : new Date();
                const today = new Date();
                
                let percent = 0;
                if (p.startDate && p.endDate) {
                    const total = end.getTime() - start.getTime();
                    const elapsed = today.getTime() - start.getTime();
                    if (total > 0) {
                        percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
                    }
                }
                
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex justify-between text-sm items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p 
                          className={`font-medium ${textColor} text-[14px] line-clamp-2 leading-snug break-words`}
                          title={toSentenceCase(p.name)}
                        >
                          {toSentenceCase(p.name)}
                        </p>
                        {p.name.length > 100 && (
                          <button 
                            onClick={() => setViewMoreProject({name: p.name, id: p.id!})}
                            className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 block font-bold focus:outline-none"
                          >
                            Ver más
                          </button>
                        )}
                      </div>
                      <span className={`${subTextColor} whitespace-nowrap flex-shrink-0 mt-0.5`}>{percent.toFixed(0)}% Completado</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${p.status === 'Atrasado' ? 'bg-red-500' : 'bg-blue-600'}`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Inicio: {p.startDate || 'N/A'}</span>
                      <span>Fin: {p.endDate || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
              {toSentenceCase(viewMoreProject.name)}
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
        {/* Presupuesto vs Gastos Reales */}
        <div className={`${cardBg} p-6 rounded-xl shadow-sm lg:col-span-2`}>
            <h3 className={`text-lg font-bold ${textColor} mb-4`}>Presupuesto vs Gastos Reales por Obra</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={projectFinancials}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis 
                            type="number" 
                            stroke={axisColor} 
                            tickFormatter={(value) => 
                                new Intl.NumberFormat('es-PE', { 
                                    style: 'currency', 
                                    currency: 'PEN', 
                                    notation: 'compact', 
                                    compactDisplay: 'short' 
                                }).format(value)
                            } 
                        />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={180} 
                            stroke={axisColor}
                            tick={{fontSize: 11}}
                            interval={0}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="Presupuesto" fill="#3B82F6" name="Presupuesto" radius={[0, 4, 4, 0]} barSize={20} />
                        <Bar dataKey="Gastos" fill="#EF4444" name="Gastos Reales" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

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
                <YAxis 
                  stroke={axisColor} 
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('es-PE', { 
                      style: 'currency', 
                      currency: 'PEN', 
                      notation: 'compact', 
                      compactDisplay: 'short' 
                    }).format(value)
                  }
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: number) => [`S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]}
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
                  formatter={(value: number) => [`S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]}
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
                  formatter={(value: number) => [`S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]}
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
