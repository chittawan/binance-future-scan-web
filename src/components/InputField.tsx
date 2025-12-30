import React from 'react';

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'password';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  max,
  step,
  description,
  required = false,
  readOnly = false,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-binance-text mb-2">
        {label}
        {required && <span className="text-binance-red ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
          onChange(newValue);
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        className={`input-field w-full ${readOnly ? 'bg-binance-gray-light cursor-not-allowed opacity-60' : ''}`}
      />
      {description && (
        <p className="text-xs text-binance-text-secondary mt-1">{description}</p>
      )}
    </div>
  );
};

