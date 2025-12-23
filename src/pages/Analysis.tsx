import { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Search, ChevronDown, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../db/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../context/ThemeContext';

const Analysis = ({ filterStatus }: { filterStatus?: string }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const projects = useLiveQuery(async () => {
    if (filterStatus) {
      return await db.projects.where('status').equals(filterStatus).toArray();
    }
    return await db.projects.toArray();
  }, [filterStatus]);
  
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

  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0 };
    
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'Ingreso') {
        acc.income += curr.amount;
      } else {
        acc.expense += curr.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  // Return Project Progress directly
  const progress = useMemo(() => {
    return selectedProject?.progress || 0;
  }, [selectedProject]);

  // Set first project as default selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id!.toString());
    }
  }, [projects, selectedProjectId]);

  // Sync searchTerm with selectedProject
  useEffect(() => {
    if (selectedProject) {
      setSearchTerm(selectedProject.name);
    }
  }, [selectedProject]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert to selected project name if closed without selection
        if (selectedProject) {
            setSearchTerm(selectedProject.name);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedProject]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const generatePDF = () => {
    if (!selectedProject) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- Header ---
    doc.setFillColor(41, 128, 185); // Professional Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    
    const reportTitle = selectedProject.status === 'Finalizado' ? 'REPORTE DE CIERRE DE OBRA' : 'REPORTE DE OBRA';
    doc.text(reportTitle, 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 25, { align: 'right' });

    // --- Project Info Section ---
    let yPos = 55;
    
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

    drawCard(14, 'Ingresos', `S/ ${stats.income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, [46, 204, 113]);
    drawCard(14 + cardWidth + gap, 'Gastos', `S/ ${stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, [231, 76, 60]);
    
    const profit = stats.income - stats.expense;
    const profitColor: [number, number, number] = profit >= 0 ? [26, 188, 156] : [231, 76, 60];
    drawCard(14 + (cardWidth + gap) * 2, 'Rentabilidad', `S/ ${profit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, profitColor);

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
      `S/ ${t.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
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
      <div className="w-full md:w-1/2" ref={wrapperRef}>
        <label className={`block text-xs font-bold ${subTextColor} uppercase tracking-wider mb-2 ml-1`}>
          Seleccionar Obra
        </label>
        <div className="relative group">
          <div 
            className={`
              flex items-center w-full px-4 py-3 
              ${cardBg} border ${borderColor} rounded-xl shadow-sm 
              transition-all duration-200 ease-in-out
              cursor-text
              ${isOpen 
                ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-md' 
                : 'hover:border-blue-300 hover:shadow-md'
              }
            `}
            onClick={() => setIsOpen(true)}
          >
            <Search 
              size={20} 
              className={`
                mr-3 transition-colors duration-200
                ${isOpen ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400'}
              `} 
            />
            <input 
              type="text"
              className={`flex-1 outline-none ${isDark ? 'text-gray-200' : 'text-gray-700'} placeholder-gray-400 bg-transparent font-medium`}
              placeholder="Buscar obra..."
              value={searchTerm}
              onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            <div className="flex items-center gap-2">
              {searchTerm && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                    setIsOpen(true);
                  }}
                  className={`p-1 rounded-full text-gray-400 ${hoverBg} hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
                >
                   <X size={16} />
                </button>
              )}
              <div className={`w-px h-5 ${borderColor}`}></div>
              <ChevronDown 
                size={20} 
                className={`
                  text-gray-400 transition-transform duration-200
                  ${isOpen ? 'rotate-180 text-blue-500' : ''}
                `} 
              />
            </div>
          </div>

          {isOpen && (
            <div className={`absolute z-20 w-full mt-2 ${cardBg} border ${isDark ? 'border-gray-700' : 'border-gray-100'} rounded-xl shadow-xl max-h-80 overflow-auto animate-in fade-in zoom-in-95 duration-100`}>
              <div className="p-1">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map(project => {
                    const isSelected = selectedProjectId === project.id?.toString();
                    return (
                      <div 
                        key={project.id}
                        className={`
                          flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' 
                            : `${subTextColor} ${hoverBg} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`
                          }
                        `}
                        onClick={() => {
                          setSelectedProjectId(project.id!.toString());
                          setSearchTerm(project.name);
                          setIsOpen(false);
                        }}
                      >
                        <span>{project.name}</span>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className={`px-4 py-8 text-center ${subTextColor}`}>
                    <p className="text-sm">No se encontraron obras</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProject ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Row 1 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-blue-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Nombre de Obra</p>
            <h3 className={`text-lg font-bold ${textColor}`}>{selectedProject.name}</h3>
          </div>
          
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-red-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Gastos</p>
            <h3 className={`text-lg font-bold ${textColor}`}>
              S/ {stats.expense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-green-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Ingreso</p>
            <h3 className={`text-lg font-bold ${textColor}`}>
              S/ {stats.income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          {/* Row 2 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-gray-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Estado</p>
            <h3 className={`text-lg font-bold ${textColor}`}>{selectedProject.status}</h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-indigo-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Cliente</p>
            <h3 className={`text-lg font-bold ${textColor}`}>{selectedProject.client}</h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Fecha Fin</p>
            <h3 className={`text-lg font-bold ${textColor}`}>
              {selectedProject.endDate || 'No definida'}
            </h3>
          </div>

          {/* Row 3 */}
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-teal-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Rentabilidad</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${stats.income - stats.expense >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-700 dark:text-red-400'}`}>
                S/ {(stats.income - stats.expense).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-purple-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>Valor de Obra</p>
            <h3 className={`text-lg font-bold ${textColor}`}>
              S/ {selectedProject.value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border-l-4 border-orange-500 transition-colors duration-200`}>
            <p className={`text-sm ${subTextColor} mb-1`}>% Avance de Obra</p>
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
              <p className={`text-sm ${subTextColor} mb-1`}>Documentos</p>
              <h3 className={`text-lg font-bold ${textColor}`}>Ver PDF</h3>
            </div>
            <FileText size={32} className="text-red-500" />
          </div>
        </div>
      ) : (
        <div className={`text-center py-10 ${subTextColor}`}>
          Seleccione una obra para ver el análisis
        </div>
      )}
    </div>
  );
};

export default Analysis;
