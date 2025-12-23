import React, { useRef, useState } from 'react';
import { db } from '../db/db';
import { Download, Upload, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  const handleExport = async () => {
    try {
      const data = {
        projects: await db.projects.toArray(),
        inventory: await db.inventory.toArray(),
        transactions: await db.transactions.toArray(),
        suppliers: await db.suppliers.toArray(),
        returns: await db.returns.toArray(),
        categories: await db.categories.toArray(),
        users: await db.users.toArray(),
        exportDate: new Date().toISOString(),
        version: 1
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `obras_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setShowImportConfirm(true);
  };

  const executeImport = async () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.version || !data.projects) {
          throw new Error('Formato de archivo inválido');
        }

        await db.transaction('rw', [db.projects, db.inventory, db.transactions, db.suppliers, db.returns, db.categories, db.users], async () => {
          // Clear all tables
          await Promise.all([
            db.projects.clear(),
            db.inventory.clear(),
            db.transactions.clear(),
            db.suppliers.clear(),
            db.returns.clear(),
            db.categories.clear(),
            db.users.clear()
          ]);

          // Add new data
          await Promise.all([
            db.projects.bulkAdd(data.projects),
            db.inventory.bulkAdd(data.inventory),
            db.transactions.bulkAdd(data.transactions),
            db.suppliers.bulkAdd(data.suppliers || []),
            db.returns.bulkAdd(data.returns || []),
            db.categories.bulkAdd(data.categories || []),
            db.users.bulkAdd(data.users || [])
          ]);
        });

        toast.success('Datos restaurados correctamente. La página se recargará.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        console.error('Error importing data:', error);
        toast.error('Error al importar los datos. Verifique que el archivo sea correcto.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPendingFile(null);
    };
    reader.readAsText(pendingFile);
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor}`}>Configuración del Sistema</h1>

      {/* Data Management Section */}
      <div className={`${cardBg} rounded-lg shadow-sm p-6`}>
        <h2 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
          <Save size={20} className="text-blue-600 dark:text-blue-400" />
          Copia de Seguridad y Restauración
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div className={`border ${borderColor} rounded-lg p-6 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition`}>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <Download size={24} />
            </div>
            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Exportar Datos</h3>
            <p className={`text-sm ${subTextColor} mb-4`}>
              Descarga una copia completa de tu base de datos en formato JSON. Guarda este archivo en un lugar seguro.
            </p>
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Download size={18} />
              Descargar Copia
            </button>
          </div>

          {/* Import */}
          <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-6 flex flex-col items-center text-center hover:bg-red-50 dark:hover:bg-red-900/10 transition bg-red-50/10 dark:bg-red-900/5">
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <Upload size={24} />
            </div>
            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Restaurar Datos</h3>
            <p className={`text-sm ${subTextColor} mb-4`}>
              Recupera tus datos desde un archivo de copia de seguridad. 
              <span className="block font-bold text-red-600 dark:text-red-400 mt-1 flex items-center justify-center gap-1">
                <AlertTriangle size={14} />
                ¡Esto borrará los datos actuales!
              </span>
            </p>
            <input 
              type="file" 
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition flex items-center gap-2"
            >
              <Upload size={18} />
              Seleccionar Archivo
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className={`${cardBg} rounded-lg shadow-sm p-6`}>
        <h2 className={`text-lg font-semibold ${textColor} mb-4`}>Información del Sistema</h2>
        <div className={`space-y-2 text-sm ${subTextColor}`}>
          <p className="flex justify-between border-b dark:border-gray-700 pb-2">
            <span>Versión de la Aplicación:</span>
            <span className={`font-medium ${textColor}`}>1.0.0</span>
          </p>
          <p className="flex justify-between border-b dark:border-gray-700 pb-2">
            <span>Base de Datos:</span>
            <span className={`font-medium ${textColor}`}>IndexedDB (Dexie.js)</span>
          </p>
          <p className="flex justify-between pt-2">
            <span>Estado:</span>
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle size={14} />
              Operativo
            </span>
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onConfirm={executeImport}
        title="Restaurar Copia de Seguridad"
        message="ADVERTENCIA: Importar una copia de seguridad REEMPLAZARÁ todos los datos actuales. Esta acción no se puede deshacer. ¿Estás seguro de continuar?"
        confirmText="Restaurar Datos"
        variant="danger"
      />
    </div>
  );
};

export default Settings;
