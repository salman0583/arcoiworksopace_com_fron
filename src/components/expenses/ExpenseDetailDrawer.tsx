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
  Wallet,
  ZoomIn,
  ImageOff,
  Eye,
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
import { resolveMediaUrl, isImageFile, isPdfFile, getFilenameFromUrl } from '../../utils/media';
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
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch transaction details on open
  useEffect(() => {
    if (isOpen && transactionId) {
      setLoading(true);
      setError(null);
      setImageError(false);
      setImageLoaded(false);
      setIsZoomOpen(false);

      expensesApi
        .get(transactionId)
        .then((res) => setDetail(res))
        .catch(() => setError('Failed to load transaction details.'))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
      setImageError(false);
      setImageLoaded(false);
      setIsZoomOpen(false);
    }
  }, [isOpen, transactionId]);

  // Handle ESC key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isZoomOpen) {
          setIsZoomOpen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isZoomOpen, onClose]);

  if (!isOpen) return null;

  const isPosted = detail?.status === 'POSTED';
  const isCashIn = detail?.transaction_type === 'CASH_IN';
  const isVoid = detail?.status === 'VOIDED';

  const rawAttachment = detail?.receipt_attachment;
  const fileUrl = resolveMediaUrl(rawAttachment);
  const isImg = isImageFile(rawAttachment);
  const isPdf = isPdfFile(rawAttachment);
  const fileName = getFilenameFromUrl(rawAttachment, 'Receipt_Voucher');

  return (
    <div className="voucher-drawer-overlay">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Slide-over Drawer Panel */}
      <div ref={drawerRef} className="voucher-drawer-panel">
        {/* Drawer Header */}
        <div className="voucher-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: isCashIn ? '#ECFDF3' : '#FFF1F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCashIn ? '#059669' : '#E11D48',
                flexShrink: 0,
              }}
            >
              {isCashIn ? <ArrowDownLeft size={20} /> : <Receipt size={20} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-family-mono, monospace)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0F172A',
                    letterSpacing: '0.02em',
                  }}
                >
                  {detail ? detail.voucher_number : 'Loading Voucher...'}
                </span>
                {detail && (
                  <>
                    <TransactionTypeBadge type={detail.transaction_type} size="sm" />
                    <TransactionStatusBadge status={detail.status} size="sm" />
                    {detail.record_type === 'DEMO' && (
                      <RecordTypeBadge recordType="DEMO" size="sm" />
                    )}
                  </>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                {detail ? `${isCashIn ? 'Cash Top-Up' : 'Office Expense'} Voucher Details` : 'Cash Ledger Voucher'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E2E8F0';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="voucher-body-scroll">
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '320px',
                color: '#64748B',
                gap: '14px',
              }}
            >
              <LoadingSpinner size="lg" />
              <p style={{ fontSize: '14px', margin: 0, fontWeight: 500 }}>
                Loading voucher record...
              </p>
            </div>
          ) : error || !detail ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px solid #FECDCA',
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontWeight: 600, fontSize: '15px', margin: '0 0 6px 0' }}>Error Loading Voucher</p>
              <p style={{ fontSize: '13px', margin: 0, color: '#B42318' }}>
                {error || 'Transaction voucher record was not found or has been removed.'}
              </p>
            </div>
          ) : (
            <>
              {/* 1. Financial Hero Card */}
              <div className={`voucher-hero-card ${isCashIn ? 'voucher-hero-inflow' : 'voucher-hero-outflow'}`}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isCashIn ? '#166534' : '#9F1239',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isCashIn ? 'Cash Inflow Amount' : 'Disbursed Outflow Amount'}
                    </span>
                    {isVoid && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#B42318',
                          backgroundColor: '#FEE4E2',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Voided
                      </span>
                    )}
                  </div>
                  <div
                    className="voucher-hero-amount"
                    style={{
                      color: isVoid ? '#98A2B3' : isCashIn ? '#15803D' : '#BE123C',
                      textDecoration: isVoid ? 'line-through' : 'none',
                    }}
                  >
                    {isCashIn ? '+' : '−'} {formatINR(detail.amount)}
                  </div>
                  <div style={{ fontSize: '12px', color: isCashIn ? '#15803D' : '#9F1239', marginTop: '2px', fontWeight: 500 }}>
                    {isCashIn ? 'Deposited into office cash reserve' : 'Petty cash disbursement from register'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Payment Mode
                  </span>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <CreditCard size={14} color="#64748B" />
                    <span>{getPaymentMethodLabel(detail.payment_method)}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                    Post-txn Balance: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{formatINR(detail.running_balance)}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Void Status Notice (if voided) */}
              {isVoid && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px solid #FECDCA',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B42318' }}>
                    <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                      This transaction is officially VOIDED
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.45 }}>
                    <strong>Audit Justification:</strong> {detail.void_reason || 'No justification specified'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#991B1B', display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span><strong>Voided By:</strong> {detail.voided_by?.full_name || 'Admin'}</span>
                    <span><strong>Timestamp:</strong> {formatDateTime(detail.voided_at)}</span>
                  </div>
                </div>
              )}

              {/* 3. Voucher Information Metadata Card */}
              <div className="voucher-card">
                <h3 className="voucher-card-title">
                  <Receipt size={14} color="#2563EB" />
                  <span>Voucher Information & Attribution</span>
                </h3>

                <div className="voucher-meta-grid">
                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Transaction Date</span>
                    <span className="voucher-meta-val">
                      <Calendar size={14} color="#64748B" />
                      {formatDate(detail.transaction_date)}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Expense Category</span>
                    <span className="voucher-meta-val">
                      <Tag size={14} color="#64748B" />
                      {detail.category?.name || (isCashIn ? 'Cash Addition / Top-Up' : 'General Office Operations')}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">
                      {isCashIn ? 'Inflow Source / Bank' : 'Vendor / Paid To'}
                    </span>
                    <span className="voucher-meta-val" style={{ color: '#0F172A', fontWeight: 700 }}>
                      <User size={14} color="#64748B" />
                      {detail.payee_or_source}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Running Balance</span>
                    <span className="voucher-meta-val" style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 700 }}>
                      <Wallet size={14} color="#059669" />
                      {formatINR(detail.running_balance)}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Authorized By</span>
                    <span className="voucher-meta-val">
                      <User size={14} color="#64748B" />
                      {detail.authorized_by?.full_name || 'Admin'}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Recorded By (System Operator)</span>
                    <span className="voucher-meta-val">
                      <User size={14} color="#64748B" />
                      {detail.recorded_by?.full_name || 'Operator'}
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Record Type</span>
                    <span className="voucher-meta-val">
                      <RecordTypeBadge recordType={detail.record_type || 'REAL'} size="sm" />
                    </span>
                  </div>

                  <div className="voucher-meta-item">
                    <span className="voucher-meta-label">Entry Timestamp</span>
                    <span className="voucher-meta-val" style={{ fontSize: '12.5px', color: '#475569' }}>
                      <Clock size={14} color="#64748B" />
                      {formatDateTime(detail.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Description & Operational Notes */}
              <div className="voucher-card">
                <h3 className="voucher-card-title">
                  <FileText size={14} color="#2563EB" />
                  <span>Description & Operational Notes</span>
                </h3>
                <div
                  style={{
                    fontSize: '13px',
                    color: detail.description ? '#334155' : '#94A3B8',
                    lineHeight: 1.55,
                    backgroundColor: '#F8FAFC',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    whiteSpace: 'pre-wrap',
                    fontStyle: detail.description ? 'normal' : 'italic',
                  }}
                >
                  {detail.description || 'No detailed itemization or operational notes were logged for this voucher.'}
                </div>
              </div>

              {/* 5. Receipt / Attachment Proof */}
              <div className="voucher-card">
                <h3 className="voucher-card-title">
                  <Paperclip size={14} color="#2563EB" />
                  <span>Receipt / Voucher Supporting Proof</span>
                </h3>

                {detail.receipt_attachment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Image Preview with Zoom and Fallback */}
                    {isImg && !imageError ? (
                      <div className="voucher-receipt-box">
                        {!imageLoaded && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                            }}
                          >
                            <LoadingSpinner size="md" />
                          </div>
                        )}
                        <img
                          src={fileUrl}
                          alt="Receipt attachment preview"
                          className="voucher-receipt-img"
                          onLoad={() => setImageLoaded(true)}
                          onError={() => setImageError(true)}
                        />
                        {imageLoaded && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              right: '10px',
                              display: 'flex',
                              gap: '6px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setIsZoomOpen(true)}
                              style={{
                                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backdropFilter: 'blur(4px)',
                              }}
                              title="Zoom full size preview"
                            >
                              <ZoomIn size={13} />
                              <span>Preview</span>
                            </button>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backdropFilter: 'blur(4px)',
                              }}
                              title="Open original file in new tab"
                            >
                              <ExternalLink size={13} />
                              <span>Open</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : isImg && imageError ? (
                      /* Clean Fallback for Broken or Missing Images */
                      <div className="voucher-receipt-fallback">
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#FEF3F2',
                            color: '#D92D20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ImageOff size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B' }}>
                            Receipt Preview Unavailable
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', marginTop: '2px', lineHeight: 1.4 }}>
                            The physical receipt image could not be rendered inline (file may be archived, stored in offline storage, or unavailable on the server).
                          </div>
                        </div>
                      </div>
                    ) : isPdf ? (
                      /* PDF Document Card */
                      <div
                        style={{
                          padding: '16px 18px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={20} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fileName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                              Adobe Acrobat PDF Document
                            </div>
                          </div>
                        </div>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            backgroundColor: '#EFF6FF',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            flexShrink: 0,
                          }}
                        >
                          <ExternalLink size={13} />
                          Open PDF
                        </a>
                      </div>
                    ) : (
                      /* Generic Document Card */
                      <div
                        style={{
                          padding: '14px 16px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <FileText size={20} color="#64748B" />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{fileName}</span>
                      </div>
                    )}

                    {/* Download & File Info Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E5E9F0',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <Paperclip size={14} color="#64748B" style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 500,
                            color: '#1E293B',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
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
                          gap: '5px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #DBEAFE',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Download size={13} />
                        Download File
                      </a>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px 20px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1.5px dashed #E2E8F0',
                      textAlign: 'center',
                      color: '#64748B',
                    }}
                  >
                    <Receipt size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4, color: '#94A3B8' }} />
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                      No Physical Receipt Attached
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                      This cash ledger voucher was logged without an electronic receipt or invoice attachment.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions (Sticky Bottom) */}
        <div className="voucher-footer-bar">
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

      {/* Full Size Image Lightbox / Modal */}
      {isZoomOpen && fileUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            title="Close preview"
          >
            <X size={20} />
          </button>
          <img
            src={fileUrl}
            alt="Receipt Full Preview"
            style={{
              maxWidth: '92vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
