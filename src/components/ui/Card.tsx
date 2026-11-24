import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  noPadding?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon,
  noPadding = false,
  children,
  style,
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E5E9F0',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xs)',
        ...style,
      }}
      {...props}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderBottom: '1px solid #E5E9F0',
            backgroundColor: '#F9FAFB',
          }}
        >
          {icon}
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#172033' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '16px' }}>
        {children}
      </div>
    </div>
  );
};
