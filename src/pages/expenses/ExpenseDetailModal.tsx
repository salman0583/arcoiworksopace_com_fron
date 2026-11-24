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
  AlertCircle,
  Clock,
  Tag,
  Paperclip,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  ZoomIn,
  ImageOff,
  Eye,
  X,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  TransactionTypeBadge,
  TransactionStatusBadge,
  RecordTypeBadge,
  getPaymentMethodLabel,
} from '../../components/expenses/ExpenseBadges';
import { expensesApi } from '../../api/expenses';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';
import { resolveMediaUrl, isImageFile, isPdfFile, getFilenameFromUrl } from '../../utils/media';
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
  const [imageError, setImageError] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setLoading(true);
      setError(null);
      setImageError(false);
      setIsZoomOpen(false);
      expensesApi
        .get(transactionId)
        .then(res => setDetail(res))
        .catch(() => setError('Failed to load transaction details.'))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
      setImageError(false);
      setIsZoomOpen(false);
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

          {/* Receipt Attachment Section */}
          <div>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#667085', marginBottom: '6px' }}>
              Supporting Document / Receipt
            </span>
            {detail.receipt_attachment ? (() => {
              const fileUrl = resolveMediaUrl(detail.receipt_attachment);
              const isImg = isImageFile(detail.receipt_attachment);
              const isPdf = isPdfFile(detail.receipt_attachment);
              const fileName = getFilenameFromUrl(detail.receipt_attachment);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {isImg && !imageError ? (
                    <div className="voucher-receipt-box">
                      <img
                        src={fileUrl}
                        alt="Receipt"
                        className="voucher-receipt-img"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  ) : isImg && imageError ? (
                    <div className="voucher-receipt-fallback">
                      <ImageOff size={22} color="#D92D20" />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                        Receipt Preview Unavailable
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        File cannot be rendered inline (offline storage or archived).
                      </div>
                    </div>
                  ) : isPdf ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="#DC2626" />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>{fileName}</span>
                      </div>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #E5E9F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <Paperclip size={14} color="#64748B" />
                      <span style={{ fontSize: '12.5px', color: '#172033', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName}
                      </span>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563EB',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#EFF6FF',
                      }}
                    >
                      <Download size={13} />
                      Download
                    </a>
                  </div>
                </div>
              );
            })() : (
              <div
                style={{
                  padding: '14px 16px',
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
