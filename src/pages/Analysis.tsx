import { useState, useEffect, useMemo } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../db/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import Modal from '../components/Modal';

const Analysis = ({ filterStatus }: { filterStatus?: string }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    setIsNameModalOpen(false);
    setIsClientModalOpen(false);
  }, [selectedProjectId]);

  const toSentenceCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const projects = useLiveQuery(async () => {
    let result = [];
    if (filterStatus) {
      result = await db.projects.where('status').equals(filterStatus).toArray();
    } else {
      result = await db.projects.toArray();
    }
    
    if (user?.projectId) {
      return result.filter(p => p.id === Number(user.projectId));
    }
    return result;
  }, [filterStatus, user?.projectId]);
  
  const projectOptions = useMemo(() => {
    return projects?.map(p => ({ value: p.id!.toString(), label: p.name })) || [];
  }, [projects]);

  const selectedProject = useLiveQuery(
    async () => {
      if (selectedProjectId) {
        return await db.projects.get(Number(selectedProjectId));
      }
      return undefined;
    },
    [selectedProjectId]
  );

  const transactions = useLiveQuery(
    () => selectedProjectId ? db.transactions.where('projectId').equals(selectedProjectId).toArray() : Promise.resolve([] as Transaction[]),
    [selectedProjectId]
  );

  // Fetch Company Data & Logo
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

  const systemLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
  });

  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0 };
    
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'Ingreso') {
        acc.income += Number(curr.amount);
      } else {
        acc.expense += Number(curr.amount);
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  // Return Project Progress directly
  const progress = useMemo(() => {
    return selectedProject?.progress || 0;
  }, [selectedProject]);

  const isRisk = useMemo(() => {
    if (!selectedProject || selectedProject.status === 'Finalizado' || selectedProject.status === 'Cancelado') return false;
    
    const currentProgress = selectedProject.progress || 0;
    if (currentProgress >= 80) return false;

    if (selectedProject.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(selectedProject.endDate);
        
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 30;
    }
    return false;
  }, [selectedProject]);

  // Set first project as default selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id!.toString());
    }
  }, [projects, selectedProjectId]);

  const generatePDF = () => {
    if (!selectedProject) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- Header ---
    doc.setFillColor(41, 128, 185); // Professional Blue
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
    
    const reportTitle = selectedProject.status === 'Finalizado' ? 'REPORTE DE CIERRE DE OBRA' : 'REPORTE DE OBRA';
    doc.text(reportTitle, systemLogo ? 50 : 14, 25);
    
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

    // --- Project Info Section ---
    let yPos = 55;

    if (isRisk) {
        doc.setDrawColor(234, 179, 8); // Yellow-500
        doc.setFillColor(254, 252, 232); // Yellow-50
        doc.roundedRect(14, yPos, pageWidth - 28, 15, 2, 2, 'FD');
        
        doc.setTextColor(161, 98, 7); // text-yellow-700
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`ATENCIÓN: Esta obra está próxima a finalizar (${selectedProject.endDate}) y su avance es inferior al 80%.`, 18, yPos + 10);
        
        yPos += 25;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Proyecto', 14, yPos);
    
    yPos += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 10;

    doc.setTextColor(60, 60, 60);
    
    // Helper to draw a field
    const drawFullWidthField = (label: string, value: string, y: number, fontSize: number = 10) => {
        doc.setFontSize(10); // Label always 10
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        
        doc.setFontSize(fontSize); // Value font size
        doc.setFont('helvetica', 'normal');
        
        const valueX = 14 + 25; // Fixed indentation for values
        const maxWidth = pageWidth - 28 - 25; // Margins
        
        // Justify text
        doc.text(value, valueX, y, { 
            maxWidth: maxWidth, 
            align: 'justify' 
        });
        
        const lines = doc.splitTextToSize(value, maxWidth);
        // Approximate height: font size * 0.3527 (pt to mm) * 1.2 (line height) * lines
        const lineHeight = fontSize * 0.45; 
        return Math.max(lines.length * lineHeight, 6);
    };

    // 1. Obra (Size 12)
    yPos += drawFullWidthField('Obra:', selectedProject.name, yPos, 12) + 4;

    // 2. Cliente (Size 10)
    yPos += drawFullWidthField('Cliente:', selectedProject.client, yPos, 10) + 4;

    // 3. Ubicación (Size 10) - Below Cliente
    yPos += drawFullWidthField('Ubicación:', selectedProject.location || 'N/A', yPos, 10) + 8;

    // 4. Description (New - Justified)
    if (selectedProject.description) {
        yPos += drawFullWidthField('Descripción:', selectedProject.description, yPos, 10) + 8;
    }

    // 5. Row: Estado | Fecha Inicio | Fecha Fin
    const rowY = yPos;
    const colWidth = (pageWidth - 28) / 3;
    
    // Helper for columns
    const drawColumnField = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(label, x, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, x + doc.getTextWidth(label) + 2, y);
    };

    drawColumnField('Estado:', selectedProject.status, 14, rowY);
    
    // Center Start Date
    const startLabel = 'F. Inicio:';
    const startX = 14 + colWidth; // Roughly 1/3
    drawColumnField(startLabel, selectedProject.startDate || 'N/A', startX, rowY);

    // Right End Date
    const endLabel = 'F. Fin:';
    const endVal = selectedProject.endDate || 'N/A';
    // Align to roughly 2/3
    const endX = 14 + (colWidth * 2);
    drawColumnField(endLabel, endVal, endX, rowY);

    // New Row: Area (m2) | Area (ml)
    const areaRowY = rowY + 8;
    
    // Area m2
    const areaM2Label = 'Area (m2):';
    const areaM2Val = selectedProject.areaM2 ? selectedProject.areaM2.toString() : '0.00';
    drawColumnField(areaM2Label, areaM2Val, 14, areaRowY);

    // Area ml
    const areaMlLabel = 'Area (ml):';
    const areaMlVal = selectedProject.areaMl ? selectedProject.areaMl.toString() : '0.00';
    // Align to second column
    drawColumnField(areaMlLabel, areaMlVal, startX, areaRowY);

    // --- Financial Summary Cards ---
    // Start below the info section
    yPos = areaRowY + 20;
    
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Financiero', 14, yPos);
    yPos += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 10;

    // Card drawing function
    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
        // Subtle shadow/border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(x, yPos, 55, 28, 3, 3, 'FD');
        
        // Color strip
        doc.setFillColor(...color);
        doc.rect(x, yPos, 3, 28, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), x + 8, yPos + 10);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(value, x + 8, yPos + 22);
    };

    const cardWidth = 55;
    const gap = (pageWidth - 28 - (cardWidth * 3)) / 2;

    drawCard(14, 'Ingresos', `S/ ${stats.income.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, [46, 204, 113]);
    drawCard(14 + cardWidth + gap, 'Gastos', `S/ ${stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, [231, 76, 60]);
    
    const profit = stats.income - stats.expense;
    const profitColor: [number, number, number] = profit >= 0 ? [26, 188, 156] : [231, 76, 60];
    drawCard(14 + (cardWidth + gap) * 2, 'Rentabilidad', `S/ ${profit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, profitColor);

    yPos += 40;

    // --- Progress ---
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('Avance Físico de Obra', 14, yPos);
    doc.setTextColor(41, 128, 185);
    doc.text(`${progress}%`, pageWidth - 14, yPos, { align: 'right' });
    
    yPos += 5;
    // Draw bar background
    doc.setFillColor(236, 240, 241);
    doc.roundedRect(14, yPos, pageWidth - 28, 6, 3, 3, 'F');
    
    // Draw progress
    if (progress > 0) {
        doc.setFillColor(243, 156, 18); // Orange
        const width = ((pageWidth - 28) * Math.min(progress, 100)) / 100;
        doc.roundedRect(14, yPos, width, 6, 3, 3, 'F');
    }

    yPos += 15;

    // --- Transactions Table ---
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text('Detalle de Movimientos', 14, yPos);
    
    const tableData = transactions?.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.category,
      t.type,
      `S/ ${Number(t.amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]) || [];

    autoTable(doc, {
      startY: yPos + 8,
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
      },
      styles: { 
          fontSize: 9,
          cellPadding: 4,
          textColor: [60, 60, 60]
      },
      alternateRowStyles: {
          fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto' }, 
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      foot: [[
          '', 
          '', 
          'TOTAL GASTOS:', 
          '', 
          `S/ ${stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
      ]],
      footStyles: {
          fillColor: [241, 245, 249],
          textColor: [41, 128, 185],
          fontStyle: 'bold',
          halign: 'right'
      },
      didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
              `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`, 
              pageWidth / 2, 
              pageHeight - 10, 
              { align: 'center' }
          );
      }
    });

    doc.save(`Reporte_Obra_${selectedProject.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (!projects) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
        {filterStatus === 'Finalizado' ? 'Análisis de Obras Terminadas' : 'Análisis de Obra'}
      </h1>

      {/* Selector Mejorado */}
      <div className="w-full md:w-1/2">
        <label className={`block text-xs font-bold ${subTextColor} uppercase tracking-wider mb-2 ml-1`}>
          Seleccionar Obra
        </label>
        <SearchableSelect
          options={projectOptions}
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          className="w-full"
          placeholder="Buscar obra..."
        />
      </div>

      {selectedProject ? (
        <>
        {isRisk && (
            <div className={`${isDark ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-400'} border-l-4 p-4 rounded-md shadow-sm mb-6`}>
            <div className="flex items-center">
                <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                <p className={`text-sm font-bold ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>
                    Atención: Esta obra está próxima a finalizar ({selectedProject.endDate}) y su avance es inferior al 80%.
                </p>
                </div>
            </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Row 1 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-blue-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Nombre de Obra</p>
            <h3 className={`text-[13px] font-bold text-justify ${textColor} break-words line-clamp-3`}>
              {toSentenceCase(selectedProject.name)}
            </h3>
            {selectedProject.name.length > 100 && (
              <button
                onClick={() => setIsNameModalOpen(true)}
                className="text-blue-500 hover:text-blue-700 text-xs font-normal focus:outline-none mt-1 hover:underline block"
              >
                Ver más
              </button>
            )}
          </div>
          
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-red-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Gastos</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>
              S/ {stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-green-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Ingreso</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>
              S/ {stats.income.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          {/* Row 2 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-gray-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Estado</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>{selectedProject.status}</h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-indigo-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Cliente</p>
            <h3 className={`text-[13px] font-bold text-justify ${textColor} break-words line-clamp-3`}>
              {toSentenceCase(selectedProject.client)}
            </h3>
            {selectedProject.client.length > 100 && (
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="text-blue-500 hover:text-blue-700 text-xs font-normal focus:outline-none mt-1 hover:underline block"
              >
                Ver más
              </button>
            )}
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-cyan-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Fecha Inicio</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>
              {selectedProject.startDate || 'No definida'}
            </h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Fecha Fin</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>
              {selectedProject.endDate || 'No definida'}
            </h3>
          </div>

          {/* Row 3 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-teal-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Rentabilidad</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${stats.income - stats.expense >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-700 dark:text-red-400'} break-words`}>
                S/ {(stats.income - stats.expense).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-purple-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>Valor de Obra</p>
            <h3 className={`text-lg font-bold ${textColor} break-words`}>
              S/ {Number(selectedProject.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-orange-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1 break-words`}>% Avance de Obra</p>
            <div className="flex items-center gap-2">
              <div className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5 flex-1`}>
                <div 
                  className="bg-orange-500 h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{progress}%</span>
            </div>
          </div>

          <div 
            onClick={generatePDF}
            className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-gray-800 dark:border-gray-600 flex items-center justify-between cursor-pointer ${hoverBg} transition-colors duration-200`}
          >
            <div>
              <p className={`text-sm ${subTextColor} mb-1 break-words`}>Documentos</p>
              <h3 className={`text-lg font-bold ${textColor} break-words`}>Ver PDF</h3>
            </div>
            <FileText size={32} className="text-red-500" />
          </div>

          {/* Transactions Table */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm md:col-span-3`}>
            <h3 className={`text-lg font-bold ${textColor} mb-4`}>Detalle de Movimientos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Fecha</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Descripción</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Categoría</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Tipo</th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Monto</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  {transactions?.map((t) => (
                    <tr key={t.id} className={hoverBg}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textColor}`}>
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 text-sm ${textColor}`}>
                        {t.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textColor}`}>
                        {t.category}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          t.type === 'Ingreso' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        t.type === 'Ingreso' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        S/ {t.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {(!transactions || transactions.length === 0) && (
                    <tr>
                      <td colSpan={5} className={`px-6 py-4 text-center text-sm ${subTextColor}`}>
                        No hay movimientos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
      ) : (
        <div className={`text-center py-10 ${subTextColor}`}>
          Seleccione una obra para ver el análisis
        </div>
      )}

      {selectedProject && (
        <>
          <Modal
            isOpen={isNameModalOpen}
            onClose={() => setIsNameModalOpen(false)}
            title="Nombre de Obra"
          >
            <div className="p-1">
              <p className={`text-base text-justify ${textColor} break-words leading-relaxed`}>
                {toSentenceCase(selectedProject.name)}
              </p>
            </div>
          </Modal>

          <Modal
            isOpen={isClientModalOpen}
            onClose={() => setIsClientModalOpen(false)}
            title="Cliente"
          >
            <div className="p-1">
              <p className={`text-base text-justify ${textColor} break-words leading-relaxed`}>
                {toSentenceCase(selectedProject.client)}
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Analysis;
