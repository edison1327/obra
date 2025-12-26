import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { db, Worker } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { SyncService } from '../services/SyncService';
import { Camera, User, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workerId: number) => void;
  workerToEdit?: Worker | null;
}

const WorkerModal: React.FC<WorkerModalProps> = ({ isOpen, onClose, onSuccess, workerToEdit }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const projects = useLiveQuery(() => db.projects.where('status').notEqual('Finalizado').toArray()) || [];
  const roles = useLiveQuery(() => db.workerRoles.toArray()) || [];

  const [formData, setFormData] = useState({
    name: '',
    role: 'Peon',
    documentNumber: '',
    dailyRate: '',
    photo: '',
    projectId: ''
  });
  
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (workerToEdit) {
        // Check if role is in the list
        const roleExists = roles.some(r => r.name === workerToEdit.role);
        
        setFormData({
          name: workerToEdit.name,
          role: roleExists ? workerToEdit.role : 'Otro',
          documentNumber: workerToEdit.documentNumber || '',
          dailyRate: workerToEdit.dailyRate?.toString() || '',
          photo: workerToEdit.photo || '',
          projectId: workerToEdit.projectId || ''
        });
        
        if (!roleExists && workerToEdit.role) {
          setCustomRole(workerToEdit.role);
          setIsCustomRole(true);
        } else {
          setCustomRole('');
          setIsCustomRole(false);
        }
      } else {
        setFormData({
          name: '',
          role: 'Peon',
          documentNumber: '',
          dailyRate: '',
          photo: '',
          projectId: ''
        });
        setCustomRole('');
        setIsCustomRole(false);
      }
    }
  }, [isOpen, workerToEdit, roles]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, role: value }));
    if (value === 'Otro') {
      setIsCustomRole(true);
    } else {
      setIsCustomRole(false);
      setCustomRole('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen válido');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, photo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalRole = formData.role;
      
      // Handle custom role
      if (isCustomRole) {
        if (!customRole.trim()) {
          toast.error('Por favor especifique el cargo');
          return;
        }
        finalRole = customRole.trim();
        
        // Add new role to DB if it doesn't exist (case insensitive check)
        const roleExists = roles.some(r => r.name.toLowerCase() === finalRole.toLowerCase());
        if (!roleExists) {
          await db.workerRoles.add({ name: finalRole });
        }
      }

      let id;
      const workerData = {
        name: formData.name,
        role: finalRole,
        documentNumber: formData.documentNumber,
        dailyRate: formData.dailyRate ? Number(formData.dailyRate) : 0,
        photo: formData.photo,
        projectId: formData.projectId || undefined,
        status: workerToEdit?.status || 'Activo'
      };

      if (workerToEdit && workerToEdit.id) {
        await db.workers.update(workerToEdit.id, workerData);
        id = workerToEdit.id;
        toast.success('Trabajador actualizado correctamente');
      } else {
        // @ts-ignore
        id = await db.workers.add(workerData);
        toast.success('Trabajador registrado correctamente');
      }
      
      await SyncService.pushToRemote(false);
      
      onSuccess(id as number);
      onClose();
    } catch (error) {
      console.error('Error al guardar trabajador:', error);
      toast.error('Error al guardar el trabajador');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={workerToEdit ? "Editar Trabajador" : "Nuevo Trabajador"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'} flex items-center justify-center`}>
              {formData.photo ? (
                <img src={formData.photo} alt="Foto del trabajador" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
              )}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg transition-colors"
              title="Subir foto"
            >
              <Camera size={16} />
            </button>

            {formData.photo && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg transition-colors transform translate-x-1/4 -translate-y-1/4 z-10"
                title="Eliminar foto"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <span className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Foto (Opcional, máx 2MB)
          </span>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Nombre Completo <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Obra / Proyecto</label>
          <SearchableSelect
            options={[
              { value: "", label: "Seleccionar Obra (Opcional)" },
              ...projects.map(project => ({
                value: project.id?.toString() || '',
                label: project.name ? project.name.charAt(0).toUpperCase() + project.name.slice(1).toLowerCase() : ''
              }))
            ]}
            value={formData.projectId}
            onChange={(val) => setFormData({ ...formData, projectId: val as string })}
            className="w-full mt-1"
            placeholder="Seleccionar Obra (Opcional)"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>DNI / Documento</label>
          <input
            type="text"
            value={formData.documentNumber}
            onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={isCustomRole ? "col-span-2" : ""}>
            <label className={`block text-sm font-medium ${labelColor}`}>Cargo / Rol</label>
            <div className="flex gap-2">
              <select
                value={formData.role}
                onChange={handleRoleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
                <option value="Otro">Otro</option>
              </select>
              {isCustomRole && (
                 <input
                   type="text"
                   placeholder="Especifique cargo"
                   value={customRole}
                   onChange={e => setCustomRole(e.target.value)}
                   className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
                   autoFocus
                 />
              )}
            </div>
          </div>
          <div className={isCustomRole ? "col-span-2" : ""}>
            <label className={`block text-sm font-medium ${labelColor}`}>Jornal Diario (S/)</label>
            <input
              type="number"
              step="0.01"
              value={formData.dailyRate}
              onChange={e => setFormData({ ...formData, dailyRate: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className={`mr-2 px-4 py-2 text-sm font-medium rounded-md ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {workerToEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkerModal;
