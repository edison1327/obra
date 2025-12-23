import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Search, UserCircle, Phone, Mail } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const iconBg = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const cardBorder = isDark ? 'border-gray-700' : 'border-gray-100';

  const clients = useLiveQuery(async () => {
    const projects = await db.projects.toArray();
    const uniqueClients = new Map();
    
    projects.forEach(p => {
      if (!uniqueClients.has(p.client)) {
        uniqueClients.set(p.client, {
          name: p.client,
          email: p.clientEmail,
          phone: p.clientPhone,
          // We don't have client specific address in project, using project location as proxy or N/A
          // Actually project has 'address' (Obra address) and 'location'.
          // We'll leave address empty or show 'N/A'
        });
      }
    });
    return Array.from(uniqueClients.values());
  }) || [];

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor} transition-colors duration-150`}>Clientes</h1>

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
          filteredClients.map((client, i) => (
            <div key={i} className={`${cardBg} p-6 rounded-lg shadow-sm hover:shadow-md transition duration-150 border ${cardBorder}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center transition-colors duration-150`}>
                  <UserCircle size={32} className={subTextColor} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${textColor} transition-colors duration-150`}>{client.name}</h3>
                  <p className={`text-sm ${subTextColor} transition-colors duration-150`}>Cliente</p>
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
    </div>
  );
};

export default Clients;
