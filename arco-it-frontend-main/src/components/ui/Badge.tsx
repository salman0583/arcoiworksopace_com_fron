import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'active'
    | 'in_stock'
    | 'available'
    | 'paid'
    | 'approved'
    | 'resolved'
    | 'success'
    | 'in_progress'
    | 'ordered'
    | 'in_transit'
    | 'pending'
    | 'on_leave'
    | 'warning'
    | 'retired'
    | 'maintenance'
    | 'voided'
    | 'overdue'
    | 'critical'
    | 'error'
    | 'danger'
    | 'exited'
    | 'rejected'
    | 'inactive'
    | 'employee'
    | 'hr'
    | 'it_support'
    | 'it_admin'
    | 'super_admin'
    | 'info'
    | 'neutral'
    | 'primary'
    | 'purple'
    | 'default'
    | string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const variantStyles: Record<string, { bg: string; color: string; border: string; dotColor: string }> = {
  // Green / Positive
  active:      { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  in_stock:    { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  available:   { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  paid:        { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  approved:    { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  resolved:    { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },
  success:     { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', dotColor: '#12B76A' },

  // Amber / Warning / Pending
  on_leave:    { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },
  ordered:     { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },
  in_transit:  { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },
  pending:     { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },
  warning:     { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },

  // Blue / In Progress / Info / IT Support
  in_progress: { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', dotColor: '#2E90FA' },
  it_support:  { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', dotColor: '#2E90FA' },
  info:        { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', dotColor: '#2E90FA' },
  primary:     { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', dotColor: '#2E90FA' },

  // Red / Critical / Danger / Voided
  exited:      { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  retired:     { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  maintenance: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  voided:      { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  overdue:     { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  critical:    { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  error:       { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  danger:      { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },
  rejected:    { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', dotColor: '#F04438' },

  // Purple / HR / IT Admin
  it_admin:    { bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE', dotColor: '#9E77ED' },
  hr:          { bg: '#FDF4FF', color: '#86198F', border: '#F5D0FE', dotColor: '#C026D3' },
  purple:      { bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE', dotColor: '#9E77ED' },
  super_admin: { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', dotColor: '#F79009' },

  // Slate / Neutral / Inactive
  inactive:    { bg: '#F8FAFC', color: '#667085', border: '#E5E9F0', dotColor: '#98A2B3' },
  employee:    { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', dotColor: '#98A2B3' },
  neutral:     { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', dotColor: '#98A2B3' },
  default:     { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', dotColor: '#98A2B3' },
};

const sizeStyles = {
  sm: { padding: '2px 8px', fontSize: '11px', dotSize: '5px' },
  md: { padding: '3px 10px', fontSize: '12px', dotSize: '6px' },
  lg: { padding: '4px 12px', fontSize: '13px', dotSize: '7px' },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  style,
  className = '',
}) => {
  const safeVariant = variant && variantStyles[variant] ? variant : 'default';
  const styles = variantStyles[safeVariant];
  const sizes = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRadius: '9999px',
        fontWeight: 600,
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        letterSpacing: '0.02em',
        padding: sizes.padding,
        fontSize: sizes.fontSize,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: sizes.dotSize,
            height: sizes.dotSize,
            borderRadius: '50%',
            backgroundColor: styles.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};
