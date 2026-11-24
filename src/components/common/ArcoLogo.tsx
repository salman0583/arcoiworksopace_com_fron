import React from 'react';

interface ArcoMarkProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}

/**
 * Pure SVG vector of the approved ARCO geometric "A" mark.
 * Upper chevron: Deep royal/navy blue (#1E40AF -> #2563EB).
 * Lower wave: Dynamic sky/cyan wave ribbon (#38BDF8 -> #3B82F6).
 */
export const ArcoMark: React.FC<ArcoMarkProps> = ({
  size = 36,
  className = '',
  style = {},
  glow = false,
}) => {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox="0 0 100 100"
      width={width}
      height={height}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: glow ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.45))' : undefined,
        ...style,
      }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ARCO Workplace Mark"
    >
      <defs>
        <linearGradient id="arcoApexGrad" x1="15%" y1="90%" x2="85%" y2="10%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="arcoWaveGrad" x1="10%" y1="90%" x2="90%" y2="20%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* Upper Chevron / Apex of the A */}
      <path
        d="M 12 90 L 43 14 C 45.8 8 54.2 8 57 14 L 92 78 C 93.5 81 90.8 84.5 87 81.5 L 54.5 28 C 53 25 47 25 45.5 28 L 24 81 C 21.5 86.5 13.5 93 12 90 Z"
        fill="url(#arcoApexGrad)"
      />
      {/* Aerodynamic Wave Crossbar & Right Foot */}
      <path
        d="M 31.5 89 C 39 74 50 61.5 67 63 C 77 64 85.5 70.5 91 76.5 C 93.5 79.5 95 83 95 86.5 C 95 89.5 92.5 91.5 88 91.5 L 75 91.5 C 70.5 91.5 67 88 65 84.5 C 60 76 50 74 38 86.5 C 34.5 90 29.5 92.5 31.5 89 Z"
        fill="url(#arcoWaveGrad)"
      />
    </svg>
  );
};

interface ArcoLogoProps {
  variant?: 'full' | 'mark';
  layout?: 'horizontal' | 'stacked';
  theme?: 'light' | 'dark';
  markSize?: number;
  showSubtitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ArcoLogo: React.FC<ArcoLogoProps> = ({
  variant = 'full',
  layout = 'horizontal',
  theme = 'light',
  markSize = 36,
  showSubtitle = true,
  className = '',
  style = {},
}) => {
  if (variant === 'mark') {
    return <ArcoMark size={markSize} className={className} style={style} />;
  }

  const isDark = theme === 'dark';
  const primaryTextColor = isDark ? '#FFFFFF' : '#0F172A';
  const subtitleColor = isDark ? '#94A3B8' : '#475467';

  if (layout === 'stacked') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${Math.max(12, Math.round(markSize * 0.28))}px`,
          userSelect: 'none',
          ...style,
        }}
      >
        <ArcoMark size={markSize} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: `${Math.round(markSize * 0.44)}px`,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: primaryTextColor,
              lineHeight: 1.05,
            }}
          >
            ARCO
          </div>
          <div
            style={{
              fontSize: `${Math.round(markSize * 0.44)}px`,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: primaryTextColor,
              lineHeight: 1.05,
              marginTop: '1px',
            }}
          >
            Workplace
          </div>
          {showSubtitle && (
            <div
              style={{
                fontSize: `${Math.max(11, Math.round(markSize * 0.2))}px`,
                fontWeight: 500,
                letterSpacing: '0.01em',
                color: subtitleColor,
                marginTop: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              Workplace Operations Platform
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        userSelect: 'none',
        ...style,
      }}
    >
      <ArcoMark size={markSize} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontSize: `${Math.max(14, Math.round(markSize * 0.5))}px`,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: primaryTextColor,
              lineHeight: 1.15,
            }}
          >
            ARCO
          </span>
          <span
            style={{
              fontSize: `${Math.max(14, Math.round(markSize * 0.5))}px`,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: primaryTextColor,
              lineHeight: 1.15,
            }}
          >
            Workplace
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: `${Math.max(9.5, Math.round(markSize * 0.32))}px`,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              color: subtitleColor,
              marginTop: '2px',
              whiteSpace: 'nowrap',
              lineHeight: 1.15,
            }}
          >
            Workplace Operations Platform
          </span>
        )}
      </div>
    </div>
  );
};
