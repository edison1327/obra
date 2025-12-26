import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import SearchableSelect from '../components/SearchableSelect';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, Wallet, FileText, Printer, Percent } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const Reports = () => {
  const { hasPermission, user } = useAuth();
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
  
  const systemLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
  });

  const companyData = useLiveQuery(async () => {
    const keys = ['company_name', 'company_address', 'company_website', 'company_email'];
    const settings = await db.settings.where('key').anyOf(keys).toArray();
    return {
      name: settings.find(s => s.key === 'company_name')?.value || '',
      address: settings.find(s => s.key === 'company_address')?.value || '',
      website: settings.find(s => s.key === 'company_website')?.value || '',
      email: settings.find(s => s.key === 'company_email')?.value || ''
    };
  });

  const projects = useLiveQuery(async () => {
    const allProjects = await db.projects.toArray();
    if (user?.projectId) {
      return allProjects.filter(p => p.id === Number(user.projectId));
    }
    return allProjects;
  }, [user?.projectId]) || [];

  const projectOptions = [
    ...(user?.projectId ? [] : [{ value: '', label: 'Todas las obras' }]),
    ...projects.map(p => ({ value: p.id!, label: p.name }))
  ];

  useEffect(() => {
    if (user?.projectId) {
      setSelectedProject(user.projectId.toString());
    }
  }, [user?.projectId]);

  const transactions = useLiveQuery(async () => {
    const all = await db.transactions.toArray();
    return all.filter(t => {
       // Enforce user project restriction
       if (user?.projectId && t.projectId.toString() !== user.projectId.toString()) return false;
       
       if (selectedProject && t.projectId !== selectedProject) return false;
       if (startDate && t.date < startDate) return false;
       if (endDate && t.date > endDate) return false;
       return true;
    });
  }, [selectedProject, startDate, endDate, user?.projectId]) || [];

  const income = transactions.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'Gasto').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expense;
  const rentability = income > 0 ? ((balance / income) * 100).toFixed(1) : '0.0';

  const format = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Fecha', 'Obra', 'Descripción', 'Categoría', 'Tipo', 'Monto'];
    
    const rows = transactions.map(t => {
      const project = projects.find(p => p.id?.toString() === t.projectId);
      return [
        t.date,
        project ? project.name : 'N/A',
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount.toFixed(2)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    if (transactions.length === 0) {
      toast.error('No hay datos para imprimir');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo
    if (systemLogo) {
        try {
            const isPng = systemLogo.startsWith('data:image/png');
            const format = isPng ? 'PNG' : 'JPEG';
            doc.addImage(systemLogo, format, 14, 5, 30, 30);
        } catch (e) {
            console.error('Error adding logo to PDF', e);
        }
    }

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE MOVIMIENTOS', systemLogo ? 50 : 14, 25);
    
    // Company Info
    if (companyData?.name) {
        doc.setFontSize(10);
        doc.text(companyData.name, pageWidth - 14, 15, { align: 'right' });
        if (companyData.address) doc.text(companyData.address, pageWidth - 14, 20, { align: 'right' });
        if (companyData.email) doc.text(companyData.email, pageWidth - 14, 25, { align: 'right' });
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 35, { align: 'right' });

    // Filter Info
    let yPos = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    const projectName = selectedProject 
      ? projects.find(p => p.id?.toString() === selectedProject)?.name || 'Desconocido'
      : 'Todas las obras';
      
    doc.text(`Obra: ${projectName}`, 14, yPos);
    doc.text(`Desde: ${startDate || 'Inicio'} Hasta: ${endDate || 'Actualidad'}`, 14, yPos + 6);

    // Summary
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Financiero', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Concepto', 'Monto']],
      body: [
        ['Ingresos Totales', format(income)],
        ['Gastos Totales', format(expense)],
        ['Balance', format(balance)],
        ['Rentabilidad', `${rentability}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      }
    });

    // Transactions Table
    const lastTableY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.text('Detalle de Movimientos', 14, lastTableY);

    const tableRows = transactions.map(t => [
      t.date,
      projects.find(p => p.id?.toString() === t.projectId)?.name || 'N/A',
      t.description,
      t.category,
      t.type,
      format(t.amount)
    ]);

    autoTable(doc, {
      startY: lastTableY + 5,
      head: [['Fecha', 'Obra', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });

    doc.save(`Reporte_Movimientos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor}`}>Panel de Informes</h1>

      {/* Filters */}
      <div className={`${cardBg} p-6 rounded-lg shadow-sm transition-colors duration-200`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-1">
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre de Obra</label>
            <SearchableSelect
              options={projectOptions}
              value={selectedProject}
              onChange={setSelectedProject}
              className="w-full"
              placeholder="Todas las obras"
            />
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
        {hasPermission('reports.create') && (
          <>
            <button 
              onClick={handleExportCSV}
              className={`flex items-center justify-center gap-2 px-6 py-3 ${cardBg} border ${borderColor} rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <FileText size={20} />
              Exportar CSV
            </button>
            <button 
              onClick={handlePrintPDF}
              className={`flex items-center justify-center gap-2 px-6 py-3 ${cardBg} border ${borderColor} rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <Printer size={20} />
              Imprimir PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
