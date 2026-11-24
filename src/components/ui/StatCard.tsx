import React from 'react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  subtext?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  accentColor?: string;
  isActive?: boolean;
  onClick?: () => void;
  isClickable?: boolean;
  badge?: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const variantThemeMap: Record<
  string,
  {
    iconBg: string;
    iconColor: string;
    labelColor: string;
    accent: string;
  }
> = {
  default: {
    iconBg: '#F8FAFC',
    iconColor: '#475467',
    labelColor: '#475467',
    accent: '#1E40AF',
  },
  neutral: {
    iconBg: '#F8FAFC',
    iconColor: '#475467',
    labelColor: '#475467',
    accent: '#475467',
  },
  primary: {
    iconBg: '#EFF6FF',
    iconColor: '#1E40AF',
    labelColor: '#1E40AF',
    accent: '#1E40AF',
  },
  info: {
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    labelColor: '#1E40AF',
    accent: '#2563EB',
  },
  success: {
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
    labelColor: '#059669',
    accent: '#10B981',
  },
  warning: {
    iconBg: '#FFFAEB',
    iconColor: '#B54708',
    labelColor: '#B54708',
    accent: '#B54708',
  },
  danger: {
    iconBg: '#FEF2F2',
    iconColor: '#B42318',
    labelColor: '#B42318',
    accent: '#B42318',
  },
  purple: {
    iconBg: '#F9F5FF',
    iconColor: '#6941C6',
    labelColor: '#6941C6',
    accent: '#6941C6',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  icon,
  subtitle,
  subtext,
  trend,
  variant = 'default',
  accentColor,
  isActive = false,
  onClick,
  isClickable,
  badge,
  loading = false,
  style,
  className = '',
}) => {
  const displayLabel = label || title || '';
  const displaySubtext = subtitle || subtext || '';
  const theme = variantThemeMap[variant] || variantThemeMap.default;
  const effectiveAccent = accentColor || theme.accent;
  const clickable = (isClickable ?? Boolean(onClick)) && Boolean(onClick);

  return (
    <div
      className={className}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        padding: '12px 14px',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: isActive ? `2px solid ${effectiveAccent}` : '1px solid #E2E8F0',
        boxShadow: isActive
          ? '0 4px 12px rgba(0, 0, 0, 0.08)'
          : '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        outline: 'none',
        minHeight: '76px',
        boxSizing: 'border-box',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (clickable && !isActive) {
          e.currentTarget.style.borderColor = '#D0D5DD';
          e.currentTarget.style.boxShadow = '0 3px 8px rgba(16, 24, 40, 0.08)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (clickable && !isActive) {
          e.currentTarget.style.borderColor = '#E5E9F0';
          e.currentTarget.style.boxShadow =
            '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            color: accentColor ? accentColor : theme.labelColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
          }}
        >
          {displayLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {badge}
          {icon && (
            <div
              style={{
                color: accentColor || theme.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: 0.85,
              }}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Value & Metadata Row */}
      <div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          {loading ? '—' : value}
        </div>

        {(displaySubtext || trend) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#667085',
              marginTop: '4px',
            }}
          >
            {trend && (
              <span
                style={{
                  fontWeight: 600,
                  color: trend.isPositive ? '#15803D' : '#B42318',
                }}
              >
                {trend.value}
              </span>
            )}
            {displaySubtext && <span>{displaySubtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
