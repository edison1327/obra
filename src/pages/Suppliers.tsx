import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Suppliers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();
  const { hasPermission } = useAuth();
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const emptyStateColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBorderColor = isDark ? 'border-gray-700' : 'border-gray-100';
  const itemTextColor = isDark ? 'text-gray-300' : 'text-gray-600';

  const suppliers = useLiveQuery(() => 
    db.suppliers
      .filter(s => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (s.name || '').toLowerCase().includes(term) ||
          (s.contact || '').toLowerCase().includes(term) ||
          (s.phone || '').toLowerCase().includes(term) ||
          (s.email || '').toLowerCase().includes(term) ||
          (s.address || '').toLowerCase().includes(term) ||
          (s.notes || '').toLowerCase().includes(term)
        );
      })
      .toArray(),
    [searchTerm]
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textColor}`}>Panel de Proveedores</h1>
        {hasPermission('suppliers.create') && (
          <Link
            to="/suppliers/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Nuevo Proveedor
          </Link>
        )}
      </div>

      {/* Search */}
      <div className={`${cardBg} p-4 rounded-lg shadow-sm`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${borderColor} rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${isDark ? 'text-white placeholder-gray-400' : 'placeholder-gray-400'}`}
          />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.length === 0 ? (
           <div className={`col-span-full text-center py-10 ${emptyStateColor}`}>
             No se encontraron proveedores.
           </div>
        ) : (
          suppliers.map((supplier) => (
            <div key={supplier.id} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition border ${cardBorderColor}`}>
              <h3 className={`text-lg font-bold ${textColor} mb-2`}>{supplier.name}</h3>
              <p className={`text-sm ${subTextColor} mb-4`}>Contacto: {supplier.contact}</p>
              
              <div className={`space-y-2 text-sm ${itemTextColor}`}>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{supplier.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span>{supplier.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{supplier.address || 'N/A'}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                  {hasPermission('suppliers.edit') && (
                    <Link to={`/suppliers/edit/${supplier.id}`} className={`text-blue-600 ${isDark ? 'text-blue-400' : ''} text-sm hover:underline`}>Editar</Link>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Suppliers;
