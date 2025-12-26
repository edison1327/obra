import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, UserCircle, Phone, Mail, Plus, Edit, Trash2, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, Client } from '../db/db';
import { SyncService } from '../services/SyncService';
import ClientModal from '../components/ClientModal';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { theme } = useTheme();
  const { hasPermission } = useAuth();

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const iconBg = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const cardBorder = isDark ? 'border-gray-700' : 'border-gray-100';

  const clients = useLiveQuery(() => db.clients.toArray()) || [];

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await db.clients.delete(deleteId);
        await SyncService.pushToRemote(false);
        toast.success('Cliente eliminado correctamente');
        setDeleteId(null);
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        toast.error('Error al eliminar el cliente');
      }
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor} transition-colors duration-150`}>Clientes</h1>
        <button 
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      <div className={`${cardBg} p-4 rounded-lg shadow-sm transition-colors duration-150`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${inputBorder} rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${inputText} placeholder-gray-400 transition-colors duration-150`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
           <div className={`col-span-full text-center py-10 ${subTextColor} transition-colors duration-150`}>
             No se encontraron clientes.
           </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition duration-150 border ${cardBorder} group relative`}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasPermission('clients.edit') && (
                  <button
                    onClick={() => handleEdit(client)}
                    className={`p-1.5 rounded-full ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-blue-400' : 'bg-gray-100 hover:bg-gray-200 text-blue-600'} transition-colors`}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {hasPermission('clients.delete') && (
                  <button
                    onClick={() => setDeleteId(client.id!)}
                    className={`p-1.5 rounded-full ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-red-400' : 'bg-gray-100 hover:bg-gray-200 text-red-600'} transition-colors`}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center transition-colors duration-150`}>
                  {client.type === 'Empresa' ? (
                    <Building size={24} className={subTextColor} />
                  ) : (
                    <UserCircle size={32} className={subTextColor} />
                  )}
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${textColor} transition-colors duration-150`}>{client.name}</h3>
                  <p className={`text-sm ${subTextColor} transition-colors duration-150`}>{client.type || 'Cliente'}</p>
                </div>
              </div>
              
              <div className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-150`}>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{client.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span>{client.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSuccess={handleSuccess}
        clientToEdit={editingClient}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Cliente"
        message="¿Está seguro de eliminar este cliente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default Clients;
