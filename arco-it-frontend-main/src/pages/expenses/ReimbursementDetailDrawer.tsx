import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  CheckCircle,
  XCircle,
  CreditCard,
  Ban,
  FileText,
  AlertCircle,
  ExternalLink,
  Calendar,
  User,
  Clock,
  Building,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  PenTool,
  Type,
  RotateCcw,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import type { ReimbursementDetail, ReimbursementStatus } from '../../types/expenses';

interface Props {
  reimbursementId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (reimbursement: ReimbursementDetail) => void;
}

export const ReimbursementDetailDrawer: React.FC<Props> = ({
  reimbursementId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const [detail, setDetail] = useState<ReimbursementDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals for actions
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [approverNameInput, setApproverNameInput] = useState<string>('Asif Hussain');
  const [approverSigMode, setApproverSigMode] = useState<'stamp' | 'draw' | 'type'>('stamp');
  const [approverTypedSig, setApproverTypedSig] = useState<string>('Asif Hussain');
  const [approverHasDrawn, setApproverHasDrawn] = useState<boolean>(false);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const approverCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const approverIsDrawingRef = useRef<boolean>(false);
  const approverLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [showPaidModal, setShowPaidModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [recordInLedger, setRecordInLedger] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && reimbursementId) {
      loadDetail(reimbursementId);
    } else {
      setDetail(null);
      setErrorMsg(null);
    }
  }, [isOpen, reimbursementId]);

  const loadDetail = async (id: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await expensesApi.getReimbursement(id);
      setDetail(data);
    } catch (err: any) {
      setErrorMsg('Failed to load reimbursement details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = user?.role === 'super_admin' || user?.role === 'it_admin';
  const isApplicant = user && detail && user.id === detail.applicant_user?.id;

  const handleDownloadPdf = async () => {
    if (!detail) return;
    try {
      await expensesApi.downloadReimbursementPdf(detail.id, detail.reimbursement_number);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  // Approver Canvas drawing handlers
  const getApproverCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = approverCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startApproverDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = approverCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    approverIsDrawingRef.current = true;
    const coords = getApproverCanvasCoordinates(e);
    approverLastPointRef.current = coords;

    ctx.beginPath();
    ctx.strokeStyle = '#0F2C59';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(coords.x, coords.y);
    ctx.arc(coords.x, coords.y, 0.5, 0, Math.PI * 2);
    ctx.stroke();
    setApproverHasDrawn(true);
  };

  const drawApprover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!approverIsDrawingRef.current || !approverCanvasRef.current) return;
    const ctx = approverCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const coords = getApproverCanvasCoordinates(e);
    ctx.beginPath();
    ctx.strokeStyle = '#0F2C59';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (approverLastPointRef.current) {
      ctx.moveTo(approverLastPointRef.current.x, approverLastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    approverLastPointRef.current = coords;
    setApproverHasDrawn(true);
  };

  const stopApproverDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (approverIsDrawingRef.current) {
      approverIsDrawingRef.current = false;
      approverLastPointRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const clearApproverCanvas = () => {
    const canvas = approverCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setApproverHasDrawn(false);
  };

  const generateApproverStamp = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 400, 120);

    // Signature name in elegant script
    ctx.fillStyle = '#0F2C59';
    ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || 'Asif Hussain', 200, 45);

    // Decorative underline
    ctx.beginPath();
    ctx.strokeStyle = '#3A7BE0';
    ctx.lineWidth = 1.5;
    ctx.moveTo(90, 72);
    ctx.lineTo(310, 72);
    ctx.stroke();

    // Authority subtitle
    ctx.fillStyle = '#4A729D';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('OFFICIALLY APPROVED • MANAGEMENT', 200, 92);

    return canvas.toDataURL('image/png');
  };

  const generateApproverTypedSignature = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 400, 120);
    ctx.fillStyle = '#0F2C59';
    ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || 'Asif Hussain', 200, 60);

    return canvas.toDataURL('image/png');
  };

  const getApproverSignatureDataUrl = (): string => {
    if (approverSigMode === 'stamp') {
      return generateApproverStamp(approverNameInput.trim() || 'Asif Hussain');
    } else if (approverSigMode === 'draw') {
      if (approverHasDrawn && approverCanvasRef.current) {
        return approverCanvasRef.current.toDataURL('image/png');
      }
      return generateApproverTypedSignature(approverNameInput.trim() || 'Asif Hussain');
    } else {
      return generateApproverTypedSignature(approverTypedSig.trim() || approverNameInput.trim() || 'Asif Hussain');
    }
  };

  const handleOpenApproveModal = () => {
    if (!detail) return;
    const designatedName = detail.approver_name || user?.full_name || 'Asif Hussain';
    setApproverNameInput(designatedName);
    setApproverTypedSig(designatedName);
    setApprovalNotes('');
    setApproverHasDrawn(false);
    setApproverSigMode('stamp');
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    setActionLoading(true);
    try {
      const sigData = getApproverSignatureDataUrl();
      const updated = await expensesApi.approveReimbursement(detail.id, {
        approver_name: approverNameInput.trim() || 'Asif Hussain',
        manager_signature: sigData,
        approval_notes: approvalNotes.trim(),
      });
      setDetail(updated);
      onUpdated(updated);
      setShowApproveModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to approve reimbursement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !rejectReason.trim()) return;

    setActionLoading(true);
    try {
      const updated = await expensesApi.rejectReimbursement(detail.id, rejectReason.trim());
      setDetail(updated);
      onUpdated(updated);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to reject reimbursement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    setActionLoading(true);
    try {
      const updated = await expensesApi.markReimbursementPaid(detail.id, {
        payment_method: paymentMethod,
        payment_reference: paymentRef.trim(),
        record_in_cash_ledger: recordInLedger,
      });
      setDetail(updated);
      onUpdated(updated);
      setShowPaidModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to mark reimbursement as paid.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    if (!window.confirm(`Are you sure you want to cancel claim ${detail.reimbursement_number}?`)) return;

    setActionLoading(true);
    try {
      const updated = await expensesApi.cancelReimbursement(detail.id);
      setDetail(updated);
      onUpdated(updated);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to cancel reimbursement.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Clock size={13} /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <CheckCircle size={13} /> Approved (Ready for Payout)
          </span>
        );
      case 'PAID':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <ShieldCheck size={13} /> Paid / Disbursed
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <XCircle size={13} /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Ban size={13} /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formatDocumentDate = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return String(dateVal);
    }
  };

  const formatDocumentDateTime = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const datePart = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return String(dateVal);
    }
  };

  const formattedAppDate = detail ? formatDocumentDate(detail.application_date) : '';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7, 26, 59, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 900,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '740px',
            height: '100%',
            backgroundColor: '#FFFFFF',
            boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* DRAWER TOP BAR */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#071A3B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={22} color="#2FB4E5" />
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {detail?.reimbursement_number || 'Reimbursement Claim'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                  ARCO Digital Reimbursement Form
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {detail && getStatusBadge(detail.status)}
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ACTION TOOLBAR */}
          {detail && (
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              {/* Left Action: PDF Download */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Download size={15} color="#3A7BE0" /> Download PDF Form
              </button>

              {/* Right Workflow Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAdmin && detail.status === 'PENDING_APPROVAL' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        border: '1px solid #F87171',
                        backgroundColor: '#FEF2F2',
                        color: '#B91C1C',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenApproveModal}
                      disabled={actionLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <CheckCircle size={15} /> Approve Claim
                    </button>
                  </>
                )}

                {isAdmin && detail.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => setShowPaidModal(true)}
                    disabled={actionLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#3A7BE0',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(58, 123, 224, 0.3)',
                    }}
                  >
                    <CreditCard size={15} /> Disburse Funds (Mark Paid)
                  </button>
                )}

                {isApplicant && detail.status === 'PENDING_APPROVAL' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Ban size={15} /> Cancel Claim
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DRAWER CONTENT */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F8FAFC' }}>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    border: '3px solid #CBD5E1',
                    borderTopColor: '#3A7BE0',
                    borderRadius: '50%',
                    margin: '0 auto 12px auto',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Loading Reimbursement Form...
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #F87171',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            {detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* REJECTION REASON ALERT (IF REJECTED) */}
                {detail.status === 'REJECTED' && detail.rejection_reason && (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      color: '#991B1B',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} /> Claim Rejected
                    </div>
                    <div>{detail.rejection_reason}</div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '6px' }}>
                      Rejected by {detail.rejected_by?.full_name || 'Admin'} on{' '}
                      {detail.rejected_at ? new Date(detail.rejected_at).toLocaleString() : ''}
                    </div>
                  </div>
                )}

                {/* LINKED CASH VOUCHER ALERT (IF PAID) */}
                {detail.status === 'PAID' && (
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      color: '#065F46',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} /> Disbursed &amp; Paid
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        {detail.expense_voucher_number ? (
                          <>
                            Linked to Petty Cash Voucher:{' '}
                            <strong style={{ fontFamily: 'monospace' }}>{detail.expense_voucher_number}</strong>
                          </>
                        ) : (
                          'Payment processed'
                        )}
                        {detail.payment_reference && ` (Ref: ${detail.payment_reference})`}
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#047857', textAlign: 'right' }}>
                      Paid by {detail.paid_by?.full_name || 'Accounts'}
                      {detail.paid_at && (
                        <div>{new Date(detail.paid_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* DIGITAL FORM DOCUMENT CONTAINER */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '32px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* 1. Header with Logo, Divider & Contact */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src="/arco-logo.png"
                        alt="arcofintech"
                        style={{ height: '34px', width: 'auto' }}
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#071A3B' }}>
                        arcofintech
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
                      <div style={{ width: '2px', backgroundColor: '#8EB1D6' }} />
                      <div style={{ fontSize: '11px', color: '#556B82', lineHeight: 1.5 }}>
                        <div>+91 40 4995 0864</div>
                        <div>hr@arcofintech.com</div>
                        <div>arcofintech.com</div>
                        <div style={{ marginTop: '4px', fontWeight: 700, color: '#1E293B', fontSize: '12px' }}>
                          {formattedAppDate}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Title: Reimbursement Form */}
                  <div style={{ textAlign: 'center', margin: '16px 0 24px 0' }}>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#4A729D',
                        borderBottom: '2px solid #4A729D',
                        paddingBottom: '4px',
                      }}
                    >
                      Reimbursement Form
                    </span>
                  </div>

                  {/* 3. Employee Metadata (Uniform Clean Structured Layout) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '9px',
                      marginBottom: '24px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Date:</span>
                      <span style={{ color: '#334155' }}>{formattedAppDate}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Name:</span>
                      <span style={{ color: '#334155' }}>{detail.employee_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Employee ID:</span>
                      <span style={{ color: '#334155' }}>{detail.employee_id_code || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Department:</span>
                      <span style={{ color: '#334155' }}>{detail.department_name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Manager:</span>
                      <span style={{ color: '#334155' }}>{detail.manager_name || 'Asif Hussain'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: '130px', fontWeight: 700, color: '#1E293B', flexShrink: 0 }}>Purpose:</span>
                      <span style={{ color: '#334155' }}>{detail.purpose}</span>
                    </div>
                  </div>

                  {/* 4. Table */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        border: '1px solid #8EB1D6',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#4A729D', color: '#FFFFFF', textAlign: 'center' }}>
                            <th style={{ padding: '8px 10px', width: '110px', borderRight: '1px solid #8EB1D6' }}>
                              Date
                            </th>
                            <th style={{ padding: '8px 10px', borderRight: '1px solid #8EB1D6', textAlign: 'left' }}>
                              Description
                            </th>
                            <th style={{ padding: '8px 10px', width: '160px', borderRight: '1px solid #8EB1D6' }}>
                              Expensive Type
                            </th>
                            <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items && detail.items.length > 0 ? (
                            detail.items.map((it, idx) => (
                              <tr
                                key={it.id || idx}
                                style={{
                                  borderBottom: '1px solid #8EB1D6',
                                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FBFE',
                                }}
                              >
                                <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #8EB1D6' }}>
                                  {formatDocumentDate(it.item_date)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #8EB1D6' }}>
                                  {it.description}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #8EB1D6' }}>
                                  {it.expense_type}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>
                                  ₹{parseFloat(String(it.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748B' }}>
                                No line items recorded.
                              </td>
                            </tr>
                          )}

                          {/* Total Row */}
                          <tr style={{ backgroundColor: '#F0F6FC', borderTop: '2px solid #8EB1D6' }}>
                            <td colSpan={3} style={{ padding: '8px 12px', borderRight: '1px solid #8EB1D6' }}></td>
                            <td
                              style={{
                                padding: '8px 12px',
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                color: '#4A729D',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              TOTAL= ₹{parseFloat(detail.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: '11px',
                        fontStyle: 'italic',
                        color: '#4A729D',
                        marginTop: '4px',
                      }}
                    >
                      (don't forget to attach receipts)
                    </div>
                  </div>

                  {/* 5. Supporting Attachment */}
                  {detail.receipt_attachment ? (
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                        <Receipt size={16} color="#3A7BE0" />
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>Supporting Document Attached</span>
                      </div>
                      <a
                        href={detail.receipt_attachment}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#3A7BE0',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={13} /> View / Download Bill
                      </a>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#FFFBEB',
                        borderRadius: '6px',
                        border: '1px solid #FEF3C7',
                        marginBottom: '24px',
                        fontSize: '12px',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <AlertCircle size={14} /> No receipt file uploaded.
                    </div>
                  )}

                  {/* 6. Signatures */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginTop: '32px',
                      marginBottom: '24px',
                    }}
                  >
                    {/* Employee Signature */}
                    <div style={{ width: '230px' }}>
                      <div
                        style={{
                          height: '48px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-start',
                          marginBottom: '4px',
                        }}
                      >
                        {detail.employee_signature ? (
                          <img
                            src={detail.employee_signature}
                            alt="Employee Signature"
                            style={{
                              maxHeight: '44px',
                              maxWidth: '190px',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div style={{ fontStyle: 'italic', color: '#94A3B8', fontSize: '11px' }}>
                            Digitally Authorized
                          </div>
                        )}
                      </div>
                      <div style={{ borderBottom: '1.5px solid #8EB1D6', marginBottom: '6px' }} />
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#4A729D' }}>
                        Employee Signature
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                        <div>Digitally Submitted:</div>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {formatDocumentDateTime(detail.employee_signature_date || detail.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Manager Signature */}
                    <div style={{ width: '230px', textAlign: 'right' }}>
                      <div
                        style={{
                          height: '48px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-end',
                          marginBottom: '4px',
                        }}
                      >
                        {detail.manager_signature ? (
                          <img
                            src={detail.manager_signature}
                            alt="Manager Signature"
                            style={{
                              maxHeight: '44px',
                              maxWidth: '190px',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div style={{ fontStyle: 'italic', color: '#94A3B8', fontSize: '11px' }}>
                            {detail.status === 'APPROVED' || detail.status === 'PAID'
                              ? `Approved by ${detail.approver_name || 'Management'}`
                              : 'Pending Approval'}
                          </div>
                        )}
                      </div>
                      <div style={{ borderBottom: '1.5px solid #8EB1D6', marginBottom: '6px' }} />
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#4A729D' }}>
                        Manager Signature
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                        {detail.status === 'APPROVED' || detail.status === 'PAID' ? (
                          <div>
                            <div style={{ color: '#047857', fontWeight: 600 }}>
                              Approved by {detail.approver_name || 'Asif Hussain'}
                            </div>
                            <div style={{ color: '#047857', marginTop: '1px' }}>
                              Approved: {formatDocumentDateTime(detail.approved_at)}
                            </div>
                          </div>
                        ) : detail.status === 'REJECTED' ? (
                          <div>
                            <span style={{ color: '#B91C1C', fontWeight: 700 }}>REJECTED</span>
                            {detail.rejected_at && (
                              <div style={{ color: '#B91C1C', marginTop: '1px' }}>
                                Rejected: {formatDocumentDateTime(detail.rejected_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#92400E', fontWeight: 600 }}>Pending Review</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 7. Footer */}
                  <div
                    style={{
                      borderTop: '1px solid #8EB1D6',
                      paddingTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10.5px',
                      color: '#64748B',
                      lineHeight: 1.4,
                    }}
                  >
                    <div>
                      <div>Office # 1205, Gowra Fountain Head Building, HUDA Techno</div>
                      <div>Enclave, HITECH City, Hyderabad, Telangana 500081</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>
                      GSTIN: 36AAVCA2571L1Z3
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* APPROVE & CEO / MANAGER SIGNATURE MODAL */}
      {showApproveModal && detail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 26, 59, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#071A3B' }}>
                    Authorize &amp; Sign Claim
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Executive Approval &bull; {detail.reimbursement_number}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Claim Quick Summary Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '12.5px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ color: '#64748B' }}>Employee: </span>
                <strong style={{ color: '#0F172A' }}>{detail.employee_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Total Amount: </span>
                <strong style={{ color: '#059669', fontSize: '13.5px' }}>
                  ₹{parseFloat(detail.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748B' }}>Purpose: </span>
                <span style={{ color: '#334155' }}>{detail.purpose}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmApprove}>
              {/* Approver Designation / Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  Approver / Signatory Name:
                </label>
                <input
                  type="text"
                  value={approverNameInput}
                  onChange={(e) => {
                    setApproverNameInput(e.target.value);
                    if (approverSigMode === 'type') {
                      setApproverTypedSig(e.target.value);
                    }
                  }}
                  placeholder="e.g. Asif Hussain (Managing Director / CEO)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                  }}
                />
              </div>

              {/* Signature Mode Selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
                    Manager / CEO Digital Signature:
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      backgroundColor: '#F1F5F9',
                      padding: '2px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setApproverSigMode('stamp')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: approverSigMode === 'stamp' ? '#3A7BE0' : 'transparent',
                        color: approverSigMode === 'stamp' ? '#FFFFFF' : '#64748B',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Award size={11} /> CEO Stamp
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproverSigMode('draw')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: approverSigMode === 'draw' ? '#3A7BE0' : 'transparent',
                        color: approverSigMode === 'draw' ? '#FFFFFF' : '#64748B',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PenTool size={11} /> Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproverSigMode('type')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: approverSigMode === 'type' ? '#3A7BE0' : 'transparent',
                        color: approverSigMode === 'type' ? '#FFFFFF' : '#64748B',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Type size={11} /> Type
                    </button>
                  </div>
                </div>

                {/* Signature Capture / Preview Container */}
                <div
                  style={{
                    border: '1px dashed #8EB1D6',
                    borderRadius: '8px',
                    backgroundColor: '#FAFCFF',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '105px',
                  }}
                >
                  {approverSigMode === 'stamp' && (
                    <div
                      style={{
                        padding: '16px',
                        height: '105px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'italic 28px "Brush Script MT", "Caveat", "Segoe Script", cursive',
                          color: '#0F2C59',
                          marginBottom: '2px',
                        }}
                      >
                        {approverNameInput || 'Asif Hussain'}
                      </div>
                      <div
                        style={{
                          width: '180px',
                          height: '1px',
                          backgroundColor: '#3A7BE0',
                          marginBottom: '4px',
                        }}
                      />
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#4A729D', letterSpacing: '0.5px' }}>
                        OFFICIALLY APPROVED &bull; MANAGEMENT
                      </div>
                    </div>
                  )}

                  {approverSigMode === 'draw' && (
                    <div style={{ position: 'relative', width: '100%', height: '105px' }}>
                      <canvas
                        ref={approverCanvasRef}
                        width={480}
                        height={105}
                        onPointerDown={startApproverDrawing}
                        onPointerMove={drawApprover}
                        onPointerUp={stopApproverDrawing}
                        onPointerLeave={stopApproverDrawing}
                        style={{
                          width: '100%',
                          height: '105px',
                          display: 'block',
                          cursor: 'crosshair',
                          touchAction: 'none',
                        }}
                      />
                      {!approverHasDrawn && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94A3B8',
                            fontSize: '12px',
                            pointerEvents: 'none',
                            fontStyle: 'italic',
                          }}
                        >
                          Sign here with mouse or stylus
                        </div>
                      )}
                      {approverHasDrawn && (
                        <button
                          type="button"
                          onClick={clearApproverCanvas}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            padding: '3px 8px',
                            fontSize: '10.5px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            color: '#64748B',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <RotateCcw size={10} /> Clear
                        </button>
                      )}
                    </div>
                  )}

                  {approverSigMode === 'type' && (
                    <div style={{ padding: '12px 16px', height: '105px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <input
                        type="text"
                        value={approverTypedSig}
                        onChange={(e) => setApproverTypedSig(e.target.value)}
                        placeholder="Type signature name..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '12px',
                          marginBottom: '6px',
                        }}
                      />
                      <div
                        style={{
                          fontFamily: 'italic 26px "Brush Script MT", "Caveat", "Segoe Script", cursive',
                          color: '#0F2C59',
                          textAlign: 'center',
                        }}
                      >
                        {approverTypedSig || approverNameInput || 'Signature'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                  Approval Notes / Justification (Optional):
                </label>
                <input
                  type="text"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Verified with receipts and approved for cash disbursement."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {actionLoading ? (
                    'Authorizing...'
                  ) : (
                    <>
                      <CheckCircle size={15} /> Confirm Approval &amp; Sign Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
              Reject Reimbursement Claim
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Please provide a clear justification reason for rejecting this claim. This note will be sent directly
              to the employee.
            </p>
            <form onSubmit={handleReject}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing official tax invoice, expense item not pre-approved, out of policy..."
                required
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  marginBottom: '16px',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectReason.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK PAID / DISBURSE MODAL */}
      {showPaidModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#071A3B', marginBottom: '8px' }}>
              Disburse Reimbursement Payment
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Disburse <strong>₹{parseFloat(detail?.total_amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> to{' '}
              <strong>{detail?.employee_name}</strong>.
            </p>

            <form onSubmit={handleMarkPaid}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                  Disbursement Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                >
                  <option value="CASH">Physical Cash (Petty Cash Reserve)</option>
                  <option value="BANK_WITHDRAWAL">Bank Transfer / UPI</option>
                  <option value="OTHER">Cheque / Direct Payout</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                  Payment Reference / Cheque # / UPI UTR (Optional)
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI-12345678, CASH-DRAWER-01"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={recordInLedger}
                    onChange={(e) => setRecordInLedger(e.target.checked)}
                    style={{ accentColor: '#3A7BE0' }}
                  />
                  <span>
                    <strong>Record in Petty Cash Ledger:</strong> Automatically post an Expense Outflow transaction
                    under 'Employee Reimbursements' category.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaidModal(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#3A7BE0',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
