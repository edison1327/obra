import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Shield, User } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { hasPermission } = useAuth();
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-300';
  const tableHeaderBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const rowHoverBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const divideColor = isDark ? 'divide-gray-700' : 'divide-gray-200';

  // Fetch users from DB
  const users = useLiveQuery(
    () => db.users.toArray().then(users => 
      users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    ),
    [searchTerm]
  );

  const handleDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await db.users.delete(deleteModal.id);
      await SyncService.pushToRemote(false);
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/users/edit/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className={`text-2xl font-bold ${textColor}`}>Gestión de Usuarios</h1>
          {hasPermission('users.create') && (
            <Link
              to="/users/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nuevo Usuario
            </Link>
          )}
        </div>

      {/* Search */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar usuario..."
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
        title="Eliminar Usuario"
        message="¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Users List */}
      <div className={`${cardBg} rounded-lg shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${divideColor}`}>
            <thead className={tableHeaderBg}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Usuario</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Rol</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Email</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Estado</th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${subTextColor} uppercase tracking-wider`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`${cardBg} divide-y ${divideColor}`}>
              {users?.map((user) => (
                <tr key={user.id} className={`${rowHoverBg} transition-colors duration-150`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center ${subTextColor}`}>
                        <User size={20} />
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</div>
                        <div className={`text-sm ${subTextColor}`}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                      <Shield size={16} className="mr-2 text-blue-500" />
                      {user.role}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${subTextColor}`}>
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'Activo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {hasPermission('users.edit') && (
                        <button 
                          onClick={() => handleEdit(user.id!)}
                          className={`text-gray-400 hover:text-indigo-600 ${isDark ? 'hover:text-indigo-400' : ''}`} 
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {hasPermission('users.delete') && (
                        <button 
                          onClick={() => handleDelete(user.id!)}
                          className={`text-gray-400 hover:text-red-600 ${isDark ? 'hover:text-red-400' : ''}`} 
                          title="Eliminar"
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

export default Users;
