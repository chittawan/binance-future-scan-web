import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  description,
  required = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-binance-text mb-2">
        {label}
        {required && <span className="text-binance-red ml-1">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`input-field w-full text-left flex items-center justify-between ${disabled ? 'bg-binance-gray-light cursor-not-allowed opacity-60' : ''}`}
        >
          <span className={value.length === 0 ? 'text-binance-text-secondary' : ''}>
            {value.length === 0
              ? 'Select symbols...'
              : value.length === 1
                ? value[0]
                : `${value.length} symbols selected`}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-binance-gray border border-binance-gray-border rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2 sticky top-0 bg-binance-gray border-b border-binance-gray-border">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-2 text-sm text-binance-text-secondary">
                  No symbols found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center px-4 py-2 hover:bg-binance-gray-light cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(option)}
                      onChange={() => !disabled && toggleOption(option)}
                      disabled={disabled}
                      className="w-4 h-4 text-binance-yellow bg-binance-gray border-binance-gray-border rounded focus:ring-binance-yellow"
                    />
                    <span className="ml-2 text-sm text-binance-text">{option}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((symbol) => (
            <span
              key={symbol}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-binance-yellow/20 text-binance-yellow border border-binance-yellow/30"
            >
              {symbol}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleOption(symbol)}
                  className="ml-1.5 hover:text-binance-red"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {description && (
        <p className="text-xs text-binance-text-secondary mt-1">{description}</p>
      )}
    </div>
  );
};

