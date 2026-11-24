import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  style,
  className,
  disabled,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          style={{
            width: '100%',
            height: '38px',
            padding: '8px 38px 8px 12px',
            border: `1px solid ${error ? '#DC2626' : '#E5E9F0'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            color: '#172033',
            backgroundColor: disabled ? '#F5F7FA' : '#FFFFFF',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = '#2563EB';
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = '#E5E9F0';
              e.target.style.boxShadow = 'none';
            }
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          tabIndex={disabled ? -1 : 0}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: showPassword ? '#2563EB' : '#667085',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            outline: 'none',
            transition: 'color 0.15s ease, background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = '#172033';
              e.currentTarget.style.backgroundColor = '#F5F7FA';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = showPassword ? '#2563EB' : '#667085';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span style={{ fontSize: '12px', color: '#DC2626' }}>{error}</span>}
    </div>
  );
};
