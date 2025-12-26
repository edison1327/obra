import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Shield, Check } from 'lucide-react';
import { db } from '../db/db';
import { SyncService } from '../services/SyncService';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const UserRoleRegister = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Activo',
    permissions: [] as string[]
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

  const resourceLabels: Record<string, string> = {
    projects: 'Obras',
    dailyLogs: 'Cuaderno de Obra',
    workers: 'Personal',
    attendance: 'Asistencia',
    inventory: 'Inventario',
    transactions: 'Finanzas',
    users: 'Usuarios',
    payrolls: 'Planillas',
    loans: 'Préstamos',
    clients: 'Clientes',
    suppliers: 'Proveedores',
    categories: 'Categorías',
    settings: 'Configuración',
    reports: 'Reportes'
  };

  const actionLabels: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar'
  };

  const resources = Object.keys(resourceLabels);
  const actions = Object.keys(actionLabels);

  useEffect(() => {
    if (id) {
      db.roles.get(Number(id)).then(role => {
        if (role) {
          setFormData({
            name: role.name,
            description: role.description,
            status: role.status,
            permissions: role.permissions || []
          });
        }
      });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, status: e.target.checked ? 'Activo' : 'Inactivo' }));
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const toggleResourceAction = (resourceId: string, actionId: string) => {
    const permId = `${resourceId}.${actionId}`;
    togglePermission(permId);
  };

  const toggleAllResource = (resourceId: string) => {
    const allActions = actions.map(a => `${resourceId}.${a}`);
    const hasAll = allActions.every(a => formData.permissions.includes(a));
    
    setFormData(prev => {
      let newPerms = [...prev.permissions];
      if (hasAll) {
        newPerms = newPerms.filter(p => !allActions.includes(p));
      } else {
        // Add missing ones
        allActions.forEach(a => {
          if (!newPerms.includes(a)) newPerms.push(a);
        });
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const role = {
        name: formData.name,
        description: formData.description,
        status: formData.status as any,
        permissions: formData.permissions
      };

      if (id) {
        await db.roles.update(Number(id), role);
      } else {
        await db.roles.add(role);
      }
      await SyncService.pushToRemote(false);
      toast.success('Rol guardado correctamente');
      navigate('/user-roles');
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Error al guardar rol');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {id ? 'Editar Rol' : 'Registro de Nuevo Rol'}
        </h1>
        <button 
          onClick={() => navigate('/user-roles')}
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
              <h3 className="font-bold">Definición del Rol</h3>
              <p className={`text-sm ${infoBoxSubText}`}>Configure los permisos y accesos para este rol de usuario.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre del Rol</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="Ej: Supervisor de Obra" 
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Descripción</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                placeholder="Descripción de las responsabilidades de este rol..." 
              />
            </div>

            <div className="mb-6">
              <h2 className={`text-lg font-medium ${textColor} mb-4`}>Permisos del Sistema</h2>
              
              {/* General Permissions */}
              <div className={`p-4 rounded-lg border ${borderColor} ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} mb-6`}>
                <h3 className={`font-medium ${textColor} mb-3`}>General</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group w-fit">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.permissions.includes('all') 
                        ? 'bg-blue-600 border-blue-600' 
                        : `${inputBg} ${borderColor} group-hover:border-blue-400`
                    }`}>
                      {formData.permissions.includes('all') && <Check size={14} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.permissions.includes('all')}
                      onChange={() => togglePermission('all')}
                    />
                    <span className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Control Total (Admin)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group w-fit">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.permissions.includes('view_dashboard') 
                        ? 'bg-blue-600 border-blue-600' 
                        : `${inputBg} ${borderColor} group-hover:border-blue-400`
                    }`}>
                      {formData.permissions.includes('view_dashboard') && <Check size={14} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.permissions.includes('view_dashboard')}
                      onChange={() => togglePermission('view_dashboard')}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Ver Dashboard
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                {resources.map((resource) => (
                  <div key={resource} className={`p-4 rounded-lg border ${borderColor} ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium ${textColor} capitalize`}>{resourceLabels[resource]}</h3>
                      <button
                        type="button"
                        onClick={() => toggleAllResource(resource)}
                        className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors`}
                      >
                        Alternar Todo
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {actions.map((action) => {
                        const permId = `${resource}.${action}`;
                        const isChecked = formData.permissions.includes(permId);
                        return (
                          <label key={permId} className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isChecked 
                                ? 'bg-blue-600 border-blue-600' 
                                : `${inputBg} ${borderColor} group-hover:border-blue-400`
                            }`}>
                              {isChecked && <Check size={14} className="text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isChecked}
                              onChange={() => toggleResourceAction(resource, action)}
                            />
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {actionLabels[action]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

             <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.status === 'Activo'}
                  onChange={handleStatusChange}
                  className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
                />
                <span className={`text-sm ${labelColor}`}>Rol Activo</span>
              </label>
            </div>
          </div>

          <div className={`flex items-center justify-end gap-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} mt-6`}>
            <button 
              type="button" 
              onClick={() => navigate('/user-roles')}
              className={`px-6 py-2 border ${borderColor} ${labelColor} rounded-lg ${cancelButtonHover} transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              {id ? 'Guardar Cambios' : 'Crear Rol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRoleRegister;
