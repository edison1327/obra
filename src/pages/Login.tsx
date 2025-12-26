import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { Save, X, Eye, EyeOff, Lock, CheckCircle, Sparkles } from 'lucide-react';
import { SyncService } from '../services/SyncService';
import { quotes } from '../utils/quotes';

const Login = () => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDbConfig, setShowDbConfig] = useState(false);
  
  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [currentUserForPasswordChange, setCurrentUserForPasswordChange] = useState<any>(null);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';

  const [dbConfig, setDbConfig] = useState({
    host: '',
    port: '3306',
    user: '',
    password: '',
    database: '',
    apiUrl: ''
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const systemLogo = useLiveQuery(async () => {
    const setting = await db.settings.where('key').equals('system_logo').first();
    return setting?.value;
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

  // Reset connection status when config changes
  useEffect(() => {
    setConnectionStatus('disconnected');
  }, [dbConfig]);

  const handleTestConnection = async () => {
    if (!dbConfig.apiUrl) {
      toast.error('Configure la URL del API Bridge');
      return;
    }
    
    const toastId = toast.loading('Probando conexión...');
    try {
      const response = await fetch(dbConfig.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query', // Changed from 'test_connection' to 'query' to support generic bridges
          host: dbConfig.host,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          port: dbConfig.port,
          sql: 'SELECT 1'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON:', text);
        throw new Error('El servidor devolvió una respuesta inválida (no es JSON). Verifique la URL.');
      }
      
      toast.dismiss(toastId);
      
      if (data.success) {
        toast.success('¡Conexión establecida!');
        setConnectionStatus('connected');
      } else {
        toast.error('Error de BD: ' + (data.message || 'Desconocido'));
        setConnectionStatus('disconnected');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Connection test error:', error);
      
      let msg = error.message || 'Error desconocido';
      if (msg.includes('Failed to fetch')) {
        msg = 'No se pudo conectar al API Bridge. Verifique la URL y CORS.';
      }
      
      toast.error(msg);
      setConnectionStatus('disconnected');
    }
  };

  const handleSaveAndSync = async () => {
    try {
      // 1. Try to sync first with the NEW config
      // Immediate sync (Download) using the state config
      const success = await SyncService.pullFromRemote(dbConfig);
      
      if (success) {
          // 2. If sync succeeds, save the config
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
          setShowDbConfig(false);
          
          if (isFirstTimeSetup) {
            // Find the admin user to force password change
            const adminUser = await db.users.where('username').equals('admin').first();
            if (adminUser) {
              // FORCE the flag locally so it persists even if they reload
              await db.users.update(adminUser.id, { forcePasswordChange: true });
              
              // Get the updated user object
              const updatedAdmin = await db.users.get(adminUser.id);
              
              setCurrentUserForPasswordChange(updatedAdmin);
              setShowChangePassword(true);
              toast('Por seguridad, debe cambiar la contraseña del administrador.', { icon: '🔐', duration: 5000 });
            } else {
              toast.error('No se encontró el usuario "admin" en los datos sincronizados.');
              // If no admin, we can't force password change on it, but setup is done.
              setTimeout(() => window.location.reload(), 2000);
            }
          } else {
            // Reload to reflect changes
            setTimeout(() => window.location.reload(), 1500);
          }
      }
      
    } catch (error) {
      console.error('Error saving DB config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 4) {
      setChangePasswordError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      // 1. Update locally
      await db.users.update(currentUserForPasswordChange.id, {
        password: newPassword,
        forcePasswordChange: false,
        role: 'Administrador General'
      });

      // 2. Push to remote to persist the change
      await SyncService.pushToRemote(true);
      
      toast.success('Contraseña actualizada correctamente. Inicie sesión nuevamente.');
      setShowChangePassword(false);
      
      // Clear sensitive state
      setUsername('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsFirstTimeSetup(false);
      setCurrentUserForPasswordChange(null);
      
      // Reload to ensure clean state and force re-login
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Error updating password:', error);
      setChangePasswordError('Error al actualizar la contraseña');
    }
  };

  const handleEmergencyReset = async () => {
    if (!window.confirm('¿ESTÁ SEGURO? Esto borrará TODOS los datos locales y la configuración para simular una instalación limpia.')) {
      return;
    }

    const toastId = toast.loading('Restableciendo sistema...');
    
    try {
      await db.transaction('rw', [
          db.projects, db.inventory, db.inventoryMovements, db.transactions, db.suppliers, 
          db.returns, db.categories, db.users, db.roles, db.workers, db.workerRoles, 
          db.payrolls, db.loans, db.clients, db.dailyLogs, db.attendance, db.settings
      ], async () => {
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
      });

      toast.success('Sistema restablecido. Recargando...', { id: toastId });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error resetting:', error);
      toast.error('Error al restablecer', { id: toastId });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Special flow for admin/admin (First time setup or Re-configuration)
    if (username === 'admin' && password === 'admin') {
      setIsLoading(false);
      setIsFirstTimeSetup(true);
      setShowDbConfig(true);
      toast('Bienvenido. Configure la conexión a la base de datos.', { 
        icon: '👋',
        duration: 5000 
      });
      return;
    }

    try {
      // Check if system is initialized (has users)
      const userCount = await db.users.count();
      if (userCount === 0) {
         setIsLoading(false);
         setError('Sistema no inicializado. Ingrese con usuario: admin, contraseña: admin');
         return;
      }
    } catch (err) {
      console.error('Error checking users:', err);
    }

    // Basic validation
    if (!username || !password) {
      setError('Por favor, ingrese usuario y contraseña');
      setIsLoading(false);
      return;
    }

    try {
      const user = await db.users.where('username').equals(username).first();
      
      if (user && user.password === password) {
        if (user.status === 'Inactivo') {
          setError('Usuario inactivo. Contacte al administrador.');
          setIsLoading(false);
          return;
        }

        // Check for forced password change
        if (user.forcePasswordChange) {
          setCurrentUserForPasswordChange(user);
          setShowChangePassword(true);
          setIsLoading(false);
          return;
        }

        // Save user session
        await login(user);
        
        // Simulate network delay for UX
        setTimeout(() => {
          setIsLoading(false);
          navigate('/');
        }, 500);
      } else {
        setError('Usuario o contraseña incorrectos');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`${cardBg} p-8 rounded-lg shadow-md w-full max-w-md`}>
        <div className="text-center mb-8">
          {systemLogo ? (
            <img src={systemLogo} alt="Logo" className="h-24 w-auto mx-auto mb-4 object-contain" />
          ) : (
            <div className="h-16 w-auto px-6 bg-blue-600 mx-auto mb-4 inline-flex items-center justify-center text-white font-bold text-xl rounded shadow-lg">
              Obra Check
            </div>
          )}
          <h2 className={`text-2xl font-bold ${textColor}`}>Bienvenido</h2>
          <p className={`${subTextColor} text-sm mt-1`}>Ingrese sus credenciales para continuar</p>
        </div>
        
        {error && (
          <div className={`p-3 rounded-md mb-6 text-sm flex items-center justify-center border ${isDark ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} size={18} />
              <div className="text-sm italic flex-1">
                <p className={`mb-1 ${isDark ? 'text-blue-200' : 'text-blue-800'} animate-fade-in`}>
                  "{quotes[currentQuoteIndex]}"
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} ${inputBg} ${inputText} rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition`}
              placeholder="Ingresa tu usuario"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} ${inputBg} ${inputText} rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${subTextColor} hover:text-blue-500 transition-colors`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${inputBorder} ${inputBg} rounded`}
            />
            <label htmlFor="remember-me" className={`ml-2 block text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              Recordarme
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 px-4 rounded-md transition font-medium flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Ingresar'
            )}
          </button>

          <div className="mt-8 text-center space-y-1">
            <p className={`text-xs ${subTextColor}`}>Desarrollado por: EER</p>
            <p className={`text-xs ${subTextColor}`}>Version: 1.00</p>
          </div>
        </form>
      </div>

      {showDbConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardBg} w-full max-w-lg rounded-xl shadow-2xl border ${isDark ? 'border-gray-700' : 'border-gray-100'} max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className={`text-xl font-bold ${textColor}`}>Configuración de Base de Datos</h3>
              {!isFirstTimeSetup && (
                <button onClick={() => setShowDbConfig(false)} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${subTextColor}`}>
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>URL del API Bridge</label>
                <input 
                  type="text" 
                  value={dbConfig.apiUrl}
                  onChange={(e) => setDbConfig({...dbConfig, apiUrl: e.target.value})}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="https://mi-dominio.com/api/bridge.php"
                />
                <p className="text-xs text-gray-500 mt-1">URL del script PHP que conecta con la BD MySQL</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Host</label>
                  <input 
                    type="text" 
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                    className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Puerto</label>
                  <input 
                    type="text" 
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                    className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="3306"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Usuario</label>
                  <input 
                    type="text" 
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                    className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="root"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Contraseña</label>
                  <input 
                    type="password" 
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                    className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Nombre de Base de Datos</label>
                <input 
                  type="text" 
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="mi_base_datos"
                />
              </div>
            </div>
            <div className={`p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} flex justify-end gap-3`}>
              {!isFirstTimeSetup && (
                <button 
                  onClick={() => setShowDbConfig(false)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} ${textColor}`}
                >
                  Cancelar
                </button>
              )}
              {connectionStatus !== 'connected' ? (
                <button 
                  onClick={handleTestConnection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Establecer Conexión
                </button>
              ) : (
                <button 
                  onClick={handleSaveAndSync}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Save size={18} />
                  Guardar Configuración
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardBg} w-full max-w-md rounded-xl shadow-2xl border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Lock className={isDark ? 'text-blue-400' : 'text-blue-600'} size={24} />
                <h3 className={`text-xl font-bold ${textColor}`}>Cambiar Contraseña</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border mb-4`}>
                <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  Por seguridad, debe cambiar su contraseña antes de continuar.
                </p>
              </div>

              {changePasswordError && (
                <div className={`p-3 rounded-md text-sm flex items-center justify-center border ${isDark ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {changePasswordError}
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${subTextColor} mb-1`}>Confirmar Contraseña</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg ${inputBg} ${inputText} focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="••••••"
                />
              </div>
            </div>
            <div className={`p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} flex justify-end gap-3`}>
              <button 
                onClick={handleChangePassword}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Guardar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
