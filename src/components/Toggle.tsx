import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description, disabled = false }) => {
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        <label className={`text-sm font-medium text-binance-text ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-binance-text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-slider"></span>
      </div>
    </div>
  );
};

