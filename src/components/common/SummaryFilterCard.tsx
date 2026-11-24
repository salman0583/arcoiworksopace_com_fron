import React from 'react';

export interface SummaryFilterCardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  accentColor?: string;
  subtext?: string;
  isClickable?: boolean;
  progressBar?: {
    percent: number;
    color?: string;
  };
  children?: React.ReactNode;
}

export const SummaryFilterCard: React.FC<SummaryFilterCardProps> = ({
  title,
  count,
  icon,
  isActive = false,
  onClick,
  accentColor = '#2563EB',
  subtext,
  isClickable = true,
  progressBar,
  children,
}) => {
  const clickable = isClickable && Boolean(onClick);

  return (
    <div
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
        backgroundColor: isActive ? '#F8FAFC' : '#FFFFFF',
        borderRadius: '8px',
        border: isActive ? `2px solid ${accentColor}` : '1px solid #E5E9F0',
        boxShadow: isActive
          ? '0 3px 8px rgba(0, 0, 0, 0.08)'
          : '0 1px 2px rgba(16, 24, 40, 0.04)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        outline: 'none',
        minHeight: '74px',
        boxSizing: 'border-box',
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
            '0 1px 2px rgba(16, 24, 40, 0.04)';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
        {icon && (
          <div
            style={{
              color: accentColor,
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

      <div>
        <div
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          {count}
        </div>
        {progressBar && (
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#E2E8F0',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '6px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progressBar.percent))}%`,
                height: '100%',
                backgroundColor: progressBar.color || accentColor,
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
        {subtext && (
          <div
            style={{
              fontSize: '11.5px',
              color: '#667085',
              marginTop: progressBar ? '4px' : '4px',
            }}
          >
            {subtext}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
