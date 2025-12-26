import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { db, Client } from '../db/db';
import toast from 'react-hot-toast';
import { SyncService } from '../services/SyncService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const ProjectRegister = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useTheme();
  const { user } = useAuth();

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-200';

  const canEditFinancials = user?.role && (
    user.role.toLowerCase() === 'administrador general' || 
    user.role.toLowerCase() === 'administrador de obra'
  );

  // Form State
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState('');
  const [projectType, setProjectType] = useState('');
  const [otroTipoObra, setOtroTipoObra] = useState(''); // If "Otro" is selected
  const [areaM2, setAreaM2] = useState<string>('');
  const [areaMl, setAreaMl] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('En Planificación');
  const [progress, setProgress] = useState<string>('0');
  const [location, setLocation] = useState('');
  const [resident, setResident] = useState('');
  const [description, setDescription] = useState('');

  // Financial State
  const [costoDirecto, setCostoDirecto] = useState<string>('');
  const [gastosGeneralesPorc, setGastosGeneralesPorc] = useState<string>('');
  const [utilidadPorc, setUtilidadPorc] = useState<string>('');

  const clientTypeOptions = [
    { value: "Persona Natural", label: "Persona Natural" },
    { value: "Persona Juridica", label: "Persona Juridica" },
    { value: "Entidad Publica", label: "Entidad Publica" },
  ];

  const projectTypeOptions = [
    { value: "Vivienda Unifamiliar", label: "Vivienda Unifamiliar" },
    { value: "Edificio Multifamiliar", label: "Edificio Multifamiliar" },
    { value: "Oficinas", label: "Oficinas" },
    { value: "Comercial", label: "Comercial" },
    { value: "Otro", label: "Otro" },
  ];

  const statusOptions = [
    { value: "En Planificación", label: "En Planificación" },
    { value: "En Ejecución", label: "En Ejecución" },
    { value: "Paralizado", label: "Paralizado" },
    { value: "Finalizado", label: "Finalizado" },
  ];

  // Load data if editing
  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const project = await db.projects.get(Number(id));
        if (project) {
          setName(project.name);
          setClient(project.client);
          setClientEmail(project.clientEmail || '');
          setClientPhone(project.clientPhone || '');
          setAddress(project.address || '');
          setClientType(project.clientType || '');
          
          const standardTypes = ['Vivienda Unifamiliar', 'Edificio Multifamiliar', 'Oficinas', 'Comercial'];
          if (project.projectType && !standardTypes.includes(project.projectType)) {
            setProjectType('Otro');
            setOtroTipoObra(project.projectType);
          } else {
            setProjectType(project.projectType || '');
          }

          setAreaM2(project.areaM2?.toString() || '');
          setAreaMl(project.areaMl?.toString() || '');

          setStartDate(project.startDate || '');
          setEndDate(project.endDate || '');
          setStatus(project.status);
          setProgress(project.progress?.toString() || '0');
          setLocation(project.location || '');
          setResident(project.resident || '');
          setDescription(project.description || '');
          
          setCostoDirecto(project.costoDirecto?.toString() || '');
          setGastosGeneralesPorc(project.gastosGeneralesPorc?.toString() || '');
          setUtilidadPorc(project.utilidadPorc?.toString() || '');
        }
      }
    };
    loadProject();
  }, [id]);

  // Calculations
  const cd = parseFloat(costoDirecto) || 0;
  const ggPorc = parseFloat(gastosGeneralesPorc) || 0;
  const utilPorc = parseFloat(utilidadPorc) || 0;

  const gastosGeneralesMonto = cd * (ggPorc / 100);
  const utilidadMonto = cd * (utilPorc / 100);
  const valorReferencial = cd + gastosGeneralesMonto + utilidadMonto;
  const igv = valorReferencial * 0.18;
  const precioTotal = valorReferencial + igv;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleNumberChange = (value: string, setter: (val: string) => void) => {
    // Replace comma with dot
    let clean = value.replace(/,/g, '.');
    // Remove non-numeric/dot
    clean = clean.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    setter(clean);
  };

  const handleCostoDirectoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNumberChange(e.target.value, setCostoDirecto);
  };

  const handleDecimalBlur = (value: string, setter: (val: string) => void) => {
    if (value) {
      const clean = value.replace(/%/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        setter(num.toFixed(2));
      }
    }
  };

  const handleDecimalFocus = (value: string, setter: (val: string) => void) => {
    // No special action needed for simple numeric format, but keeping for consistency if we want to strip anything later
    if (value) {
      setter(value.replace(/%/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save Client Data
      if (client) {
        const existingClient = await db.clients.where('name').equals(client).first();
        const clientTypeMapped = clientType === 'Persona Natural' ? 'Persona' : 
                                 (clientType === 'Persona Juridica' || clientType === 'Entidad Publica') ? 'Empresa' : undefined;
        
        const clientData: Client = {
          name: client,
          email: clientEmail,
          phone: clientPhone,
          type: clientTypeMapped
        };

        if (existingClient) {
           await db.clients.update(existingClient.id!, {
             email: clientEmail || existingClient.email,
             phone: clientPhone || existingClient.phone,
             type: clientTypeMapped || existingClient.type
           });
        } else {
           await db.clients.add(clientData);
        }
      }

      const projectData = {
        name,
        client,
        clientEmail,
        clientPhone,
        address,
        clientType,
        projectType: projectType === 'Otro' ? otroTipoObra : projectType,
        areaM2: parseFloat(areaM2) || 0,
        areaMl: parseFloat(areaMl) || 0,
        costoDirecto: cd,
        gastosGeneralesPorc: ggPorc,
        utilidadPorc: utilPorc,
        startDate,
        endDate,
        status,
        progress: parseFloat(progress) || 0,
        location,
        resident,
        description,
        value: precioTotal,
        balance: 0, // Initial balance
      };

      if (id) {
        // Preserve existing balance if updating
        const existingProject = await db.projects.get(Number(id));
        if (existingProject) {
          projectData.balance = existingProject.balance;
        }
        await db.projects.update(Number(id), projectData);
      } else {
        await db.projects.add(projectData);
      }
      
      // Trigger auto-sync
      await SyncService.pushToRemote(false);

      toast.success('Proyecto guardado correctamente');
      navigate('/projects');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Error al guardar el proyecto');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor} transition-colors duration-150`}>{id ? 'Editar Obra' : 'Registro de Obra'}</h1>
        <button 
          onClick={() => navigate('/projects')}
          className={`text-gray-500 hover:text-gray-700 ${isDark ? 'text-gray-400 hover:text-gray-200' : ''} transition-colors duration-150`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6 md:p-8 transition-colors duration-150`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Nombre de Obra <span className="text-red-500">*</span></label>
              <input 
                required 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Cliente <span className="text-red-500">*</span></label>
              <input 
                required 
                type="text" 
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Email del Cliente</label>
              <input 
                type="email" 
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Número del Cliente</label>
              <input 
                type="tel" 
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Dirección de la obra</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Descripción / Memoria Descriptiva</label>
              <textarea 
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${inputBg} ${inputText} transition-colors duration-150`}
                placeholder="Ingrese una descripción detallada del proyecto..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Tipo de Cliente</label>
              <SearchableSelect
                options={clientTypeOptions}
                value={clientType}
                onChange={setClientType}
                className="w-full"
                placeholder="Seleccione..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Tipo de Obra</label>
              <SearchableSelect
                options={projectTypeOptions}
                value={projectType}
                onChange={setProjectType}
                className="w-full"
                placeholder="Seleccione..."
              />
            </div>

            {projectType === 'Otro' && (
              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Especifique Tipo de Obra</label>
                <input 
                  type="text" 
                  value={otroTipoObra}
                  onChange={(e) => setOtroTipoObra(e.target.value)}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`} 
                />
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Área (m²)</label>
              <input 
                type="text"
                value={areaM2}
                onChange={(e) => handleNumberChange(e.target.value, setAreaM2)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Área (ml)</label>
              <input 
                type="text"
                value={areaMl}
                onChange={(e) => handleNumberChange(e.target.value, setAreaMl)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Fecha de Inicio</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Fecha de Termino</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
              />
            </div>

            {id && (
              <>
                <div>
                  <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Estado</label>
                  <SearchableSelect
                    options={statusOptions}
                    value={status}
                    onChange={setStatus}
                    className="w-full"
                    placeholder="Seleccione..."
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>% de Avance</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={progress}
                    onChange={(e) => handleNumberChange(e.target.value, setProgress)}
                    className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none no-spinner ${inputBg} ${inputText} transition-colors duration-150`}
                  />
                </div>
              </>
            )}
          </div>

          {/* Financials */}
          <div className={`border-t ${borderColor} pt-6 transition-colors duration-150`}>
            <h3 className={`text-lg font-semibold ${textColor} mb-4 transition-colors duration-150`}>Información Económica</h3>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm text-left ${textColor} border-collapse`}>
                <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                  <tr>
                    <th className="px-6 py-3 rounded-tl-lg">Descripción</th>
                    <th className="px-6 py-3 text-center">Porcentaje (%)</th>
                    <th className="px-6 py-3 text-right rounded-tr-lg">Parcial (S/)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                  <tr className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium">Costo Directo</td>
                    <td className="px-6 py-4 text-center text-gray-500">-</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-gray-500">S/</span>
                        <input 
                          type="number" 
                          value={costoDirecto}
                          onChange={handleCostoDirectoChange}
                          disabled={!canEditFinancials}
                          className={`w-32 px-3 py-1 border ${inputBorder} rounded focus:ring-blue-500 focus:border-blue-500 outline-none text-right tabular-nums font-medium no-spinner ${inputBg} ${inputText} transition-colors duration-150 ${!canEditFinancials ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium">Gastos Generales</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <input 
                          type="text" 
                          value={gastosGeneralesPorc}
                          onChange={(e) => handleNumberChange(e.target.value, setGastosGeneralesPorc)}
                          onBlur={() => handleDecimalBlur(gastosGeneralesPorc, setGastosGeneralesPorc)}
                          onFocus={() => handleDecimalFocus(gastosGeneralesPorc, setGastosGeneralesPorc)}
                          disabled={!canEditFinancials}
                          className={`w-20 px-3 py-1 border ${inputBorder} rounded focus:ring-blue-500 focus:border-blue-500 outline-none text-center tabular-nums font-medium ${inputBg} ${inputText} transition-colors duration-150 ${!canEditFinancials ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="0.00" 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">S/ {formatCurrency(gastosGeneralesMonto)}</td>
                  </tr>
                  <tr className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium">Utilidad</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <input 
                          type="text" 
                          value={utilidadPorc}
                          onChange={(e) => handleNumberChange(e.target.value, setUtilidadPorc)}
                          onBlur={() => handleDecimalBlur(utilidadPorc, setUtilidadPorc)}
                          onFocus={() => handleDecimalFocus(utilidadPorc, setUtilidadPorc)}
                          disabled={!canEditFinancials}
                          className={`w-20 px-3 py-1 border ${inputBorder} rounded focus:ring-blue-500 focus:border-blue-500 outline-none text-center tabular-nums font-medium ${inputBg} ${inputText} transition-colors duration-150 ${!canEditFinancials ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">S/ {formatCurrency(utilidadMonto)}</td>
                  </tr>
                  <tr className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} font-semibold`}>
                    <td className="px-6 py-4">Subtotal</td>
                    <td className="px-6 py-4 text-center">-</td>
                    <td className="px-6 py-4 text-right tabular-nums">S/ {formatCurrency(valorReferencial)}</td>
                  </tr>
                  <tr className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium">IGV</td>
                    <td className="px-6 py-4 text-center text-gray-500">18.00%</td>
                    <td className="px-6 py-4 text-right tabular-nums">S/ {formatCurrency(igv)}</td>
                  </tr>
                  <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} font-bold text-lg`}>
                    <td className="px-6 py-4 rounded-bl-lg">Presupuesto Total</td>
                    <td className="px-6 py-4 text-center">-</td>
                    <td className="px-6 py-4 text-right tabular-nums rounded-br-lg text-blue-600 dark:text-blue-400">
                      S/ {formatCurrency(precioTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/projects')}
              className={`px-6 py-2 border ${inputBorder} ${isDark ? 'text-gray-300' : 'text-gray-700'} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Obra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectRegister;