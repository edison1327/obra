import React, { useState } from 'react';
import Modal from './Modal';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { SyncService } from '../services/SyncService';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplierId: number) => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await db.suppliers.add({
        ...formData
      });
      await SyncService.pushToRemote(false);
      toast.success('Proveedor registrado correctamente');
      onSuccess(id as number);
      setFormData({
        name: '',
        contact: '',
        phone: '',
        email: '',
        address: ''
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      toast.error('Error al guardar el proveedor');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Proveedor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Razón Social / Nombre</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Contacto</label>
          <input
            type="text"
            value={formData.contact}
            onChange={e => setFormData({ ...formData, contact: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${labelColor}`}>Teléfono</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor}`}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${labelColor}`}>Dirección</label>
          <input
            type="text"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${inputBg} ${inputBorder} ${inputText} border p-2`}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 border rounded-md ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierModal;
