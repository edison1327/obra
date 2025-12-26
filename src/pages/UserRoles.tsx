import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';

const UserRoles = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-300';
  const tableHeaderBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const rowHoverBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const divideColor = isDark ? 'divide-gray-700' : 'divide-gray-200';

  // Fetch roles from DB
  const roles = useLiveQuery(
    () => db.roles.toArray().then(roles => 
      roles.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    ),
    [searchTerm]
  );

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };


  const confirmDelete = async () => {
    if (deleteModal.id) {
      await db.roles.delete(deleteModal.id);
      await SyncService.pushToRemote(false);
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/user-roles/edit/${id}`);
  };

  const resourceLabels: Record<string, string> = {
    all: 'Control Total',
    projects: 'Obras',
    inventory: 'Inventario',
    transactions: 'Finanzas',
    users: 'Usuarios',
    payrolls: 'Planillas',
    loans: 'Préstamos',
    clients: 'Clientes',
    read: 'Dashboard',
    reports: 'Reportes',
    settings: 'Configuración',
    workers: 'Trabajadores',
    dailyLogs: 'Partes Diarios',
    attendance: 'Asistencia',
    categories: 'Rubros',
    suppliers: 'Proveedores'
  };

  const actionLabels: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar'
  };

  const renderPermissions = (permissions: string[] = []) => {
    if (!permissions.length) return <span className="text-xs text-gray-500">Sin permisos</span>;
    
    // Group permissions
    const groups: Record<string, string[]> = {};
    const general: string[] = [];

    permissions.forEach(perm => {
      if (perm.includes('.')) {
        const [resource, action] = perm.split('.');
        if (!groups[resource]) groups[resource] = [];
        groups[resource].push(action);
      } else {
        general.push(perm);
      }
    });

    return (
      <div className="flex flex-col gap-1">
        {general.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {general.map(perm => (
              <span key={perm} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                {resourceLabels[perm] || perm}
              </span>
            ))}
          </div>
        )}
        {Object.entries(groups).map(([resource, actions]) => {
          const allActions = ['view', 'create', 'edit', 'delete'];
          const hasAll = allActions.every(a => actions.includes(a));
          
          return (
            <div key={resource} className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${subTextColor}`}>{resourceLabels[resource] || resource}:</span>
              {hasAll ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                  Control Total
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {actions.map(action => (
                    <span key={action} className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                      {actionLabels[action] || action}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Roles de Usuario</h1>
        <Link
          to="/user-roles/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuevo Rol
        </Link>
      </div>

      {/* Search */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${borderColor} rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Eliminar Rol"
        message="¿Está seguro de eliminar este rol? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Roles List */}
      <div className={`${cardBg} rounded-lg shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${divideColor}`}>
            <thead className={tableHeaderBg}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Nombre del Rol</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Descripción</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Permisos</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y ${divideColor}`}>
              {roles?.map((role) => (
                <tr key={role.id} className={`${rowHoverBg} transition-colors duration-150`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center ${subTextColor}`}>
                        <Shield size={20} />
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{role.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                    {role.description}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                    {renderPermissions(role.permissions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      role.status === 'Activo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {role.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium`}>
                    <div className="flex items-center justify-end gap-2">
                      {hasPermission('users.edit') && (
                        <button
                          onClick={() => handleEdit(role.id!)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {hasPermission('users.delete') && (
                        <button
                          onClick={() => handleDelete(role.id!)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserRoles;
