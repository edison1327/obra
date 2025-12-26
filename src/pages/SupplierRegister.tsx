import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { db } from '../db/db';
import { SyncService } from '../services/SyncService';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const SupplierRegister = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const closeBtnColor = isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700';
  const cancelBtnBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const cancelBtnText = isDark ? 'text-gray-300' : 'text-gray-700';
  const cancelBtnHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  // State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Load data if editing
  useEffect(() => {
    const loadSupplier = async () => {
      if (id) {
        const supplier = await db.suppliers.get(Number(id));
        if (supplier) {
          setName(supplier.name);
          setContact(supplier.contact);
          setPhone(supplier.phone);
          setEmail(supplier.email);
          setAddress(supplier.address);
          // notes field is not in interface but Dexie can store it
        }
      }
    };
    loadSupplier();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData = {
        name,
        contact,
        phone,
        email,
        address,
        notes // Optional field, not in interface strictly but good to have
      };

      if (id) {
        await db.suppliers.update(Number(id), supplierData);
      } else {
        await db.suppliers.add(supplierData);
      }

      await SyncService.pushToRemote(false);

      toast.success('Proveedor guardado correctamente');
      navigate('/suppliers');
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Error al guardar el proveedor');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor} transition-colors duration-150`}>{id ? 'Editar Proveedor' : 'Registro de Nuevo Proveedor'}</h1>
        <button 
          onClick={() => navigate('/suppliers')}
          className={`${closeBtnColor} transition-colors duration-150`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6 md:p-8 transition-colors duration-150`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Nombre del Proveedor <span className="text-red-500">*</span></label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Persona de Contacto</label>
            <input 
              type="text" 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Teléfono</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Correo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Dirección</label>
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} transition-colors duration-150`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1 transition-colors duration-150`}>Observaciones</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none h-32 resize-none ${inputBg} ${inputText} transition-colors duration-150`}
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/suppliers')}
              className={`px-6 py-2 border ${cancelBtnBorder} ${cancelBtnText} rounded-lg ${cancelBtnHover} transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierRegister;