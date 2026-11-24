import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ShoppingCart, Clock, CheckCircle2, AlertTriangle, Truck,
  FileText, Award, DollarSign, Plus, CheckCheck, Ban, ArrowRight,
  Download, Building2, User, Calendar, ShieldCheck, ChevronRight,
  ExternalLink, Layers, Check, Edit,
} from 'lucide-react';
import type {
  ProcurementRequestDetail,
  ProcurementStatus,
} from '../../types/procurement';
import { procurementApi } from '../../api/procurement';
import { useAuth } from '../../context/AuthContext';
import {
  ProcurementStatusBadge,
  RequestTypeBadge,
  ProcurementPriorityBadge,
  ReceivingConditionBadge,
} from './ProcurementBadges';
import { Button, LoadingSpinner } from '../ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { QuotationComparisonModal } from './QuotationComparisonModal';
import { AddQuotationModal } from './AddQuotationModal';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import { OrderModal } from '../../pages/procurement/OrderModal';
import { ReceiveModal } from '../../pages/procurement/ReceiveModal';
import { CreateAssetModal } from '../../pages/procurement/CreateAssetModal';
import { UpdateSoftwareModal } from '../../pages/procurement/UpdateSoftwareModal';

interface ProcurementDetailDrawerProps {
  procurementId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const ProcurementDetailDrawer: React.FC<ProcurementDetailDrawerProps> = ({
  procurementId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isITAdmin = user && ['it_admin', 'super_admin'].includes(user.role);

  const [procurement, setProcurement] = useState<ProcurementRequestDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAddQuotationOpen, setIsAddQuotationOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
  const [isUpdateSoftwareOpen, setIsUpdateSoftwareOpen] = useState(false);

  // Approval / Reject modal prompts
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await procurementApi.get(id);
      setProcurement(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load procurement details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && procurementId) {
      fetchDetail(procurementId);
    } else {
      setProcurement(null);
    }
  }, [isOpen, procurementId]);

  // Handle ESC key listener
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

  const handleApprove = async () => {
    if (!procurement) return;
    setActionLoading(true);
    try {
      await procurementApi.approve(procurement.id, approvalComment.trim());
      setIsApproveOpen(false);
      setApprovalComment('');
      fetchDetail(procurement.id);
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!procurement || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await procurementApi.reject(procurement.id, rejectionReason.trim());
      setIsRejectOpen(false);
      setRejectionReason('');
      fetchDetail(procurement.id);
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.approval_comment?.[0] || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!procurement) return;
    setActionLoading(true);
    try {
      await procurementApi.cancel(procurement.id, cancelReason.trim());
      setIsCancelOpen(false);
      setCancelReason('');
      fetchDetail(procurement.id);
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancellation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!procurement) return;
    if (!window.confirm('Are you sure you want to mark this purchase request as Completed?')) return;
    setActionLoading(true);
    try {
      await procurementApi.complete(procurement.id);
      fetchDetail(procurement.id);
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to complete procurement.');
    } finally {
      setActionLoading(false);
    }
  };

  const quotations = procurement?.quotations || [];
  const receivingLogs = procurement?.receiving_logs || [];
  const createdAssets = procurement?.created_assets || [];
  const pendingQty = procurement?.pending_quantity ?? 0;
  const receivedQty = procurement?.received_quantity ?? 0;
  const totalQty = procurement?.quantity ?? 1;
  const receiveProgress = Math.min(100, Math.round((receivedQty / totalQty) * 100));

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 900,
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '580px',
          maxWidth: '100vw',
          backgroundColor: '#FFFFFF',
          zIndex: 950,
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s ease-out',
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
            backgroundColor: '#172033',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '15px',
                color: '#38BDF8',
              }}
            >
              {procurement ? procurement.request_id : 'Purchasing Details'}
            </span>
            {procurement && (
              <>
                <ProcurementStatusBadge status={procurement.status} size="sm" />
                <ProcurementPriorityBadge priority={procurement.priority} size="sm" />
              </>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              cursor: 'pointer',
              color: '#FFFFFF',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div style={{ padding: '80px', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          ) : error || !procurement ? (
            <div style={{ padding: '20px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#B42318' }}>
              {error || 'Unable to display procurement request.'}
            </div>
          ) : (
            <>
              {/* Quick Contextual Action Bar */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Add / Compare Quotation Actions */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddQuotationOpen(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Add Quote
                </Button>

                {quotations.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCompareOpen(true)}
                    leftIcon={<Award size={14} />}
                  >
                    Compare ({quotations.length})
                  </Button>
                )}

                {/* Approve / Reject */}
                {isITAdmin && ['submitted', 'under_review', 'quotations_received', 'pending_approval'].includes(procurement.status) && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsApproveOpen(true)}
                      leftIcon={<CheckCircle2 size={14} />}
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRejectOpen(true)}
                      style={{ color: '#DC2626' }}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {/* Order */}
                {isITAdmin && procurement.status === 'approved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsOrderModalOpen(true)}
                    leftIcon={<Truck size={14} />}
                  >
                    Place Purchase Order
                  </Button>
                )}

                {/* Receive */}
                {isITAdmin && ['ordered', 'partially_received'].includes(procurement.status) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsReceiveModalOpen(true)}
                    leftIcon={<CheckCheck size={14} />}
                    style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
                  >
                    Log Receiving ({pendingQty} pending)
                  </Button>
                )}

                {/* Downstream Create Asset */}
                {isITAdmin && ['received', 'completed'].includes(procurement.status) && procurement.request_type === 'hardware' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCreateAssetOpen(true)}
                    leftIcon={<Layers size={14} />}
                  >
                    Create Asset
                  </Button>
                )}

                {/* Downstream Update Software */}
                {isITAdmin && ['received', 'completed'].includes(procurement.status) && ['software', 'license'].includes(procurement.request_type) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsUpdateSoftwareOpen(true)}
                    leftIcon={<Layers size={14} />}
                  >
                    Update Licenses
                  </Button>
                )}

                {/* Complete */}
                {isITAdmin && procurement.status === 'received' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleComplete}
                    isLoading={actionLoading}
                    style={{ backgroundColor: '#047857', borderColor: '#047857' }}
                  >
                    Mark Complete
                  </Button>
                )}

                {/* Cancel */}
                {!['completed', 'cancelled', 'rejected'].includes(procurement.status) && (
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#98A2B3',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 8px',
                      marginLeft: 'auto',
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* 1. Request Overview Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      {procurement.item_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <RequestTypeBadge type={procurement.request_type} size="sm" />
                      <span style={{ fontSize: '13px', color: '#667085' }}>
                        Qty: <strong style={{ color: '#172033' }}>{procurement.quantity} units</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>
                      Estimated Total
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7' }}>
                      {formatCurrency(parseFloat(procurement.estimated_total_cost) || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#667085' }}>
                      {formatCurrency(parseFloat(procurement.estimated_unit_cost) || 0)} / unit
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F5F7FA',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: '#667085' }}>Requested By:</span>{' '}
                    <strong style={{ color: '#172033' }}>{procurement.requester_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#667085' }}>Department:</span>{' '}
                    <strong style={{ color: '#172033' }}>{procurement.department_name || 'General IT'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#667085' }}>Requested Date:</span>{' '}
                    <strong style={{ color: '#172033' }}>{formatDate(procurement.created_at)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#667085' }}>Required By:</span>{' '}
                    <strong style={{ color: '#172033' }}>
                      {procurement.required_by_date ? formatDate(procurement.required_by_date) : 'Flexible'}
                    </strong>
                  </div>
                </div>

                {procurement.business_justification && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F5F7FA' }}>
                    <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Business Justification
                    </div>
                    <div style={{ fontSize: '13px', color: '#475467', marginTop: '4px', lineHeight: 1.5 }}>
                      {procurement.business_justification}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Order Tracking Timeline (Flipkart style) */}
              <OrderTrackingTimeline procurement={procurement} />

              {/* 2. Selected Vendor & Commercial Agreement (If finalized) */}
              {procurement.selected_quotation_detail && (
                <div
                  style={{
                    backgroundColor: '#ECFDF3',
                    padding: '16px 18px',
                    borderRadius: '10px',
                    border: '1px solid #D1FADF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '13px' }}>
                      <CheckCircle2 size={16} /> Selected Supplier Proposal
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCompareOpen(true)}
                      style={{ fontSize: '11px', height: '26px', color: '#047857' }}
                    >
                      Compare Others
                    </Button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#065F46' }}>
                        {procurement.selected_quotation_detail.vendor_name || procurement.actual_vendor_detail?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                        Quote Ref: <strong>{procurement.selected_quotation_detail.quotation_number}</strong>
                        {' • '}
                        Delivery: {procurement.selected_quotation_detail.delivery_timeline || 'Standard'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#047857' }}>
                        {formatCurrency(parseFloat(procurement.selected_quotation_detail.total_amount) || 0)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669' }}>
                        Terms: {procurement.selected_quotation_detail.payment_terms || 'Net 30'}
                      </div>
                    </div>
                  </div>

                  {procurement.selection_reason && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#065F46', fontStyle: 'italic', borderTop: '1px dashed #D1FADF', paddingTop: '6px' }}>
                      "{procurement.selection_reason}"
                    </div>
                  )}
                </div>
              )}

              {/* 3. Vendor Quotations Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#0284C7" />
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Vendor Quotations ({quotations.length})
                    </h4>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {quotations.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onClose();
                          navigate(`/procurement/quotation-comparison?id=${procurement.id}`);
                        }}
                        leftIcon={<Award size={14} />}
                      >
                        Compare All ({quotations.length})
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddQuotationOpen(true)}
                      leftIcon={<Plus size={14} />}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {quotations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#667085', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                    No quotations attached yet. Add proposals from vendors to compare pricing and delivery terms.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {quotations.map((q) => {
                      const total = parseFloat(q.total_amount) || 0;
                      const isSelected = q.is_selected || procurement.selected_quotation === q.id;

                      return (
                        <div
                          key={q.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #10B981' : '1px solid #E5E9F0',
                            backgroundColor: isSelected ? '#F0FDF4' : '#FAFAFA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: '#172033' }}>
                                {q.vendor_name || q.vendor_detail?.name}
                              </strong>
                              {isSelected && (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '8px' }}>
                                  SELECTED
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                              Ref: {q.quotation_number} • Delivery: {q.delivery_timeline || 'N/A'} • Terms: {q.payment_terms || 'Net 30'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#172033' }}>
                                {formatCurrency(total)}
                              </div>
                              {q.attachment_url && (
                                <a
                                  href={q.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '11px', color: '#0284C7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}
                                >
                                  <Download size={11} /> View PDF
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Purchase Order (PO) Details */}
              {procurement.order_number && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #E5E9F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Truck size={18} color="#0284C7" />
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Purchase Order: {procurement.order_number}
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#667085' }}>Order Date:</span>{' '}
                      <strong style={{ color: '#172033' }}>{procurement.order_date ? formatDate(procurement.order_date) : 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#667085' }}>Expected Delivery:</span>{' '}
                      <strong style={{ color: '#172033' }}>{procurement.expected_delivery_date ? formatDate(procurement.expected_delivery_date) : 'TBD'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#667085' }}>Vendor Supplier:</span>{' '}
                      <strong style={{ color: '#172033' }}>{procurement.actual_vendor_detail?.name || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#667085' }}>Actual Unit Cost:</span>{' '}
                      <strong style={{ color: '#172033' }}>
                        {procurement.actual_unit_cost ? formatCurrency(parseFloat(procurement.actual_unit_cost)) : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {procurement.order_document_url && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F5F7FA' }}>
                      <a
                        href={procurement.order_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284C7', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <Download size={14} /> Download Purchase Order Document
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Receiving & Delivery History */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCheck size={18} color="#059669" />
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Delivery & Receiving
                    </h4>
                  </div>

                  {isITAdmin && ['ordered', 'partially_received'].includes(procurement.status) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsReceiveModalOpen(true)}
                      leftIcon={<Plus size={14} />}
                      style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
                    >
                      Receive Items
                    </Button>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ margin: '10px 0 16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#172033' }}>
                      {receivedQty} of {totalQty} Received ({receiveProgress}%)
                    </span>
                    <span style={{ color: pendingQty === 0 ? '#059669' : '#EA580C', fontWeight: 600 }}>
                      {pendingQty === 0 ? 'Fully Delivered' : `${pendingQty} Pending Delivery`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E9F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${receiveProgress}%`,
                        height: '100%',
                        backgroundColor: pendingQty === 0 ? '#10B981' : '#2563EB',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Receiving Logs Table */}
                {receivingLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#667085', fontSize: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                    No delivery receipts recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {receivingLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '6px',
                          border: '1px solid #E5E9F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: '#172033' }}>+{log.quantity_received} units</strong>
                            <ReceivingConditionBadge condition={log.condition} size="sm" />
                          </div>
                          <div style={{ color: '#667085', marginTop: '2px' }}>
                            Received by {log.received_by_name || 'Staff'} on {formatDate(log.received_date)}
                          </div>
                          {log.notes && (
                            <div style={{ color: '#475467', fontStyle: 'italic', marginTop: '2px' }}>
                              "{log.notes}"
                            </div>
                          )}
                        </div>

                        {log.receiving_document_url && (
                          <a
                            href={log.receiving_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <Download size={14} /> Receipt
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Linked Assets / Software */}
              {(createdAssets.length > 0 || procurement.linked_software_name || procurement.linked_ticket_number) && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #E5E9F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Layers size={18} color="#0284C7" />
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Downstream Integrations
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {createdAssets.map((ast) => (
                      <div key={ast.id} style={{ padding: '8px 12px', backgroundColor: '#F0F9FF', borderRadius: '6px', border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#0369A1', fontFamily: 'monospace' }}>{ast.asset_tag}</span>
                          {' — '}
                          <span style={{ color: '#172033' }}>{ast.name}</span>
                        </div>
                        <span style={{ color: '#0284C7', fontWeight: 600 }}>In Asset Registry</span>
                      </div>
                    ))}

                    {procurement.linked_software_name && (
                      <div style={{ padding: '8px 12px', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #D1FADF', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#15803D', fontFamily: 'monospace' }}>{procurement.linked_software_code}</span>
                          {' — '}
                          <span style={{ color: '#172033' }}>{procurement.linked_software_name}</span>
                        </div>
                        <span style={{ color: '#16A34A', fontWeight: 600 }}>{procurement.linked_software_licenses} Total Seats</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7. Approval & Audit History */}
              {procurement.approved_by_name && (
                <div style={{ backgroundColor: '#F0FDF4', padding: '14px 16px', borderRadius: '8px', border: '1px solid #D1FADF', fontSize: '12px', color: '#166534' }}>
                  <strong>Approved By:</strong> {procurement.approved_by_name} on {formatDate(procurement.approved_date || '')}
                  {procurement.approval_comment && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{procurement.approval_comment}"</div>}
                </div>
              )}

              {procurement.rejected_by_name && (
                <div style={{ backgroundColor: '#FEF2F2', padding: '14px 16px', borderRadius: '8px', border: '1px solid #FECDCA', fontSize: '12px', color: '#B42318' }}>
                  <strong>Rejected By:</strong> {procurement.rejected_by_name} on {formatDate(procurement.rejected_date || '')}
                  {procurement.approval_comment && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{procurement.approval_comment}"</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {procurement && (
        <QuotationComparisonModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          procurement={procurement}
          onSelectQuotationSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
          onOpenAddQuotation={() => {
            setIsCompareOpen(false);
            setIsAddQuotationOpen(true);
          }}
        />
      )}

      {/* Add Quotation Modal */}
      {procurement && (
        <AddQuotationModal
          isOpen={isAddQuotationOpen}
          onClose={() => setIsAddQuotationOpen(false)}
          procurementId={procurement.id}
          procurementRequestId={procurement.request_id}
          itemName={procurement.item_name}
          quantity={procurement.quantity}
          onSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
        />
      )}

      {/* Order Modal */}
      {procurement && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          procurement={procurement}
          onSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
        />
      )}

      {/* Receive Modal */}
      {procurement && (
        <ReceiveModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          procurement={procurement}
          onSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
        />
      )}

      {/* Create Asset Modal */}
      {procurement && (
        <CreateAssetModal
          isOpen={isCreateAssetOpen}
          onClose={() => setIsCreateAssetOpen(false)}
          procurement={procurement}
          onSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
        />
      )}

      {/* Update Software Modal */}
      {procurement && (
        <UpdateSoftwareModal
          isOpen={isUpdateSoftwareOpen}
          onClose={() => setIsUpdateSoftwareOpen(false)}
          procurement={procurement}
          onSuccess={() => {
            fetchDetail(procurement.id);
            onUpdated();
          }}
        />
      )}

      {/* Approval Prompt Modal */}
      {isApproveOpen && procurement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '20px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0' }}>Approve Purchase Request</h3>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 14px 0' }}>
              Approve <strong>{procurement.request_id}</strong> ({procurement.item_name}) for purchasing.
            </p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Approval Comment (Optional):
            </label>
            <textarea
              rows={3}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="e.g. Budget approved under IT infrastructure budget."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsApproveOpen(false)} disabled={actionLoading}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleApprove} isLoading={actionLoading} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Prompt Modal */}
      {isRejectOpen && procurement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '20px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0', color: '#B42318' }}>Reject Purchase Request</h3>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 14px 0' }}>
              Please provide a reason for rejecting <strong>{procurement.request_id}</strong>.
            </p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Rejection Reason <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsRejectOpen(false)} disabled={actionLoading}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleReject} isLoading={actionLoading} disabled={!rejectionReason.trim()}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Prompt Modal */}
      {isCancelOpen && procurement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '20px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0', color: '#667085' }}>Cancel Purchase Request</h3>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 14px 0' }}>
              Are you sure you want to cancel request <strong>{procurement.request_id}</strong>?
            </p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Cancellation Reason (Optional):
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. No longer required / fulfilled through internal spares."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsCancelOpen(false)} disabled={actionLoading}>Close</Button>
              <Button variant="danger" size="sm" onClick={handleCancel} isLoading={actionLoading}>
                Cancel Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
