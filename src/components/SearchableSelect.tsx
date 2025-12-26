import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { createPortal } from 'react-dom';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className = '',
  required = false,
}: SearchableSelectProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme variables
  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-300';
  const hoverBorderColor = isDark ? 'hover:border-gray-500' : 'hover:border-gray-400';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const chevronColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const dropdownBorderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const searchSectionBorder = isDark ? 'border-gray-700' : 'border-gray-100';
  const searchSectionBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const searchInputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const searchInputText = isDark ? 'text-white' : 'text-gray-900';
  const searchInputPlaceholder = isDark ? 'placeholder-gray-400' : 'placeholder-gray-500';
  const optionBorder = isDark ? 'border-gray-700/50' : 'border-gray-100';
  const optionHoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50';
  const optionSelectedBg = isDark ? 'bg-blue-900/30' : 'bg-blue-50';
  const optionSelectedText = isDark ? 'text-blue-400' : 'text-blue-700';
  const optionText = isDark ? 'text-gray-300' : 'text-gray-700';
  const optionHoverText = isDark ? 'group-hover:text-white' : 'group-hover:text-blue-700';

  const toSentenceCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMoreText, setViewMoreText] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(o => o.value.toString() === value.toString());

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        tabIndex={-1}
        autoComplete="off"
        style={{ opacity: 0, height: 1, position: 'absolute', bottom: 0, left: 0, width: 1, pointerEvents: 'none' }}
        value={value}
        onChange={() => {}}
        required={required}
      />
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border ${borderColor} rounded-md text-sm px-3 py-1.5 ${bgColor} ${hoverBorderColor} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors h-auto min-h-[38px]`}
      >
        <div className="flex-1 min-w-0 text-left">
            <span className={`max-w-full break-words whitespace-normal leading-snug text-[14px] ${textColor} line-clamp-2`}>
                {selectedOption ? toSentenceCase(selectedOption.label) : placeholder}
            </span>
            {selectedOption && selectedOption.label.length > 80 && (
                 <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setViewMoreText(selectedOption.label);
                    }}
                    className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-0.5 block font-bold focus:outline-none cursor-pointer"
                 >
                    Ver más
                 </span>
            )}
        </div>
        <ChevronDown size={16} className={`ml-2 ${chevronColor} shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* View More Modal */}
      {viewMoreText && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className={`${bgColor} rounded-lg p-6 max-w-lg w-full relative shadow-xl border ${borderColor}`}>
            <button
              onClick={() => setViewMoreText(null)}
              className={`absolute top-4 right-4 text-gray-400 ${isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
            >
              <X size={24} />
            </button>
            <h3 className={`text-lg font-bold ${textColor} mb-4 pr-8`}>Nombre Completo</h3>
            <div className={`max-h-[60vh] overflow-y-auto text-justify ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed text-sm`}>
              {toSentenceCase(viewMoreText)}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewMoreText(null)}
                className={`px-4 py-2 rounded-lg transition font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute z-50 w-full min-w-[300px] right-0 mt-1 ${bgColor} border ${dropdownBorderColor} rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden`}>
          {/* Search Input */}
          <div className={`p-2 border-b ${searchSectionBorder} ${searchSectionBg}`}>
            <div className="relative">
              <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${chevronColor}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar obra..."
                className={`w-full pl-8 pr-3 py-1.5 text-sm ${searchInputBg} border ${dropdownBorderColor} rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${searchInputText} ${searchInputPlaceholder} transition-all`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value.toString());
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b ${optionBorder} last:border-0 ${optionHoverBg} transition-colors group ${
                    option.value.toString() === value.toString() ? optionSelectedBg : ''
                  }`}
                >
                  <span className={`block ${option.value.toString() === value.toString() ? `${optionSelectedText} font-medium` : `${optionText} ${optionHoverText}`}`}>
                    {toSentenceCase(option.label)}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No se encontraron resultados</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
