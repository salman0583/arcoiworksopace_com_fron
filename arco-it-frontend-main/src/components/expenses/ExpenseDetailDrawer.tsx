// frontend/src/components/expenses/ExpenseDetailDrawer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Receipt,
  Calendar,
  User,
  CreditCard,
  FileText,
  Download,
  Ban,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Clock,
  Tag,
  Paperclip,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  TransactionTypeBadge,
  TransactionStatusBadge,
  RecordTypeBadge,
  getPaymentMethodLabel,
} from './ExpenseBadges';
import { expensesApi } from '../../api/expenses';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';
import type { ExpenseTransactionDetail } from '../../types';

interface ExpenseDetailDrawerProps {
  transactionId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onVoidClick?: (tx: ExpenseTransactionDetail) => void;
  canVoid?: boolean;
}

export const ExpenseDetailDrawer: React.FC<ExpenseDetailDrawerProps> = ({
  transactionId,
  isOpen,
  onClose,
  onVoidClick,
  canVoid = false,
}) => {
  const [detail, setDetail] = useState<ExpenseTransactionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch transaction details on open
  useEffect(() => {
    if (isOpen && transactionId) {
      setLoading(true);
      setError(null);
      expensesApi
        .get(transactionId)
        .then((res) => setDetail(res))
        .catch(() => setError('Failed to load transaction details.'))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [isOpen, transactionId]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPosted = detail?.status === 'POSTED';
  const isCashIn = detail?.transaction_type === 'CASH_IN';

  const isReceiptImage = detail?.receipt_attachment && (
    detail.receipt_attachment.toLowerCase().endsWith('.jpg') ||
    detail.receipt_attachment.toLowerCase().endsWith('.jpeg') ||
    detail.receipt_attachment.toLowerCase().endsWith('.png') ||
    detail.receipt_attachment.toLowerCase().endsWith('.webp')
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 26, 59, 0.4)',
          backdropFilter: 'blur(2px)',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '580px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1051,
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                backgroundColor: isCashIn ? '#ECFDF3' : '#FFF1F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCashIn ? '#059669' : '#E11D48',
              }}
            >
              {isCashIn ? <ArrowDownLeft size={18} /> : <Receipt size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#172033',
                  }}
                >
                  {detail ? detail.voucher_number : 'Loading Voucher...'}
                </span>
                {detail && (
                  <>
                    <TransactionTypeBadge type={detail.transaction_type} size="sm" />
                    <TransactionStatusBadge status={detail.status} size="sm" />
                  </>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#667085' }}>
                {detail ? `${isCashIn ? 'Cash Top-Up' : 'Office Expense'} Voucher` : 'Voucher Details'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: 30,
              height: 30,
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#667085',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E9F0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#667085',
                gap: '12px',
              }}
            >
              <LoadingSpinner size="lg" />
              <p style={{ fontSize: '14px', margin: 0 }}>Loading voucher record...</p>
            </div>
          ) : error || !detail ? (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px solid #FECDCA',
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontWeight: 600, fontSize: '15px', margin: '0 0 6px 0' }}>Error Loading Details</p>
              <p style={{ fontSize: '13px', margin: 0 }}>{error || 'Transaction voucher not found.'}</p>
            </div>
          ) : (
            <>
              {/* Financial Hero Banner */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: isCashIn ? '#F0FDF4' : '#FFF1F2',
                  borderRadius: '10px',
                  border: `1px solid ${isCashIn ? '#D1FADF' : '#FECDD3'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isCashIn ? '#166534' : '#9F1239',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}
                  >
                    {isCashIn ? 'Inflow Amount' : 'Disbursed Amount'}
                  </span>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: isCashIn ? '#15803D' : '#BE123C',
                      textDecoration: detail.status === 'VOIDED' ? 'line-through' : 'none',
                      marginTop: '2px',
                    }}
                  >
                    {isCashIn ? '+' : '−'} {formatINR(detail.amount)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085' }}>
                    Payment Method
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#172033', marginTop: '2px' }}>
                    {getPaymentMethodLabel(detail.payment_method)}
                  </div>
                </div>
              </div>

              {/* Void Status Alert (if voided) */}
              {detail.status === 'VOIDED' && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px solid #FECDCA',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B42318' }}>
                    <ShieldAlert size={18} />
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      This transaction was VOIDED
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#7F1D1D' }}>
                    <strong>Void Reason:</strong> {detail.void_reason || 'No reason specified'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#B42318', display: 'flex', gap: '16px' }}>
                    <span><strong>Voided By:</strong> {detail.voided_by?.full_name || 'Admin'}</span>
                    <span><strong>Voided At:</strong> {formatDateTime(detail.voided_at)}</span>
                  </div>
                </div>
              )}

              {/* Transaction Metadata Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Voucher Information
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Transaction Date
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#667085" />
                      {formatDate(detail.transaction_date)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Record Type
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RecordTypeBadge recordType={detail.record_type || 'REAL'} size="sm" />
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Category
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="#667085" />
                      {detail.category?.name || (isCashIn ? 'Cash Addition / Float Top-Up' : 'Uncategorized')}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Balance After Transaction
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                      {formatINR(detail.running_balance)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      {isCashIn ? 'Cash Source / Provider' : 'Recipient / Payee'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                      {detail.payee_or_source}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Payment Method
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} color="#667085" />
                      {getPaymentMethodLabel(detail.payment_method)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Authorized By
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#667085" />
                      {detail.authorized_by?.full_name || 'Admin'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Recorded By
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#667085" />
                      {detail.recorded_by?.full_name || 'Operator'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '2px' }}>
                      Created At
                    </span>
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#667085" />
                      {formatDateTime(detail.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  padding: '16px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>
                  Description & Operational Notes
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475467',
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                  }}
                >
                  {detail.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Receipt / Attachment Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  padding: '16px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
                  Receipt / Voucher Proof
                </h3>

                {detail.receipt_attachment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isReceiptImage && (
                      <div
                        style={{
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #E5E9F0',
                          backgroundColor: '#172033',
                          textAlign: 'center',
                          maxHeight: '260px',
                        }}
                      >
                        <img
                          src={detail.receipt_attachment}
                          alt="Receipt attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '260px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E5E9F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Paperclip size={16} color="#667085" />
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#172033',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {detail.receipt_attachment.split('/').pop() || 'Receipt File'}
                        </span>
                      </div>

                      <a
                        href={detail.receipt_attachment}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        <ExternalLink size={14} />
                        View / Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px dashed #E5E9F0',
                      textAlign: 'center',
                      color: '#667085',
                      fontSize: '13px',
                    }}
                  >
                    No receipt or voucher document attached.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {canVoid && detail && isPosted && onVoidClick && (
              <Button
                variant="danger"
                size="md"
                onClick={() => onVoidClick(detail)}
                leftIcon={<Ban size={15} />}
              >
                Void Voucher
              </Button>
            )}
          </div>

          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
