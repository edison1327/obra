import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { db, Client } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { User, Phone, Mail, MapPin, Building } from 'lucide-react';
import { SyncService } from '../services/SyncService';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSuccess, clientToEdit }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  const [formData, setFormData] = useState<Client>({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'Empresa'
  });

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setFormData({
          id: clientToEdit.id,
          name: clientToEdit.name,
          email: clientToEdit.email || '',
          phone: clientToEdit.phone || '',
          address: clientToEdit.address || '',
          type: clientToEdit.type || 'Empresa'
        });
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          type: 'Empresa'
        });
      }
    }
  }, [isOpen, clientToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clientToEdit && clientToEdit.id) {
        await db.clients.update(clientToEdit.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await db.clients.add(formData);
        toast.success('Cliente registrado correctamente');
      }
      await SyncService.pushToRemote(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      toast.error('Error al guardar el cliente');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={clientToEdit ? "Editar Cliente" : "Nuevo Cliente"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Tipo de Cliente</label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="Empresa"
                checked={formData.type === 'Empresa'}
                onChange={() => setFormData({ ...formData, type: 'Empresa' })}
                className="mr-2"
              />
              <span className={inputText}>Empresa</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="Persona"
                checked={formData.type === 'Persona'}
                onChange={() => setFormData({ ...formData, type: 'Persona' })}
                className="mr-2"
              />
              <span className={inputText}>Persona</span>
            </label>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Nombre / Razón Social <span className="text-red-500">*</span></label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {formData.type === 'Empresa' ? <Building size={16} className="text-gray-400" /> : <User size={16} className="text-gray-400" />}
            </div>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`block w-full pl-10 rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
              placeholder={formData.type === 'Empresa' ? "Ej. Constructora SAC" : "Ej. Juan Perez"}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Teléfono</label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} className="text-gray-400" />
            </div>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className={`block w-full pl-10 rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Correo Electrónico</label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-gray-400" />
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={`block w-full pl-10 rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Dirección</label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className={`block w-full pl-10 rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
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
            {clientToEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;
