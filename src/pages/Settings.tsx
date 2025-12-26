import React, { useRef, useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { SyncService } from '../services/SyncService';
import { Download, Upload, AlertTriangle, CheckCircle, Save, Image as ImageIcon, Trash2, Building2, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { hasPermission, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    website: '',
    email: ''
  });

  const dbCompanyData = useLiveQuery(async () => {
    const keys = ['company_name', 'company_address', 'company_website', 'company_email'];
    const settings = await db.settings.where('key').anyOf(keys).toArray();
    return {
      name: settings.find(s => s.key === 'company_name')?.value || '',
      address: settings.find(s => s.key === 'company_address')?.value || '',
      website: settings.find(s => s.key === 'company_website')?.value || '',
      email: settings.find(s => s.key === 'company_email')?.value || ''
    };
  });

  useEffect(() => {
    if (dbCompanyData) {
      setCompanyForm(dbCompanyData);
    }
  }, [dbCompanyData]);

  const currentLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
  });

  const [dbConfig, setDbConfig] = useState({
    host: '',
    port: '3306',
    user: '',
    password: '',
    database: '',
    apiUrl: ''
  });

  const dbConfigData = useLiveQuery(async () => {
    const keys = ['remote_db_host', 'remote_db_port', 'remote_db_user', 'remote_db_password', 'remote_db_name', 'remote_api_url'];
    const settings = await db.settings.where('key').anyOf(keys).toArray();
    return {
      host: settings.find(s => s.key === 'remote_db_host')?.value || '',
      port: settings.find(s => s.key === 'remote_db_port')?.value || '3306',
      user: settings.find(s => s.key === 'remote_db_user')?.value || '',
      password: settings.find(s => s.key === 'remote_db_password')?.value || '',
      database: settings.find(s => s.key === 'remote_db_name')?.value || '',
      apiUrl: settings.find(s => s.key === 'remote_api_url')?.value || ''
    };
  });

  useEffect(() => {
    if (dbConfigData) {
      setDbConfig(dbConfigData);
    }
  }, [dbConfigData]);

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Removed auto-check connection useEffect to prevent excessive requests

  const handleSaveAndSync = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para guardar la configuración');
      return;
    }
    
    // Pass dbConfig (state) directly to pullFromRemote via executePullFromRemote
    // But executePullFromRemote uses dbConfig state internally when calling SyncService.pullFromRemote(dbConfig)
    // So calling executePullFromRemote(true) is enough to trigger sync with NEW config.
    
    const success = await executePullFromRemote(true);
    
    if (success) {
        // If sync success, THEN save to DB and Logout
        try {
            await db.transaction('rw', db.settings, async () => {
                const keys = ['remote_db_host', 'remote_db_port', 'remote_db_user', 'remote_db_password', 'remote_db_name', 'remote_api_url'];
                const values = [dbConfig.host, dbConfig.port, dbConfig.user, dbConfig.password, dbConfig.database, dbConfig.apiUrl];
                
                for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const value = values[i];
                const existing = await db.settings.where('key').equals(key).first();
                if (existing) {
                    await db.settings.update(existing.id!, { value });
                } else {
                    await db.settings.add({ key, value });
                }
                }
            });
            
            toast.success('Configuración guardada y sincronizada.');
            setConnectionStatus('connected');
            toast('Cerrando sesión para aplicar cambios de seguridad...', { icon: '🔒', duration: 3000 });
            
            // Logout after a short delay to let user see the success message
            setTimeout(() => {
                logout();
            }, 2000);

        } catch (error) {
            console.error('Error saving DB config:', error);
            toast.error('Error al guardar la configuración local');
        }
    } else {
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Está seguro de desconectar la base de datos? Esto ELIMINARÁ la configuración de conexión y todos los datos descargados. Se cerrará la sesión automáticamente.')) {
        return;
    }

    try {
        await db.transaction('rw', [
            db.projects, db.inventory, db.inventoryMovements, db.transactions, db.suppliers, 
            db.returns, db.categories, db.users, db.roles, db.workers, db.workerRoles, 
            db.payrolls, db.loans, db.clients, db.dailyLogs, db.attendance, db.settings
        ], async () => {
            // 1. Clear Data Tables
            await Promise.all([
                db.projects.clear(),
                db.inventory.clear(),
                db.inventoryMovements.clear(),
                db.transactions.clear(),
                db.suppliers.clear(),
                db.returns.clear(),
                db.categories.clear(),
                db.users.clear(),
                db.roles.clear(),
                db.workers.clear(),
                db.workerRoles.clear(),
                db.payrolls.clear(),
                db.loans.clear(),
                db.clients.clear(),
                db.dailyLogs.clear(),
                db.attendance.clear()
            ]);

            // 2. Clear DB Config from Settings (keep company info)
            const keys = ['remote_db_host', 'remote_db_port', 'remote_db_user', 'remote_db_password', 'remote_db_name', 'remote_api_url'];
            await db.settings.where('key').anyOf(keys).delete();
        });

        setDbConfig({
            host: '',
            port: '3306',
            user: '',
            password: '',
            database: '',
            apiUrl: ''
        });

        toast.success('Base de datos desconectada y datos limpiados.');
        toast('Cerrando sesión...', { icon: '🔒', duration: 2000 });
        
        setTimeout(() => {
            logout();
        }, 1500);

    } catch (error) {
        console.error('Error disconnecting DB:', error);
        toast.error('Error al desconectar la base de datos');
    }
  };



  // Reset connection status when config changes
  useEffect(() => {
    setConnectionStatus('disconnected');
  }, [dbConfig]);

  const handleTestConnection = async () => {
    if (!dbConfig.apiUrl) {
      toast.error('Debe configurar la URL del API Bridge primero');
      return;
    }

    const toastId = toast.loading('Probando conexión...');
    
    try {
        const response = await fetch(dbConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'test',
                host: dbConfig.host,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                port: dbConfig.port
            })
        });
        
        const data = await response.json();
        toast.dismiss(toastId);
        
        if (data.success) {
            toast.success('¡Conexión establecida!');
            setConnectionStatus('connected');
        } else {
            setConnectionStatus('disconnected');
            toast.error('Error de conexión: ' + data.message);
            if (data.code === 'DB_NOT_FOUND') {
                toast("La base de datos no existe, pero la conexión al servidor es correcta. Puede intentar sincronizar para crearla.", { icon: 'ℹ️', duration: 5000 });
            }
        }
    } catch (error) {
        setConnectionStatus('disconnected');
        toast.dismiss(toastId);
        console.error('Connection error:', error);
        toast.error('Error al contactar con el API Bridge. Verifique la URL y CORS.');
    }
  };

  const executePushToRemote = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para sincronizar');
      return;
    }
    if (!dbConfig.apiUrl) {
      toast.error('Configure la URL del API Bridge');
      return;
    }

    if (!window.confirm('¿Está seguro de sobrescribir la base de datos remota con los datos locales? Esta acción no se puede deshacer.')) {
        return;
    }

    await SyncService.pushToRemote(true);
  };

  const executePullFromRemote = async (skipConfirmation = false) => {
    if (!hasPermission('settings.create')) {
        toast.error('No tiene permisos para sincronizar');
        return false;
    }
    
    // Check local data for safety
    const projectCount = await db.projects.count();
    if (!skipConfirmation && projectCount > 0) {
        if (!window.confirm('ADVERTENCIA: Esta acción BORRARÁ todos los datos locales y los reemplazará con los datos del servidor remoto. ¿Desea continuar?')) {
            return false;
        }
    }

    const success = await SyncService.pullFromRemote(dbConfig);
    return success;
  };

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  const handleCompanyDataSave = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para guardar la configuración');
      return;
    }
    try {
      await db.transaction('rw', db.settings, async () => {
        const keys = ['company_name', 'company_address', 'company_website', 'company_email'];
        const values = [companyForm.name, companyForm.address, companyForm.website, companyForm.email];
        
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = values[i];
            const existing = await db.settings.where('key').equals(key).first();
            if (existing) {
                await db.settings.update(existing.id!, { value });
            } else {
                await db.settings.add({ key, value });
            }
        }
      });
      toast.success('Datos de la empresa guardados');
    } catch (error) {
      console.error('Error saving company data:', error);
      toast.error('Error al guardar los datos');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para cambiar el logo');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen válido');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        
        const existing = await db.settings.where('key').equals('system_logo').first();
        if (existing) {
          await db.settings.update(existing.id!, { value: base64 });
        } else {
          await db.settings.add({ key: 'system_logo', value: base64 });
        }
        
        toast.success('Logo actualizado correctamente');
      } catch (error) {
        console.error('Error saving logo:', error);
        toast.error('Error al guardar el logo');
      }
      if (logoInputRef.current) logoInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para eliminar el logo');
      return;
    }
    try {
      await db.settings.where('key').equals('system_logo').delete();
      toast.success('Logo eliminado correctamente');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Error al eliminar el logo');
    }
  };







  const handleExportSQL = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para exportar datos');
      return;
    }

    try {
      const sql = await SyncService.generateDump();
      if (!sql) return;

      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `obras_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Archivo SQL generado correctamente');
    } catch (error) {
      toast.error('Error al generar el archivo SQL');
    }
  };

  const handleExport = async () => {
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para exportar datos');
      return;
    }
    try {
      const data = {
        projects: await db.projects.toArray(),
        inventory: await db.inventory.toArray(),
        inventoryMovements: await db.inventoryMovements.toArray(),
        transactions: await db.transactions.toArray(),
        suppliers: await db.suppliers.toArray(),
        returns: await db.returns.toArray(),
        categories: await db.categories.toArray(),
        users: await db.users.toArray(),
        roles: await db.roles.toArray(),
        workers: await db.workers.toArray(),
        workerRoles: await db.workerRoles.toArray(),
        payrolls: await db.payrolls.toArray(),
        loans: await db.loans.toArray(),
        clients: await db.clients.toArray(),
        dailyLogs: await db.dailyLogs.toArray(),
        attendance: await db.attendance.toArray(),
        settings: await db.settings.toArray(),
        exportDate: new Date().toISOString(),
        version: 2
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
    if (!hasPermission('settings.create')) {
      toast.error('No tiene permisos para importar datos');
      return;
    }
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

        await db.transaction('rw', [
          db.projects, db.inventory, db.inventoryMovements, db.transactions, db.suppliers, 
          db.returns, db.categories, db.users, db.roles, db.workers, db.workerRoles, 
          db.payrolls, db.loans, db.clients, db.dailyLogs, db.attendance, db.settings
        ], async () => {
          // Clear all tables
          await Promise.all([
            db.projects.clear(),
            db.inventory.clear(),
            db.inventoryMovements.clear(),
            db.transactions.clear(),
            db.suppliers.clear(),
            db.returns.clear(),
            db.categories.clear(),
            db.users.clear(),
            db.roles.clear(),
            db.workers.clear(),
            db.workerRoles.clear(),
            db.payrolls.clear(),
            db.loans.clear(),
            db.clients.clear(),
            db.dailyLogs.clear(),
            db.attendance.clear(),
            db.settings.clear()
          ]);

          // Add new data
          await Promise.all([
            db.projects.bulkAdd(data.projects),
            db.inventory.bulkAdd(data.inventory),
            db.inventoryMovements.bulkAdd(data.inventoryMovements || []),
            db.transactions.bulkAdd(data.transactions),
            db.suppliers.bulkAdd(data.suppliers || []),
            db.returns.bulkAdd(data.returns || []),
            db.categories.bulkAdd(data.categories || []),
            db.users.bulkAdd(data.users || []),
            db.roles.bulkAdd(data.roles || []),
            db.workers.bulkAdd(data.workers || []),
            db.workerRoles.bulkAdd(data.workerRoles || []),
            db.payrolls.bulkAdd(data.payrolls || []),
            db.loans.bulkAdd(data.loans || []),
            db.clients.bulkAdd(data.clients || []),
            db.dailyLogs.bulkAdd(data.dailyLogs || []),
            db.attendance.bulkAdd(data.attendance || []),
            db.settings.bulkAdd(data.settings || [])
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

  const executeReset = async () => {
    try {
      await db.transaction('rw', [
        db.projects, db.inventory, db.inventoryMovements, db.transactions, db.suppliers, 
        db.returns, db.categories, db.users, db.roles, db.workers, db.workerRoles, 
        db.payrolls, db.loans, db.clients, db.dailyLogs, db.attendance, db.settings
      ], async () => {
        // Clear all tables
        await Promise.all([
          db.projects.clear(),
          db.inventory.clear(),
          db.inventoryMovements.clear(),
          db.transactions.clear(),
          db.suppliers.clear(),
          db.returns.clear(),
          db.categories.clear(),
          // db.users.clear(), // Keep users so we don't lose admin access
          // db.roles.clear(), // Keep roles
          db.workers.clear(),
          db.workerRoles.clear(),
          db.payrolls.clear(),
          db.loans.clear(),
          db.clients.clear(),
          db.dailyLogs.clear(),
          db.attendance.clear(),
          // db.settings.clear() // Keep settings (company info, etc)
        ]);
        
        // Also clear inventory/movements explicitly if missed
      });

      toast.success('Base de datos limpiada correctamente. Recargando...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error resetting database:', error);
      toast.error('Error al limpiar la base de datos.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${textColor}`}>Configuración del Sistema</h1>
      
      {/* Company Data Section */}
      <div className={`${cardBg} rounded-lg shadow-sm p-6`}>
        <h2 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
          <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
          Datos de la Empresa
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Nombre de la Empresa</label>
                <input 
                    type="text" 
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Ej. Constructora ABC SAC"
                />
            </div>
             <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Dirección</label>
                <input 
                    type="text" 
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Ej. Av. Principal 123"
                />
            </div>
             <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Página Web</label>
                <input 
                    type="url" 
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({...companyForm, website: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Ej. www.constructoraabc.com"
                />
            </div>
             <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Correo Electrónico</label>
                <input 
                    type="email" 
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Ej. contacto@constructoraabc.com"
                />
            </div>
        </div>
        
        <div className="mt-4 flex justify-end">
            <button 
                onClick={handleCompanyDataSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
                <Save size={18} />
                Guardar Datos
            </button>
        </div>
      </div>

      {/* Database Connection Section */}
      <div className={`${cardBg} rounded-lg shadow-sm p-6`}>
        <h2 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
          <Database size={20} className="text-blue-600 dark:text-blue-400" />
          Conexión a Base de Datos Remota (Hosting)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>URL del API Bridge (PHP)</label>
                <input 
                    type="text" 
                    value={dbConfig.apiUrl}
                    onChange={(e) => setDbConfig({...dbConfig, apiUrl: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="https://midominio.com/api.php"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Sube el archivo <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">backend_php/api.php</code> a tu hosting y pega aquí su URL pública.
                </p>
            </div>
            <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Host / Servidor</label>
                <input 
                    type="text" 
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Ej. 192.168.1.100 o mysql.mihosting.com"
                />
            </div>
            <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Usuario</label>
                <input 
                    type="text" 
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Usuario de la BD"
                />
            </div>
            <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Contraseña</label>
                <input 
                    type="password" 
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="••••••••"
                />
            </div>
            <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Nombre de Base de Datos</label>
                <input 
                    type="text" 
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="Nombre de la BD"
                />
            </div>
            <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Puerto</label>
                <input 
                    type="text" 
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${borderColor} ${cardBg} ${textColor}`}
                    placeholder="3306"
                />
            </div>
        </div>
        
        <div className="mt-4 flex justify-end gap-3 flex-wrap">
            <button 
                onClick={() => executePullFromRemote(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                title="Descargar datos del servidor remoto (sobrescribe local)"
            >
                <Download size={18} />
                Descargar de Remoto
            </button>
            <button 
                onClick={executePushToRemote}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                title="Enviar datos locales a la base de datos remota"
            >
                <Upload size={18} />
                Subir a Remoto
            </button>
            {connectionStatus !== 'connected' ? (
                <button 
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <CheckCircle size={18} />
                    Establecer Conexión
                </button>
            ) : (
                <div className="flex gap-2">
                    <button 
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                        title="Eliminar configuración y cerrar sesión"
                    >
                        <Trash2 size={18} />
                        Desconectar
                    </button>
                    <button 
                        onClick={handleSaveAndSync}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                        <Save size={18} />
                        Guardar Configuración
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Logo Section */}
      <div className={`${cardBg} rounded-lg shadow-sm p-6`}>
        <h2 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
          <ImageIcon size={20} className="text-blue-600 dark:text-blue-400" />
          Logo del Sistema
        </h2>
        
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={`w-32 h-32 flex items-center justify-center rounded-lg border-2 border-dashed ${borderColor} ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            {currentLogo ? (
              <img src={currentLogo} alt="System Logo" className="max-w-full max-h-full object-contain p-2" />
            ) : (
              <span className={`text-sm ${subTextColor}`}>Sin logo</span>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <p className={`text-sm ${subTextColor}`}>
              Sube una imagen para usar como logo del sistema. 
              <br />
              Formato: PNG, JPG. Máximo 2MB.
            </p>
            
            <div className="flex gap-3">
              <input 
                type="file" 
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Upload size={18} />
                Subir Logo
              </button>
              
              {currentLogo && (
                <button 
                  onClick={handleRemoveLogo}
                  className="px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
              Descarga una copia de tu base de datos. JSON para respaldo del sistema, SQL para migrar a MySQL.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                title="Exportar copia de seguridad en JSON"
              >
                <Download size={18} />
                JSON
              </button>
              <button 
                onClick={handleExportSQL}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                title="Exportar script SQL para MySQL"
              >
                <Database size={18} />
                MySQL
              </button>
            </div>
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

      {/* Danger Zone */}
      <div className={`${isDark ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-200'} border rounded-lg shadow-sm p-6`}>
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} />
          Zona de Peligro
        </h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>Eliminar Todos los Datos</h3>
            <p className={`text-sm ${subTextColor}`}>
              Esta acción eliminará permanentemente todos los proyectos, inventarios, trabajadores y registros. 
              <br />
              Los usuarios, roles y configuración de la empresa se mantendrán.
            </p>
          </div>
          
          <button 
            onClick={() => {
              if (hasPermission('settings.create')) {
                setShowResetConfirm(true);
              } else {
                toast.error('No tiene permisos para realizar esta acción');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 whitespace-nowrap"
          >
            <Trash2 size={18} />
            Eliminar Datos
          </button>
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
            <span className={`font-medium ${textColor}`}>
              {connectionStatus === 'connected' ? 'MySQL / MariaDB (Remoto)' : 'IndexedDB (Dexie.js)'}
            </span>
          </p>
          <p className="flex justify-between pt-2">
            <span>Estado:</span>
            {connectionStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle size={14} />
                Conectado a BD Remota
              </span>
            ) : connectionStatus === 'checking' ? (
               <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                <span className="animate-pulse">●</span>
                Verificando...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium">
                <AlertTriangle size={14} />
                Modo Local (Sin Conexión)
              </span>
            )}
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
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          executeReset();
        }}
        title="¿Eliminar todos los datos?"
        message="ADVERTENCIA: Esta acción eliminará permanentemente todos los proyectos, inventarios, transacciones y registros de personal. Solo se conservarán los usuarios y la configuración básica. ¿Estás absolutamente seguro?"
        confirmText="Sí, Eliminar Todo"
        variant="danger"
      />
    </div>
  );
};

export default Settings;
