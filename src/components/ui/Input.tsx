import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  style,
  className,
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <div style={{ position: 'absolute', left: '12px', color: '#667085', display: 'flex', alignItems: 'center' }}>
            {leftIcon}
          </div>
        )}
        <input
          style={{
            width: '100%',
            height: '38px',
            padding: `8px 12px 8px ${leftIcon ? '36px' : '12px'}`,
            border: `1px solid ${error ? '#DC2626' : '#E5E9F0'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            color: '#172033',
            backgroundColor: '#FFFFFF',
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
      </div>
      {error && <span style={{ fontSize: '12px', color: '#DC2626' }}>{error}</span>}
    </div>
  );
};
