// frontend/src/components/expenses/ExpenseBadges.tsx
import React from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Ban } from 'lucide-react';
import type { ExpenseTransactionType, ExpenseTransactionStatus, ExpensePaymentMethod } from '../../types/expenses';

interface TransactionTypeBadgeProps {
  type: ExpenseTransactionType;
  size?: 'sm' | 'md';
}

export const TransactionTypeBadge: React.FC<TransactionTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const isCashIn = type === 'CASH_IN';
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '4px',
        padding: isSm ? '2px 8px' : '3px 10px',
        borderRadius: '12px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: isCashIn ? '#ECFDF3' : '#FEF2F2',
        color: isCashIn ? '#15803D' : '#B42318',
        border: `1px solid ${isCashIn ? '#D1FADF' : '#FECDCA'}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {isCashIn ? (
        <ArrowDownLeft size={isSm ? 12 : 14} color="#16A34A" strokeWidth={2.5} />
      ) : (
        <ArrowUpRight size={isSm ? 12 : 14} color="#DC2626" strokeWidth={2.5} />
      )}
      {isCashIn ? 'Cash In' : 'Cash Out'}
    </span>
  );
};

interface TransactionStatusBadgeProps {
  status: ExpenseTransactionStatus;
  size?: 'sm' | 'md';
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isPosted = status === 'POSTED';
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '4px',
        padding: isSm ? '2px 8px' : '3px 10px',
        borderRadius: '12px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: isPosted ? '#ECFDF3' : '#F8FAFC',
        color: isPosted ? '#15803D' : '#667085',
        border: `1px solid ${isPosted ? '#D1FADF' : '#E5E9F0'}`,
        textDecoration: isPosted ? 'none' : 'line-through',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {isPosted ? (
        <CheckCircle2 size={isSm ? 11 : 13} color="#16A34A" />
      ) : (
        <Ban size={isSm ? 11 : 13} color="#98A2B3" />
      )}
      {isPosted ? 'Posted' : 'Voided'}
    </span>
  );
};

export const getPaymentMethodLabel = (method: ExpensePaymentMethod | string): string => {
  switch (method) {
    case 'CASH':
      return 'Physical Cash';
    case 'BANK_WITHDRAWAL':
      return 'Bank Withdrawal';
    case 'PETTY_CASH':
      return 'Petty Cash Float';
    case 'OTHER':
      return 'Other';
    default:
      return method || 'Cash';
  }
};

interface RecordTypeBadgeProps {
  recordType?: string;
  size?: 'sm' | 'md';
}

export const RecordTypeBadge: React.FC<RecordTypeBadgeProps> = ({ recordType = 'REAL', size = 'sm' }) => {
  const isDemo = recordType === 'DEMO';
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '4px',
        padding: isSm ? '1px 6px' : '2px 8px',
        borderRadius: '4px',
        fontSize: isSm ? '10px' : '11px',
        fontWeight: 700,
        letterSpacing: '0.3px',
        backgroundColor: isDemo ? '#FEF3C7' : '#F1F5F9',
        color: isDemo ? '#92400E' : '#475569',
        border: `1px solid ${isDemo ? '#FDE68A' : '#E2E8F0'}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        textTransform: 'uppercase',
      }}
    >
      {isDemo ? 'DEMO / TEST' : 'REAL'}
    </span>
  );
};

