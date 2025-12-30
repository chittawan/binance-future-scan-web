import React from 'react';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  description,
  required = false,
  disabled = false,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-binance-text mb-2">
        {label}
        {required && <span className="text-binance-red ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`input-field w-full ${disabled ? 'bg-binance-gray-light cursor-not-allowed opacity-60' : ''}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p className="text-xs text-binance-text-secondary mt-1">{description}</p>
      )}
    </div>
  );
};

