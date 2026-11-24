import React from 'react';

export interface SegmentedOption<T extends string = string> {
  key: T;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  accentColor?: string;
  badgeBg?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (key: T) => void;
  variant?: 'pill' | 'tabs' | 'segmented';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  variant = 'pill',
  size = 'md',
  style,
  className,
}: SegmentedControlProps<T>) {
  if (variant === 'tabs') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          borderBottom: '1px solid #E5E9F0',
          gap: '20px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          ...style,
        }}
      >
        {options.map((opt) => {
          const isActive = opt.key === value;
          const activeColor = opt.accentColor || '#2563EB';

          return (
            <button
              key={opt.key}
              type="button"
              disabled={opt.disabled}
              onClick={() => !opt.disabled && onChange(opt.key)}
              style={{
                padding: size === 'sm' ? '8px 4px' : '10px 4px',
                border: 'none',
                background: 'none',
                fontSize: size === 'sm' ? '13px' : '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? activeColor : '#667085',
                borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                opacity: opt.disabled ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '-1px',
                flexShrink: 0,
                fontFamily: 'inherit',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {opt.icon && (
                <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? activeColor : '#98A2B3' }}>
                  {opt.icon}
                </span>
              )}
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? (opt.badgeBg || '#EFF6FF') : '#F5F7FA',
                    color: isActive ? (opt.badgeColor || activeColor) : '#667085',
                    borderRadius: '10px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Connected Pill / Segmented Control Variant (variant === 'pill' or 'segmented')
  const isSm = size === 'sm';

  return (
    <div
      className={className}
      role="radiogroup"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        border: '1px solid #E5E9F0',
        borderRadius: '8px',
        padding: '3px',
        gap: '2px',
        maxWidth: '100%',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.key === value;
        const activeTextColor = opt.accentColor || '#172033';

        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.key)}
            style={{
              padding: isSm ? '4px 10px' : '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: isSm ? '12px' : '13px',
              fontWeight: isActive ? 600 : 500,
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              opacity: opt.disabled ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? activeTextColor : '#667085',
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
              userSelect: 'none',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive && !opt.disabled) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.color = '#172033';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !opt.disabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#667085';
              }
            }}
          >
            {opt.icon && (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? activeTextColor : '#98A2B3' }}>
                {opt.icon}
              </span>
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                style={{
                  backgroundColor: isActive ? (opt.badgeBg || '#EFF6FF') : 'rgba(0, 0, 0, 0.05)',
                  color: isActive ? (opt.badgeColor || activeTextColor) : '#667085',
                  borderRadius: '10px',
                  padding: isSm ? '1px 5px' : '2px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
