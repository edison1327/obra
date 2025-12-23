import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

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

        // Save user session
        localStorage.setItem('user', JSON.stringify(user));
        
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
          <div className="h-16 w-32 bg-blue-600 mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl rounded shadow-lg">
            OBRAS
          </div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Bienvenido</h2>
          <p className={`${subTextColor} text-sm mt-1`}>Ingrese sus credenciales para continuar</p>
        </div>
        
        {error && (
          <div className={`p-3 rounded-md mb-6 text-sm flex items-center justify-center border ${isDark ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} ${inputBg} ${inputText} rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition`}
              placeholder="admin"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
              <a href="#" className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}>
                ¿Olvidó su contraseña?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border ${inputBorder} ${inputBg} ${inputText} rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition`}
              placeholder="••••••••"
            />
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
        </form>
      </div>
    </div>
  );
};

export default Login;
