import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className = '',
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

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border ${borderColor} rounded-md text-sm px-3 py-1.5 ${bgColor} ${hoverBorderColor} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
      >
        <span className={`truncate block max-w-full text-left ${textColor}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`ml-2 ${chevronColor} shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

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
                    {option.label}
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
