import React, { useState } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<string, { background: string; color: string; border: string; hoverBg: string; hoverBorder?: string; hoverColor?: string }> = {
  primary: {
    background: '#2563EB',
    color: '#FFFFFF',
    border: '1px solid #2563EB',
    hoverBg: '#175CD3',
    hoverBorder: '#175CD3',
  },
  secondary: {
    background: '#FFFFFF',
    color: '#172033',
    border: '1px solid #E5E9F0',
    hoverBg: '#F5F7FA',
    hoverBorder: '#D0D5DD',
  },
  ghost: {
    background: 'transparent',
    color: '#475467',
    border: '1px solid transparent',
    hoverBg: '#F5F7FA',
    hoverColor: '#172033',
  },
  danger: {
    background: '#DC2626',
    color: '#FFFFFF',
    border: '1px solid #DC2626',
    hoverBg: '#B42318',
    hoverBorder: '#B42318',
  },
  success: {
    background: '#16A34A',
    color: '#FFFFFF',
    border: '1px solid #16A34A',
    hoverBg: '#15803D',
    hoverBorder: '#15803D',
  },
};

const sizeStyles = {
  sm: { padding: '5px 10px', fontSize: '13px', height: '32px' },
  md: { padding: '8px 16px', fontSize: '14px', height: '38px' },
  lg: { padding: '10px 20px', fontSize: '15px', height: '44px' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  const dynamicBg = !disabled && !isLoading && isHovered ? currentVariant.hoverBg : currentVariant.background;
  const dynamicBorder = !disabled && !isLoading && isHovered && currentVariant.hoverBorder
    ? `1px solid ${currentVariant.hoverBorder}`
    : currentVariant.border;
  const dynamicColor = !disabled && !isLoading && isHovered && currentVariant.hoverColor
    ? currentVariant.hoverColor
    : currentVariant.color;

  return (
    <button
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      style={{
        background: dynamicBg,
        color: dynamicColor,
        border: dynamicBorder,
        ...currentSize,
        borderRadius: '8px',
        fontWeight: 600,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.65 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        ...style,
      }}
      {...props}
    >
      {isLoading && (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

