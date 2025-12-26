import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const NetworkStatus = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        // Verificar primero navigator.onLine para evitar peticiones innecesarias
        if (!navigator.onLine) {
          if (isMounted) setIsOnline(false);
          return;
        }

        // Usar una imagen pequeña de un CDN fiable (Google) para verificar internet real
        // Añadimos timestamp para evitar caché
        await fetch(`https://www.google.com/favicon.ico?t=${Date.now()}`, { 
          mode: 'no-cors', 
          cache: 'no-store'
        });
        
        if (isMounted) setIsOnline(true);
      } catch (e) {
        if (isMounted) setIsOnline(false);
      }
    };

    const handleOnline = () => {
      if (isMounted) {
        setIsOnline(true);
        checkConnection();
      }
    };
    
    const handleOffline = () => {
      if (isMounted) setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar periódicamente cada 10 segundos
    const interval = setInterval(checkConnection, 10000);

    // Verificar al montar
    checkConnection();

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      // Eliminamos el AbortController para evitar el error ERR_ABORTED en consola
      // que ocurre cuando se cancela la petición al desmontar
    };
  }, []);

  if (collapsed) {
    return (
      <div 
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-300 ${
          isOnline 
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
        }`}
        title={isOnline ? 'Conectado a Internet' : 'Sin conexión a Internet'}
      >
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-300 ${
      isOnline 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
      {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{isOnline ? 'Conectado' : 'Sin Conexión'}</span>
    </div>
  );
};

export default NetworkStatus;
