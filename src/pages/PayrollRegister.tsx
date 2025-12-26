import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Payroll } from '../db/db';
import { ArrowLeft, Plus, Trash2, Save, Printer, Upload, Eye, X, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';
import WorkerModal from '../components/WorkerModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';

const PayrollRegister = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const tableHeaderBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const tableText = isDark ? 'text-white' : 'text-gray-900';
  const tableSubText = isDark ? 'text-gray-400' : 'text-gray-500';
  const iconColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const buttonHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  const projects = useLiveQuery(async () => {
    if (user?.projectId) {
      const userProject = await db.projects.get(Number(user.projectId));
      return userProject ? [userProject] : [];
    }
    return db.projects.toArray();
  }, [user?.projectId]) || [];

  const workers = useLiveQuery(() => db.workers.where('status').equals('Activo').toArray()) || [];

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

  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Borrador' | 'Aprobado' | 'Pagado'>('Borrador');
  
  const [details, setDetails] = useState<Payroll['details']>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);

  // Auto-select project if user has one assigned
  useEffect(() => {
    if (user?.projectId && !id) { // Only if not editing an existing payroll
      setProjectId(user.projectId.toString());
    }
  }, [user?.projectId, id]);

  const projectOptions = projects.map(p => ({ value: p.id!, label: p.name }));

  const statusOptions = [
    { value: "Borrador", label: "Borrador" },
    { value: "Aprobado", label: "Aprobado" },
    { value: "Pagado", label: "Pagado" },
  ];

  const workerOptions = workers.map(w => ({ value: w.id!, label: w.name }));

  const paymentMethods = ['Efectivo', 'Transferencia', 'Yape/Plin', 'Cheque'];
  const paymentMethodOptions = paymentMethods.map(m => ({ value: m, label: m }));

  // Load existing payroll if editing
  useEffect(() => {
    if (id) {
      db.payrolls.get(Number(id)).then(payroll => {
        if (payroll) {
          setProjectId(payroll.projectId);
          setStartDate(payroll.startDate);
          setEndDate(payroll.endDate);
          setStatus(payroll.status);
          setDetails(payroll.details);
        }
      });
    }
  }, [id]);

  const handleWorkerSuccess = (workerId: number) => {
    setSelectedWorkerId(workerId.toString());
  };

  const handleAddWorker = () => {
    if (!selectedWorkerId) return;
    const worker = workers.find(w => w.id?.toString() === selectedWorkerId);
    if (worker && !details.find(d => d.workerId === worker.id)) {
      setDetails([
        ...details,
        {
          workerId: worker.id!,
          workerName: worker.name,
          role: worker.role,
          daysWorked: 0,
          amount: 0,
          paymentMethod: 'Efectivo'
        }
      ]);
      setSelectedWorkerId('');
    }
  };

  const updateDetail = (index: number, field: keyof Payroll['details'][0], value: any) => {
    const newDetails = [...details];
    const workerId = newDetails[index].workerId;
    const worker = workers.find(w => w.id === workerId);
    
    if (field === 'daysWorked') {
      const days = Number(value);
      newDetails[index].daysWorked = days;
      // Auto calc amount if we have rate
      if (worker && worker.dailyRate) {
        newDetails[index].amount = days * worker.dailyRate;
      }
    } else if (field === 'amount') {
      newDetails[index].amount = Number(value);
    } else if (field === 'paymentMethod') {
      newDetails[index].paymentMethod = String(value);
    }
    
    setDetails(newDetails);
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newDetails = [...details];
        newDetails[index].paymentProof = base64String;
        setDetails(newDetails);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePaymentSlip = (detail: Payroll['details'][0]) => {
    const doc = new jsPDF();
    const project = projects.find(p => p.id?.toString() === projectId);
    const worker = workers.find(w => w.id === detail.workerId);
    
    // Logo
    if (systemLogo) {
        try {
            const isPng = systemLogo.startsWith('data:image/png');
            const format = isPng ? 'PNG' : 'JPEG';
            doc.addImage(systemLogo, format, 14, 10, 25, 25);
        } catch (e) {
            console.error('Error adding logo to PDF', e);
        }
    }

    // Header Title
    doc.setFontSize(18);
    doc.text('BOLETA DE PAGO', 105, 20, { align: 'center' });
    
    // Company Info (Top Right)
    if (companyData?.name) {
        doc.setFontSize(10);
        doc.text(companyData.name, 195, 15, { align: 'right' });
        if (companyData.address) {
            doc.setFontSize(8);
            doc.text(companyData.address, 195, 20, { align: 'right' });
        }
        if (companyData.email) {
            doc.setFontSize(8);
            doc.text(companyData.email, 195, 24, { align: 'right' });
        }
    }

    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 195, 30, { align: 'right' });
    
    // Company/Project Info
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252); // Very light gray (slate-50)
    doc.rect(14, 35, 182, 25, 'F');
    doc.rect(14, 35, 182, 25, 'S'); // Border
    
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185); // Blue title
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLEADOR / OBRA', 20, 43);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60); // Dark gray text
    doc.text(`Empleador: ${companyData?.name || 'N/A'}`, 20, 50);
    doc.text(`Obra: ${project?.name || 'N/A'}`, 20, 55);
    doc.text(`Cliente: ${project?.client || 'N/A'}`, 110, 50);
    doc.text(`Periodo: ${new Date(startDate).toLocaleDateString()} al ${new Date(endDate).toLocaleDateString()}`, 110, 55);
    
    // Worker Info
    doc.setFillColor(248, 250, 252); // Ensure fill color is reset
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, 65, 182, 25, 'F');
    doc.rect(14, 65, 182, 25, 'S'); // Border

    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185); // Blue title
    doc.setFont('helvetica', 'bold');
    doc.text('TRABAJADOR', 20, 73);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${detail.workerName}`, 20, 80);
    doc.text(`Cargo: ${detail.role}`, 20, 85);
    doc.text(`DNI: ${worker?.documentNumber || '-'}`, 110, 80);
    
    // Details Table
    
    autoTable(doc, {
      startY: 95,
      head: [['Concepto', 'Días', 'Importe']],
      body: [
        ['Jornal Básico', detail.daysWorked.toString(), `S/ ${detail.amount.toFixed(2)}`]
      ],
      foot: [
        ['TOTAL NETO A PAGAR', '', `S/ ${detail.amount.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });
    
    const pageHeight = doc.internal.pageSize.height;
    
    // Payment Method
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text(`Medio de Pago: ${detail.paymentMethod || 'Efectivo'}`, 14, finalY + 10);
    
    // Add image proof if exists and payment method is Transferencia
    let signatureY = pageHeight - 40;
    
    if (detail.paymentMethod === 'Transferencia' && detail.paymentProof) {
      try {
        // Detect image format from Base64 string
        const isPng = detail.paymentProof.startsWith('data:image/png');
        const format = isPng ? 'PNG' : 'JPEG';

        // Add image (maxWidth 180, maxHeight 60)
        doc.addImage(detail.paymentProof, format, 14, finalY + 15, 80, 40, undefined, 'FAST');
        doc.text('Comprobante de Transferencia', 14, finalY + 60);
        signatureY = pageHeight - 30; // Push signatures down if needed
      } catch (err) {
        console.error('Error adding image to PDF', err);
      }
    }

    // Signatures
    
    doc.line(30, signatureY, 90, signatureY);
    doc.text('Firma del Empleador', 60, signatureY + 5, { align: 'center' });
    
    doc.line(120, signatureY, 180, signatureY);
    doc.text('Firma del Trabajador', 150, signatureY + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`DNI: ${worker?.documentNumber || '_________________'}`, 150, signatureY + 10, { align: 'center' });

    doc.save(`Boleta_${detail.workerName}_${startDate}.pdf`);
  };

  const removeDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const totalAmount = details.reduce((sum, item) => sum + Number(item.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      toast.error('Seleccione una obra');
      return;
    }

    const payrollData: Payroll = {
      projectId,
      startDate,
      endDate,
      status,
      totalAmount,
      details
    };

    try {
      if (id) {
        await db.payrolls.update(Number(id), payrollData as any);
      } else {
        await db.payrolls.add(payrollData);
      }
      await SyncService.pushToRemote(false);
      toast.success('Planilla guardada correctamente');
      navigate('/payrolls');
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error al guardar la planilla');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/payrolls')}
          className={`p-2 ${buttonHover} rounded-full transition`}
        >
          <ArrowLeft size={24} className={iconColor} />
        </button>
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {id ? 'Editar Planilla' : 'Nueva Planilla'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Obra</label>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                className="w-full"
                placeholder="Seleccionar Obra..."
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Estado</label>
              <SearchableSelect
                options={statusOptions}
                value={status}
                onChange={(value) => setStatus(value as any)}
                className="w-full"
                placeholder="Seleccionar Estado..."
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Fecha Inicio</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full rounded-lg ${inputBorder} border p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputBg} ${inputText}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Fecha Fin</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full rounded-lg ${inputBorder} border p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputBg} ${inputText}`}
              />
            </div>
          </div>
        </div>

        {/* Workers List */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm space-y-4`}>
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Users size={20} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textColor}`}>Detalle de Trabajadores</h2>
                <p className={`text-xs ${subTextColor}`}>Gestione el personal para esta planilla</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:max-w-[40%]">
              <div className="w-full">
                <SearchableSelect
                  options={workerOptions}
                  value={selectedWorkerId}
                  onChange={setSelectedWorkerId}
                  placeholder="Buscar y seleccionar trabajador..."
                  className="w-full"
                />
              </div>
              <button
                type="button"
                onClick={handleAddWorker}
                disabled={!selectedWorkerId}
                className="h-[38px] bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 w-full text-base"
              >
                <Plus size={18} />
                <span className="font-medium whitespace-nowrap">Agregar</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700`}>
              <thead className={`${tableHeaderBg}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${tableSubText} uppercase`}>Trabajador</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${tableSubText} uppercase`}>Rol</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${tableSubText} uppercase`}>Días</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${tableSubText} uppercase`}>Total (S/)</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${tableSubText} uppercase`}>Medio Pago</th>
                  <th className={`px-4 py-3 text-right text-xs font-medium ${tableSubText} uppercase`}>Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`px-4 py-8 text-center ${tableSubText} text-sm`}>
                      No hay trabajadores agregados a esta planilla.
                    </td>
                  </tr>
                ) : (
                  details.map((detail, index) => (
                    <tr key={`${detail.workerId}-${index}`}>
                      <td className={`px-4 py-2 text-sm font-medium ${tableText}`}>{detail.workerName}</td>
                      <td className={`px-4 py-2 text-sm ${tableSubText}`}>{detail.role}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={detail.daysWorked}
                          onChange={(e) => updateDetail(index, 'daysWorked', e.target.value)}
                          className={`w-20 rounded ${inputBorder} border p-1 text-sm ${inputBg} ${inputText}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={detail.amount}
                          onChange={(e) => updateDetail(index, 'amount', e.target.value)}
                          className={`w-24 rounded ${inputBorder} border p-1 text-sm font-medium ${inputBg} ${inputText}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="w-40">
                          <SearchableSelect
                            options={paymentMethodOptions}
                            value={detail.paymentMethod || 'Efectivo'}
                            onChange={(value) => updateDetail(index, 'paymentMethod', value)}
                            className="w-full"
                            placeholder="Método..."
                          />
                        </div>
                        {detail.paymentMethod === 'Transferencia' && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-xs">
                              <Upload size={14} />
                              <span>{detail.paymentProof ? 'Cambiar' : 'Subir'}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={(e) => handleFileUpload(index, e)}
                              />
                            </label>
                            {detail.paymentProof && (
                              <button
                                type="button"
                                onClick={() => setViewImage(detail.paymentProof!)}
                                className={`text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200`}
                                title="Ver comprobante"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => generatePaymentSlip(detail)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                          title="Imprimir Boleta"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDetail(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className={`${tableHeaderBg}`}>
                <tr>
                  <td colSpan={3} className={`px-4 py-3 text-right font-bold ${subTextColor}`}>Total Planilla:</td>
                  <td colSpan={3} className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 text-lg">S/ {totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/payrolls')}
            className={`px-6 py-2 border ${inputBorder} rounded-lg ${subTextColor} hover:${buttonHover}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save size={20} />
            Guardar Planilla
          </button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <div className={`relative max-w-4xl max-h-[90vh] overflow-auto ${cardBg} rounded-lg p-2`}>
            <button 
              onClick={() => setViewImage(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-700 rounded-full p-1"
            >
              <X size={24} />
            </button>
            <img src={viewImage} alt="Comprobante" className="max-w-full h-auto" />
          </div>
        </div>
      )}

      <WorkerModal 
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        onSuccess={handleWorkerSuccess}
      />
    </div>
  );
};

export default PayrollRegister;