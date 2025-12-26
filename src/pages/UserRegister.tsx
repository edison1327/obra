import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Shield, Eye, EyeOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import SearchableSelect from '../components/SearchableSelect';
import { SyncService } from '../services/SyncService';

const UserRegister = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { id } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    status: 'Activo',
    projectId: ''
  });

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const infoBoxBg = isDark ? 'bg-blue-900/20' : 'bg-blue-50';
  const infoBoxText = isDark ? 'text-blue-300' : 'text-blue-800';
  const infoBoxSubText = isDark ? 'text-blue-400' : 'text-blue-600';
  const closeButtonColor = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700';
  const cancelButtonHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const roles = useLiveQuery(
    () => db.roles.where('status').equals('Activo').toArray(),
    []
  );
  const projects = useLiveQuery(
    () => db.projects.where('status').anyOf(['En Ejecución', 'En Planificación']).toArray(),
    []
  ) || [];

  const roleOptions = roles?.map(role => ({ value: role.name, label: role.name })) || [];

  useEffect(() => {
    if (id) {
      db.users.get(Number(id)).then(user => {
        if (user) {
          setFormData({
            name: user.name,
            username: user.username,
            email: user.email,
            password: user.password || '',
            confirmPassword: user.password || '',
            role: user.role,
            status: user.status,
            projectId: user.projectId || ''
          });
        }
      });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, status: e.target.checked ? 'Activo' : 'Inactivo' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      const user = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role as any,
        status: formData.status as any,
        projectId: formData.projectId
      };

      if (id) {
        await db.users.update(Number(id), user);
      } else {
        await db.users.add(user);
      }
      await SyncService.pushToRemote(false);
      toast.success('Usuario guardado correctamente');
      navigate('/users');
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Error al guardar usuario');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {id ? 'Editar Usuario' : 'Registro de Usuario'}
        </h1>
        <button 
          onClick={() => navigate('/users')}
          className={`${closeButtonColor}`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6 md:p-8`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`flex items-center gap-4 p-4 ${infoBoxBg} rounded-lg ${infoBoxText} mb-6`}>
            <Shield size={24} />
            <div>
              <h3 className="font-bold">Permisos y Roles</h3>
              <p className={`text-sm ${infoBoxSubText}`}>Asigne el rol adecuado según las funciones del usuario.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre Completo</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="Ej: Juan Perez" 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre de Usuario</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="jperez" 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Correo Electrónico</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="juan@empresa.com" 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!id}
                  className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none pr-10 ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                  placeholder="••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Confirmar Contraseña</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required={!id}
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="••••••••" 
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Rol de Usuario</label>
              <SearchableSelect
                options={roleOptions}
                value={formData.role}
                onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                className="w-full"
                placeholder="Seleccione un rol..."
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Obra Asignada</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Seleccione una obra...' },
                  ...projects.map(p => ({
                    value: p.id?.toString() || '',
                    label: `${p.name} (${p.status})`
                  }))
                ]}
                value={formData.projectId}
                onChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                className="w-full"
              />
              <p className={`mt-1 text-xs ${infoBoxSubText}`}>
                Solo se muestran obras en estado En Ejecución y En Planificación.
              </p>
            </div>

             <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.status === 'Activo'}
                  onChange={handleCheckboxChange}
                  className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
                />
                <span className={`text-sm ${labelColor}`}>Usuario Activo</span>
              </label>
            </div>
          </div>

          <div className={`flex items-center justify-end gap-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} mt-6`}>
            <button 
              type="button" 
              onClick={() => navigate('/users')}
              className={`px-6 py-2 border ${borderColor} ${labelColor} rounded-lg ${cancelButtonHover} transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              {id ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegister;
