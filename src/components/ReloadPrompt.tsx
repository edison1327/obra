import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTheme } from '../context/ThemeContext';
import { Wifi, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ReloadPrompt = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-600';

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  React.useEffect(() => {
    if (offlineReady) {
      toast.success('App lista para trabajar sin conexión', {
        icon: <Wifi size={20} className="text-green-500" />,
        duration: 4000
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} ${cardBg} max-w-sm animate-fade-in-up`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
          <RefreshCw size={20} />
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${textColor} mb-1`}>Nueva versión disponible</h3>
          <p className={`text-xs ${subTextColor} mb-3`}>
            Hay una nueva versión de la aplicación. Actualiza para ver los cambios.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={close}
              className={`px-3 py-1.5 border ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} ${textColor} text-xs font-medium rounded transition-colors`}
            >
              Cerrar
            </button>
          </div>
        </div>
        <button 
          onClick={close}
          className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;
