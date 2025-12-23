import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme variables
  const modalBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const titleColor = isDark ? 'text-white' : 'text-gray-900';
  const closeButtonColor = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700';

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        ref={modalRef}
        className={`${modalBg} rounded-lg shadow-xl w-full ${sizeClasses[size]} flex flex-col border ${borderColor} transform transition-all animate-fadeIn`}
        role="dialog"
        aria-modal="true"
      >
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h2 className={`text-xl font-bold ${titleColor}`}>
            {title}
          </h2>
          <button 
            onClick={onClose}
            className={`${closeButtonColor} transition-colors`}
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
