import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, User } from '../db/db';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    if (!user) return;

    // Set initial activity timestamp
    localStorage.setItem('lastActivity', Date.now().toString());

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Check for inactivity every minute
    const intervalId = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
      const now = Date.now();
      
      if (now - lastActivity >= 10 * 60 * 1000) { // 10 minutes
        toast.error('Sesión cerrada por inactividad');
        logout();
      }
    }, 60 * 1000); // Check every minute

    // Throttle activity updates
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) { // Update at most once per second
        localStorage.setItem('lastActivity', now.toString());
        lastUpdate = now;
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearInterval(intervalId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, logout]);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        await loadPermissions(parsedUser.role);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const loadPermissions = async (roleName: string) => {
    try {
      if (!roleName) {
        setPermissions([]);
        return;
      }
      
      const role = await db.roles.where('name').equals(roleName).first();
      if (role && role.permissions) {
        setPermissions(role.permissions);
      } else {
        // Fallback for Admin if DB issue or role missing
        if (roleName === 'Administrador' || roleName === 'Admin Principal' || roleName === 'Administrador General') {
             setPermissions(['all']);
        } else {
             setPermissions([]);
        }
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Emergency fallback for admin
      if (roleName === 'Administrador' || roleName === 'Administrador General') {
        setPermissions(['all']);
      } else {
        setPermissions([]);
      }
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    await loadPermissions(userData.role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (permissions.includes('all')) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
