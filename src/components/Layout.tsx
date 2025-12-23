import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  PieChart, 
  Wallet, 
  Tags, 
  Users, 
  FileText, 
  Menu, 
  X,
  UserCircle,
  Shield,
  Package,
  Banknote,
  ClipboardList,
  CheckCircle2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from './ConfirmModal';

import toast, { Toaster } from 'react-hot-toast';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Theme-based style helpers
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-900' : 'bg-gray-100';
  const sidebarColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverColor = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Usuario', role: 'Invitado' };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleThemeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Theme button clicked manually');
    toast.success('Botón de tema presionado');
    toggleTheme();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Obras', path: '/projects', icon: Building2 },
    { name: 'Obras Terminadas', path: '/projects/finished', icon: CheckCircle2 },
    { name: 'Análisis', path: '/analysis', icon: PieChart },
    { name: 'Ingresos y Gastos', path: '/transactions', icon: Wallet },
    { name: 'Préstamos', path: '/loans', icon: Banknote },
    { name: 'Planillas', path: '/payrolls', icon: ClipboardList },
    { name: 'Categorías', path: '/categories', icon: Tags },
    { name: 'Almacén', path: '/warehouse', icon: Package },
    { name: 'Proveedores', path: '/suppliers', icon: Users },
    { name: 'Clientes', path: '/clients', icon: UserCircle },
    { name: 'Usuarios', path: '/users', icon: Shield },
    { name: 'Informes', path: '/reports', icon: FileText },
    { name: 'Configuración', path: '/settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${bgColor} ${textColor}`}>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: isDark ? 'bg-gray-800 text-white border border-gray-700' : '',
          style: {
            background: isDark ? '#1F2937' : '#fff',
            color: isDark ? '#fff' : '#333',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
      />
      
      {/* Mobile Header */}
      <div className={`md:hidden p-4 flex items-center justify-between shadow-sm z-20 relative border-b ${sidebarColor} ${borderColor}`}>
        <div className="font-bold text-xl text-blue-600 dark:text-blue-400">OBRAS</div>
        <button onClick={toggleSidebar} className={`p-2 rounded-lg transition-colors ${subTextColor} ${hoverColor}`}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        `fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-all duration-300 ease-in-out z-50 shadow-xl flex flex-col border-r ${sidebarColor} ${borderColor} h-screen`,
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className={`p-6 border-b flex items-center justify-between ${borderColor} ${isCollapsed ? 'justify-center p-4' : ''} relative`}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Building2 className="text-white" size={24} />
            </div>
            {!isCollapsed && <div className={`font-bold text-2xl ${textColor} transition-opacity duration-200`}>OBRAS</div>}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
          
          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex absolute -right-3 top-8 bg-white dark:bg-gray-800 border ${borderColor} rounded-full p-1 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-50`}
          >
            {isCollapsed ? <ChevronRight size={14} className={subTextColor} /> : <ChevronLeft size={14} className={subTextColor} />}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-6 ${isCollapsed ? 'px-2' : 'px-4'} custom-scrollbar`}>
          {!isCollapsed && (
            <div className={`mb-4 px-2 text-xs font-semibold uppercase tracking-wider ${subTextColor} whitespace-nowrap`}>
              Menu Principal
            </div>
          )}
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" 
                        : `${subTextColor} ${hoverColor} hover:text-blue-600`,
                      isCollapsed ? "justify-center" : ""
                    )}
                    title={isCollapsed ? item.name : ''}
                  >
                    <Icon size={20} className={`shrink-0 ${isActive ? "text-white" : ""}`} />
                    {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`p-4 border-t ${borderColor}`}>
          <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} ${isCollapsed ? 'justify-center p-2' : ''}`}>
            <div className="bg-gradient-to-tr from-blue-500 to-purple-500 p-2 rounded-lg text-white shadow-lg shrink-0">
              <UserCircle size={20} />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm truncate ${textColor}`}>{user.name}</div>
                <div className={`text-xs truncate ${subTextColor}`}>{user.role}</div>
              </div>
            )}
          </div>

          <div className={`grid ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            <button
              type="button"
              onClick={handleThemeClick}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all hover:shadow-sm cursor-pointer z-50 ${sidebarColor} ${subTextColor} ${hoverColor} ${borderColor}`}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="text-lg leading-none">{isDark ? '☀️' : '🌙'}</span>
              {!isCollapsed && <span className="text-xs font-medium pointer-events-none">Tema</span>}
            </button>
            
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all hover:shadow-sm ${sidebarColor} ${borderColor} ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="text-xs font-medium">Salir</span>}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Cerrar Sesión"
        message="¿Está seguro que desea cerrar sesión?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Main Content */}
      <main 
        className={`flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8 ${bgColor}`}
      >
        <Outlet />
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
