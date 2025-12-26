import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SyncService } from '../services/SyncService';
import { ArrowLeft, Save, Upload, X, Check, Clock, AlertCircle, Package, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import toast from 'react-hot-toast';

const DailyLogRegister = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';

  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Soleado');
  const [activities, setActivities] = useState('');
  const [incidents, setIncidents] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Materials State
  const [usedMaterials, setUsedMaterials] = useState<{
    materialId: number;
    name: string;
    quantity: number;
    unit: string;
  }[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');

  // Attendance State
  const [attendanceList, setAttendanceList] = useState<{
    workerId: number;
    workerName: string;
    workerRole: string;
    status: 'Presente' | 'Falta' | 'Tardanza' | 'Permiso' | 'Baja' | 'Descanso';
    notes: string;
  }[]>([]);

  const projects = useLiveQuery(async () => {
    const all = await db.projects.where('status').anyOf('En Ejecución', 'En Planificación', 'Atrasado').toArray();
    if (user?.projectId) {
      return all.filter(p => p.id === Number(user.projectId));
    }
    return all;
  }, [user?.projectId]) || [];

  const projectOptions = projects.map(p => ({ value: p.id!.toString(), label: p.name }));

  // Load Inventory for Project
  const inventory = useLiveQuery(async () => {
    if (!projectId) return [];
    return await db.inventory.where('projectId').equals(projectId).toArray();
  }, [projectId]) || [];

  const inventoryOptions = inventory.map(i => ({ 
    value: i.id!.toString(), 
    label: `${i.name} (Stock: ${i.quantity} ${i.unit})` 
  }));

  const handleAddMaterial = () => {
    if (!selectedMaterialId || !materialQuantity) {
        toast.error('Seleccione un material y la cantidad');
        return;
    }
    
    const item = inventory.find(i => i.id!.toString() === selectedMaterialId);
    if (!item) return;

    const qty = parseFloat(materialQuantity);
    if (isNaN(qty) || qty <= 0) {
        toast.error('Cantidad inválida');
        return;
    }

    // Check if already added
    if (usedMaterials.some(m => m.materialId === item.id)) {
        toast.error('Este material ya fue agregado a la lista');
        return;
    }

    setUsedMaterials([...usedMaterials, {
        materialId: item.id!,
        name: item.name,
        quantity: qty,
        unit: item.unit
    }]);

    setSelectedMaterialId('');
    setMaterialQuantity('');
  };

  const removeMaterial = (index: number) => {
    setUsedMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // Initialize Project
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      if (user?.projectId) {
        setProjectId(user.projectId.toString());
      } else {
        setProjectId(projects[0].id!.toString());
      }
    }
  }, [projects, user?.projectId, projectId]);

  // Load Workers when project changes
  useEffect(() => {
    const loadWorkers = async () => {
      if (!projectId) return;
      
      // Get all active workers assigned to this project (or all if not strictly assigned, but usually better to filter)
      // Assuming workers have projectId if assigned, or if undefined they are available?
      // For now, let's get all 'Activo' workers. If you implemented worker-project assignment strictly, filter here.
      // Based on previous context, workers might not have projectId strictly set in DB yet for all.
      // Let's check DB schema. Version 10 added projectId to workers.
      
      const workers = await db.workers
        .where('status').equals('Activo')
        .toArray();
        
      // Filter strictly if worker has projectId, or include all?
      // Usually, in construction, workers move. Let's filter by those assigned to this project OR unassigned?
      // Simplification: Show ALL active workers, user marks who is present. 
      // OR better: Only show workers assigned to this project if the field is populated.
      
      // Let's try to filter by projectId if it exists on worker.
      const projectWorkers = workers.filter(w => !w.projectId || w.projectId.toString() === projectId);

      setAttendanceList(projectWorkers.map(w => ({
        workerId: w.id!,
        workerName: w.name,
        workerRole: w.role,
        status: 'Presente', // Default
        notes: ''
      })));
    };

    loadWorkers();
  }, [projectId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = (index: number, status: any) => {
    const newList = [...attendanceList];
    newList[index].status = status;
    setAttendanceList(newList);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const newList = [...attendanceList];
    newList[index].notes = notes;
    setAttendanceList(newList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      toast.error('Seleccione una obra');
      return;
    }

    try {
      await db.transaction('rw', db.dailyLogs, db.attendance, db.inventory, async () => {
          // 1. Save Daily Log
          const logId = await db.dailyLogs.add({
            projectId,
            date,
            activities,
            incidents,
            weather,
            photos,
            usedMaterials // Add used materials to the log
          });

          // 2. Save Attendance
          const attendanceRecords = attendanceList.map(a => ({
            projectId,
            dailyLogId: logId as number,
            workerId: a.workerId,
            workerName: a.workerName,
            workerRole: a.workerRole,
            date,
            status: a.status,
            notes: a.notes
          }));

          await db.attendance.bulkAdd(attendanceRecords);

      });

      await SyncService.pushToRemote(false);
      toast.success('Reporte diario guardado correctamente');
      navigate('/daily-logs');
    } catch (error) {
      console.error('Error saving daily log:', error);
      toast.error('Error al guardar el reporte');
    }
  };

  const statusColors = {
    'Presente': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Falta': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Tardanza': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Permiso': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Baja': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Descanso': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/daily-logs')}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${subTextColor}`}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={`text-2xl font-bold ${textColor}`}>Nuevo Reporte Diario</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. General Info */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
          <h2 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
            <Clock size={20} className="text-blue-500" />
            Información General
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Clima</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
              >
                <option value="Soleado">Soleado</option>
                <option value="Nublado">Nublado</option>
                <option value="Lluvia">Lluvia</option>
                <option value="Variable">Variable</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Attendance */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
              <Check size={20} className="text-green-500" />
              Control de Asistencia
            </h2>
            <div className={`text-sm ${subTextColor}`}>
              {attendanceList.length} Trabajadores
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-xs font-medium ${subTextColor} uppercase tracking-wider border-b ${borderColor}`}>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderColor}`}>
                {attendanceList.map((item, index) => (
                  <tr key={item.workerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className={`px-4 py-3 font-medium ${textColor}`}>{item.workerName}</td>
                    <td className={`px-4 py-3 text-sm ${subTextColor}`}>{item.workerRole}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(index, e.target.value)}
                        className={`text-sm rounded-full px-3 py-1 border-0 cursor-pointer font-medium focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${statusColors[item.status]}`}
                      >
                        <option value="Presente" className="bg-white text-gray-900">Presente</option>
                        <option value="Falta" className="bg-white text-gray-900">Falta</option>
                        <option value="Tardanza" className="bg-white text-gray-900">Tardanza</option>
                        <option value="Permiso" className="bg-white text-gray-900">Permiso</option>
                        <option value="Descanso" className="bg-white text-gray-900">Descanso</option>
                        <option value="Baja" className="bg-white text-gray-900">Baja</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        placeholder="Observaciones..."
                        className={`w-full bg-transparent border-b ${inputBorder} focus:border-blue-500 focus:outline-none text-sm ${textColor}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Materials Used */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
              <Package size={20} className="text-orange-500" />
              Control de Materiales
            </h2>
            <div className={`text-sm ${subTextColor}`}>
              {usedMaterials.length} Items
            </div>
          </div>

          {/* Add Material Form */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
             <div className="flex-1">
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Material</label>
                <SearchableSelect
                    options={inventoryOptions}
                    value={selectedMaterialId}
                    onChange={setSelectedMaterialId}
                    className="w-full"
                    placeholder="Buscar material..."
                />
             </div>
             <div className="w-32">
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Cantidad</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500`}
                    placeholder="0.00"
                />
             </div>
             <button
                type="button"
                onClick={handleAddMaterial}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 h-[42px]"
             >
                <Plus size={20} />
                Agregar
             </button>
          </div>

          {/* Materials Table */}
          {usedMaterials.length > 0 && (
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                    <tr className={`text-left text-xs font-medium ${subTextColor} uppercase tracking-wider border-b ${borderColor}`}>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${borderColor}`}>
                    {usedMaterials.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className={`px-4 py-3 font-medium ${textColor}`}>{item.name}</td>
                        <td className={`px-4 py-3 ${textColor}`}>{item.quantity}</td>
                        <td className={`px-4 py-3 ${subTextColor}`}>{item.unit}</td>
                        <td className="px-4 py-3 text-right">
                        <button
                            type="button"
                            onClick={() => removeMaterial(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                        >
                            <Trash2 size={18} />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </div>

        {/* 4. Activities & Incidents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
            <h2 className={`text-lg font-bold ${textColor} mb-4`}>Actividades Realizadas</h2>
            <textarea
              required
              rows={6}
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              placeholder="Describa las actividades realizadas hoy..."
              className={`w-full p-3 rounded-lg border ${inputBorder} ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 resize-none`}
            ></textarea>
          </div>

          <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
            <h2 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
              <AlertCircle size={20} className="text-red-500" />
              Incidentes / Observaciones
            </h2>
            <textarea
              rows={6}
              value={incidents}
              onChange={(e) => setIncidents(e.target.value)}
              placeholder="Describa incidentes, retrasos o material faltante..."
              className={`w-full p-3 rounded-lg border ${inputBorder} ${inputBg} ${textColor} focus:ring-2 focus:ring-red-500 resize-none`}
            ></textarea>
          </div>
        </div>

        {/* 4. Photos */}
        <div className={`${cardBg} p-6 rounded-lg shadow-sm border ${borderColor}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${textColor}`}>Registro Fotográfico</h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
            >
              <Upload size={18} />
              Subir Fotos
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                No hay fotos adjuntas
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/daily-logs')}
            className={`px-6 py-2 border ${inputBorder} rounded-lg ${subTextColor} hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg"
          >
            <Save size={20} />
            Guardar Reporte
          </button>
        </div>

      </form>
    </div>
  );
};

export default DailyLogRegister;