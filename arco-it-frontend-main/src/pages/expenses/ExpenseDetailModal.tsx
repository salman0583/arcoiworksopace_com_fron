// frontend/src/pages/expenses/ExpenseDetailModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Calendar,
  User,
  CreditCard,
  FileText,
  FileSpreadsheet,
  Download,
  Ban,
  CheckCircle2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { TransactionTypeBadge, TransactionStatusBadge, getPaymentMethodLabel } from '../../components/expenses/ExpenseBadges';
import { expensesApi } from '../../api/expenses';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';
import type { ExpenseTransactionDetail } from '../../types';

interface ExpenseDetailModalProps {
  transactionId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onVoidClick: (tx: ExpenseTransactionDetail) => void;
  canVoid: boolean;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  transactionId,
  isOpen,
  onClose,
  onVoidClick,
  canVoid,
}) => {
  const [detail, setDetail] = useState<ExpenseTransactionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      setLoading(true);
      setError(null);
      expensesApi
        .get(transactionId)
        .then(res => setDetail(res))
        .catch(() => setError('Failed to load transaction details.'))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [isOpen, transactionId]);

  if (!isOpen) return null;

  const isPosted = detail?.status === 'POSTED';
  const isCashIn = detail?.transaction_type === 'CASH_IN';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={detail ? `Voucher ${detail.voucher_number}` : 'Transaction Details'}
      subtitle={detail ? `${isCashIn ? 'Cash Top-Up' : 'Office Expense'} — ${formatDate(detail.transaction_date)}` : ''}
      size="md"
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error || !detail ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444' }}>
          <AlertCircle size={24} style={{ marginBottom: '8px' }} />
          <p>{error || 'Transaction not found.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Financial Hero Strip */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: isCashIn ? '#F0FDF4' : '#FFF1F2',
              borderRadius: '8px',
              border: `1px solid ${isCashIn ? '#D1FADF' : '#FECDD3'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: isCashIn ? '#166534' : '#9F1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isCashIn ? 'Inflow Amount' : 'Disbursed Amount'}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: isCashIn ? '#15803D' : '#BE123C' }}>
                {isCashIn ? '+' : '−'} {formatINR(detail.amount)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Balance After
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#172033' }}>
                {formatINR(detail.running_balance)}
              </div>
            </div>
          </div>

          {/* Badges strip */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TransactionTypeBadge type={detail.transaction_type} size="md" />
            <TransactionStatusBadge status={detail.status} size="md" />
            {detail.category && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#F5F7FA',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                {detail.category.name}
              </span>
            )}
          </div>

          {/* Void notice if voided */}
          {!isPosted && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#475569',
              }}
            >
              <div style={{ fontWeight: 600, color: '#B42318', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>This transaction is VOIDED (Balance contribution: ₹0.00)</span>
              </div>
              <div>
                <strong>Reason:</strong> {detail.void_reason || 'No justification provided'}
              </div>
              <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
                Voided by {detail.voided_by?.full_name || 'Admin'} on {formatDateTime(detail.voided_at)}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              padding: '14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                {isCashIn ? 'Received From / Source' : 'Paid To / Vendor'}
              </span>
              <strong style={{ color: '#172033', fontSize: '14px' }}>{detail.payee_or_source}</strong>
            </div>

            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Payment Method
              </span>
              <span style={{ color: '#172033' }}>{getPaymentMethodLabel(detail.payment_method)}</span>
            </div>

            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Authorized By
              </span>
              <span style={{ color: '#172033' }}>{detail.authorized_by?.full_name || '—'}</span>
            </div>

            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Recorded By
              </span>
              <span style={{ color: '#172033' }}>{detail.recorded_by?.full_name || '—'}</span>
            </div>

            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Transaction Date
              </span>
              <span style={{ color: '#172033' }}>{formatDate(detail.transaction_date)}</span>
            </div>

            <div>
              <span style={{ color: '#667085', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Logged in System
              </span>
              <span style={{ color: '#172033' }}>{formatDateTime(detail.created_at)}</span>
            </div>
          </div>

          {/* Description */}
          {detail.description && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#667085', marginBottom: '4px' }}>
                Description & Justification
              </span>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#475467',
                  lineHeight: 1.5,
                }}
              >
                {detail.description}
              </div>
            </div>
          )}

          {/* Receipt Attachment */}
          <div>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#667085', marginBottom: '4px' }}>
              Supporting Document / Receipt
            </span>
            {detail.receipt_attachment ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #B2CCFF',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={18} color="#2563EB" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E40AF' }}>
                    Receipt Attached
                  </span>
                </div>
                <a
                  href={detail.receipt_attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2563EB',
                    textDecoration: 'none',
                  }}
                >
                  View / Open <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#98A2B3',
                  textAlign: 'center',
                }}
              >
                No physical receipt attached for this voucher
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            {canVoid && isPosted ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onVoidClick(detail)}
                leftIcon={<Ban size={14} />}
              >
                Void Transaction
              </Button>
            ) : (
              <div />
            )}
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
