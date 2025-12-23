import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: isDark ? 'text-red-500' : 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: isDark ? 'bg-red-900/30' : 'bg-red-100'
        };
      case 'warning':
        return {
          icon: isDark ? 'text-yellow-500' : 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          iconBg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'
        };
      case 'info':
      default:
        return {
          icon: isDark ? 'text-blue-500' : 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconBg: isDark ? 'bg-blue-900/30' : 'bg-blue-100'
        };
    }
  };

  const styles = getVariantStyles();
  const messageColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const cancelButtonBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const cancelButtonText = isDark ? 'text-gray-300' : 'text-gray-700';
  const cancelButtonHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${styles.iconBg} ${styles.icon}`}>
          <AlertTriangle size={24} />
        </div>
        
        <p className={`${messageColor} mb-6`}>
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 border ${cancelButtonBorder} rounded-lg ${cancelButtonText} ${cancelButtonHover} transition font-medium`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
