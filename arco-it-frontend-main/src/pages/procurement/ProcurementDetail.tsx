import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Calendar, User, Building2,
  DollarSign, Truck, CheckCircle2, XCircle, Clock,
  FileText, ExternalLink, PlusCircle, PackageCheck, Layers,
  Laptop, AlertCircle, AlertTriangle, ShieldCheck, Tag
} from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { useAuth } from '../../context/AuthContext';
import type { ProcurementRequestDetail } from '../../types/procurement';
import {
  ProcurementStatusBadge,
  RequestTypeBadge,
  ProcurementPriorityBadge,
} from '../../components/procurement/ProcurementBadges';
import { Button, LoadingSpinner } from '../../components/ui';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { OrderModal } from './OrderModal';
import { OrderTrackingTimeline } from '../../components/procurement/OrderTrackingTimeline';

import { ReceiveModal } from './ReceiveModal';
import { CreateAssetModal } from './CreateAssetModal';
import { UpdateSoftwareModal } from './UpdateSoftwareModal';
import { QuotationComparisonModal } from '../../components/procurement/QuotationComparisonModal';
import { AddQuotationModal } from '../../components/procurement/AddQuotationModal';

export const ProcurementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [procurement, setProcurement] = useState<ProcurementRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAddQuotationModalOpen, setIsAddQuotationModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [isUpdateSoftwareModalOpen, setIsUpdateSoftwareModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isITAdmin = user && ['it_admin', 'super_admin'].includes(user.role);
  const isRequester = user && procurement && user.id === procurement.requester;

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await procurementApi.get(Number(id));
      setProcurement(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load procurement details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div style={{ padding: '80px', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !procurement) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={40} color="#EF4444" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '18px', color: '#172033' }}>{error || 'Procurement request not found.'}</h2>
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => navigate('/procurement')}>
            Return to Purchasing
          </Button>
        </div>
      </div>
    );
  }

  // Lifecycle Action Handlers
  const handleSubmitDraft = async () => {
    setIsActionLoading(true);
    try {
      await procurementApi.submit(procurement.id);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReview = async () => {
    setIsActionLoading(true);
    try {
      await procurementApi.review(procurement.id);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to mark under review.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Approve procurement request ${procurement.request_id}?`)) return;
    setIsActionLoading(true);
    try {
      await procurementApi.approve(procurement.id, 'Approved by IT Administrator');
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectComment.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setIsActionLoading(true);
    try {
      await procurementApi.reject(procurement.id, rejectComment.trim());
      setIsRejectModalOpen(false);
      setRejectComment('');
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm(`Mark procurement request ${procurement.request_id} as completed?`)) return;
    setIsActionLoading(true);
    try {
      await procurementApi.complete(procurement.id);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to complete request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter reason for cancellation:');
    if (reason === null) return;
    setIsActionLoading(true);
    try {
      await procurementApi.cancel(procurement.id, reason);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const percentReceived = Math.min(100, Math.round((procurement.received_quantity / procurement.quantity) * 100));
  const estTotal = parseFloat(procurement.estimated_total_cost) || 0;
  const actTotal = procurement.actual_total_cost ? parseFloat(procurement.actual_total_cost) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/procurement')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Purchasing</span>
        </button>
      </div>

      {/* Main Header Banner */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
              {procurement.request_id}
            </span>
            <ProcurementStatusBadge status={procurement.status} />
            <RequestTypeBadge type={procurement.request_type} />
            <ProcurementPriorityBadge priority={procurement.priority} />
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', margin: '0 0 4px 0', lineHeight: 1.2 }}>
            {procurement.item_name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#667085', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <User size={14} /> Requested by: <strong style={{ color: '#475467' }}>{procurement.requester_name}</strong>
            </span>
            {procurement.department_name && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={14} /> {procurement.department_name}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Created: {formatDate(procurement.created_at)}
            </span>
            {procurement.order_number && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={14} /> PO: <strong style={{ color: '#172033' }}>{procurement.order_number}</strong>
              </span>
            )}

          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Quotations Quick Action */}
          {isITAdmin && !['completed', 'cancelled', 'rejected'].includes(procurement.status) && (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsAddQuotationModalOpen(true)}
                leftIcon={<PlusCircle size={15} />}
              >
                Add Quotation
              </Button>
              {procurement.quotations && procurement.quotations.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setIsCompareModalOpen(true)}
                  leftIcon={<Layers size={15} />}
                >
                  Compare Quotations ({procurement.quotations.length})
                </Button>
              )}
            </>
          )}

          {/* Draft Actions */}
          {procurement.status === 'draft' && (
            <>
              <Button variant="primary" onClick={handleSubmitDraft} isLoading={isActionLoading}>
                Submit Request
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={isActionLoading}>
                Cancel
              </Button>
            </>
          )}

          {/* Submitted / Under Review Actions */}
          {['submitted', 'under_review', 'pending_approval'].includes(procurement.status) && (
            <>
              {isITAdmin && procurement.status === 'submitted' && (
                <Button variant="secondary" onClick={handleReview} disabled={isActionLoading}>
                  Mark Under Review
                </Button>
              )}
              {isITAdmin && (
                <>
                  <Button variant="primary" onClick={handleApprove} isLoading={isActionLoading} leftIcon={<CheckCircle2 size={16} />}>
                    Approve Request
                  </Button>
                  <Button variant="danger" onClick={() => setIsRejectModalOpen(true)} disabled={isActionLoading} leftIcon={<XCircle size={16} />}>
                    Reject
                  </Button>
                </>
              )}
              {(isRequester || isITAdmin) && (
                <Button variant="ghost" onClick={handleCancel} disabled={isActionLoading}>
                  Cancel Request
                </Button>
              )}
            </>
          )}

          {/* Approved Actions */}
          {procurement.status === 'approved' && isITAdmin && (
            <Button
              variant="primary"
              onClick={() => setIsOrderModalOpen(true)}
              leftIcon={<Truck size={16} />}
            >
              Record Purchase Order
            </Button>
          )}

          {/* Ordered / Partially Received Actions */}
          {['ordered', 'partially_received'].includes(procurement.status) && isITAdmin && (
            <Button
              variant="primary"
              onClick={() => setIsReceiveModalOpen(true)}
              leftIcon={<PackageCheck size={16} />}
            >
              Record Goods Receipt
            </Button>
          )}

          {/* Post-Delivery Integration Actions */}
          {['partially_received', 'received', 'completed'].includes(procurement.status) && isITAdmin && (
            <>
              {procurement.request_type === 'hardware' && (
                <Button
                  variant="secondary"
                  onClick={() => setIsCreateAssetModalOpen(true)}
                  leftIcon={<Laptop size={16} />}
                >
                  Create Asset in Inventory
                </Button>
              )}

              {['software', 'license'].includes(procurement.request_type) && (
                <Button
                  variant="secondary"
                  onClick={() => setIsUpdateSoftwareModalOpen(true)}
                  leftIcon={<Layers size={16} />}
                >
                  Update Software Licenses
                </Button>
              )}
            </>
          )}

          {/* Received -> Mark Completed */}
          {procurement.status === 'received' && isITAdmin && (
            <Button
              variant="primary"
              onClick={handleComplete}
              isLoading={isActionLoading}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Mark Completed
            </Button>
          )}
        </div>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="detail-grid-procurement">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Linked Ticket Banner */}
          {procurement.linked_ticket && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: '10px',
                border: '1px solid #B2CCFF',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#2563EB" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                    Originating Ticket: {procurement.linked_ticket_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2563EB' }}>
                    {procurement.linked_ticket_subject}
                  </div>
                </div>
              </div>
              <Link
                to={`/tickets/${procurement.linked_ticket}`}
                style={{ fontSize: '12px', fontWeight: 600, color: '#175CD3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View Ticket <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* Business Justification & Specs Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', marginBottom: '14px' }}>
              Request Details & Specifications
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: '4px' }}>
                Business Justification
              </div>
              <div style={{ fontSize: '14px', color: '#172033', lineHeight: 1.6, backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #F5F7FA' }}>
                {procurement.business_justification || 'No justification provided.'}
              </div>
            </div>

            {procurement.description && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Technical Specifications / Notes
                </div>
                <div style={{ fontSize: '13px', color: '#475467', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {procurement.description}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', paddingTop: '12px', borderTop: '1px solid #F5F7FA' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Required By</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {procurement.required_by_date ? formatDate(procurement.required_by_date) : 'Flexible'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Intended For</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {procurement.requested_for_name || procurement.requester_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Department</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {procurement.department_name || 'General IT'}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <DollarSign size={18} color="#059669" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Financial Metrics & Budget
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E5E9F0' }}>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                  Est. Unit Cost
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#172033', marginTop: '4px' }}>
                  {formatCurrency(parseFloat(procurement.estimated_unit_cost) || 0)}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E5E9F0' }}>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                  Est. Total Budget
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#172033', marginTop: '4px' }}>
                  {formatCurrency(estTotal)}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #D1FADF' }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                  Actual Total Spend
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
                  {actTotal !== null ? formatCurrency(actTotal) : 'Pending Order'}
                </div>
              </div>


              {actTotal !== null && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: actTotal <= estTotal ? '#ECFDF3' : '#FEF2F2', border: `1px solid ${actTotal <= estTotal ? '#D1FADF' : '#FECDCA'}` }}>
                  <div style={{ fontSize: '11px', color: actTotal <= estTotal ? '#065F46' : '#B42318', fontWeight: 600, textTransform: 'uppercase' }}>
                    Budget Variance
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: actTotal <= estTotal ? '#047857' : '#DC2626', marginTop: '4px' }}>
                    {actTotal <= estTotal
                      ? `-₹${(estTotal - actTotal).toLocaleString()} (Savings)`
                      : `+₹${(actTotal - estTotal).toLocaleString()} (Over budget)`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Quotations Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#0284C7" />
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Vendor Quotations ({procurement.quotations?.length || 0})
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {procurement.quotations && procurement.quotations.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/procurement/quotation-comparison?id=${procurement.id}`)}
                    leftIcon={<Layers size={14} />}
                  >
                    Compare Proposals ({procurement.quotations.length})
                  </Button>
                )}
                {isITAdmin && !['completed', 'cancelled', 'rejected'].includes(procurement.status) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddQuotationModalOpen(true)}
                    leftIcon={<PlusCircle size={14} />}
                  >
                    Add Quote
                  </Button>
                )}
              </div>
            </div>

            {(!procurement.quotations || procurement.quotations.length === 0) ? (
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center', fontSize: '12px', color: '#98A2B3' }}>
                No vendor proposals attached yet. Upload Excel (.xlsx) or CSV (.csv) quotation spreadsheets to compare prices and select a vendor.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {procurement.quotations.map((q) => {
                  const isSelected = q.is_selected || procurement.selected_quotation === q.id;
                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
                        border: isSelected ? '1.5px solid #10B981' : '1px solid #E5E9F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '13px', color: '#172033' }}>
                            {q.vendor_name || q.vendor_detail?.name}
                          </strong>
                          {isSelected && (
                            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#D1FAE5', color: '#047857', padding: '1px 6px', borderRadius: '4px' }}>
                              SELECTED VENDOR
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                          Ref: {q.quotation_number} • Delivery: {q.delivery_timeline || 'Standard'} • Terms: {q.payment_terms || 'Net 30'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#172033' }}>
                          {formatCurrency(parseFloat(q.total_amount) || 0)}
                        </div>
                        {q.attachment_url && (
                          <a
                            href={q.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '11px', color: '#0284C7', textDecoration: 'none' }}
                          >
                            Download Proposal
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vendor and Purchase Order Details Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Truck size={18} color="#0284C7" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Vendor & Order Fulfillment
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Vendor</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {procurement.actual_vendor_detail ? (
                    <Link to={`/vendors/${procurement.actual_vendor}`} style={{ color: '#0284C7', textDecoration: 'none' }}>
                      {procurement.actual_vendor_detail.name}
                    </Link>
                  ) : procurement.preferred_vendor_detail ? (
                    <span>{procurement.preferred_vendor_detail.name} (Preferred)</span>
                  ) : (
                    <span style={{ color: '#98A2B3' }}>Unspecified</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>PO Number</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {procurement.order_number || <span style={{ color: '#98A2B3' }}>Not Placed Yet</span>}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Order Date</span>
                <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                  {procurement.order_date ? formatDate(procurement.order_date) : 'N/A'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>Expected Delivery</span>
                <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                  {procurement.expected_delivery_date ? formatDate(procurement.expected_delivery_date) : 'TBD'}
                </div>
              </div>

            </div>

            {procurement.order_notes && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F5F7FA', fontSize: '13px', color: '#667085' }}>
                <strong style={{ color: '#475467' }}>Order Notes: </strong> {procurement.order_notes}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Order Tracking Timeline (Flipkart style) */}
          <OrderTrackingTimeline procurement={procurement} />

          {/* Receiving Progress & Log Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageCheck size={18} color="#059669" />
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Delivery Progress
                </h2>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: procurement.is_fully_received ? '#059669' : '#0284C7' }}>
                {procurement.received_quantity} of {procurement.quantity} received ({percentReceived}%)
              </span>
            </div>

            {/* Gauge progress bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E9F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div
                style={{
                  width: `${percentReceived}%`,
                  height: '100%',
                  backgroundColor: procurement.is_fully_received ? '#10B981' : '#2563EB',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Receiving History Logs */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: '8px' }}>
              Receiving Log History
            </div>

            {procurement.receiving_logs.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center', fontSize: '12px', color: '#98A2B3' }}>
                No goods receipt recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {procurement.receiving_logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E5E9F0',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#172033' }}>
                        + {log.quantity_received} unit(s) received
                      </span>
                      <span style={{ color: '#667085' }}>
                        {formatDate(log.received_date)}
                      </span>

                    </div>
                    <div style={{ color: '#475569' }}>
                      Condition: <strong style={{ color: log.condition === 'good' ? '#059669' : '#DC2626' }}>{log.condition}</strong>
                      {log.received_by_name && ` • Logged by ${log.received_by_name}`}
                    </div>
                    {log.notes && (
                      <div style={{ color: '#667085', marginTop: '2px', fontStyle: 'italic' }}>
                        "{log.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Created Assets Card (for Hardware) */}
          {procurement.request_type === 'hardware' && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Laptop size={18} color="#2563EB" />
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Created Asset Records ({procurement.created_assets.length})
                  </h2>
                </div>
                {isITAdmin && procurement.received_quantity > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateAssetModalOpen(true)}
                    leftIcon={<PlusCircle size={14} />}
                  >
                    Add Asset
                  </Button>
                )}
              </div>

              {procurement.created_assets.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center', fontSize: '12px', color: '#98A2B3' }}>
                  No physical assets created from this purchase yet. Click "Create Asset in Inventory" once units arrive.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {procurement.created_assets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E5E9F0',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Link
                          to={`/assets/${asset.id}`}
                          style={{ fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}
                        >
                          {asset.asset_tag}
                        </Link>
                        <div style={{ color: '#475467', marginTop: '2px' }}>
                          {asset.name} {asset.serial_number && `(${asset.serial_number})`}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: asset.status === 'available' ? '#ECFDF3' : '#EFF6FF',
                          color: asset.status === 'available' ? '#065F46' : '#1E40AF',
                          textTransform: 'capitalize',
                        }}
                      >
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Software License Allocation Card (for Software) */}
          {['software', 'license'].includes(procurement.request_type) && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#7C3AED" />
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Software License Allocation
                  </h2>
                </div>
                {isITAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUpdateSoftwareModalOpen(true)}
                    leftIcon={<PlusCircle size={14} />}
                  >
                    Allocate Licenses
                  </Button>
                )}
              </div>

              {procurement.linked_software ? (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#5B21B6' }}>
                      {procurement.linked_software_name}
                    </span>
                    <Link
                      to={`/software/${procurement.linked_software}`}
                      style={{ fontSize: '11px', fontWeight: 600, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      View Software <ExternalLink size={11} />
                    </Link>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6D28D9', marginTop: '4px' }}>
                    Code: <strong>{procurement.linked_software_code}</strong> • Total Capacity: <strong>{procurement.linked_software_licenses} seats</strong>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center', fontSize: '12px', color: '#98A2B3' }}>
                  No software record linked yet. Click "Allocate Licenses" to attach these purchased seats to Software Management.
                </div>
              )}
            </div>
          )}

          {/* Approval & Lifecycle Audit Box */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} color="#475569" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Approval & Audit Summary
              </h2>
            </div>

            {procurement.approved_by_name && (
              <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#ECFDF3', border: '1px solid #D1FADF', marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ color: '#065F46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
                  <span>Approved by {procurement.approved_by_name} on {procurement.approved_date ? formatDate(procurement.approved_date) : ''}</span>
                </div>
                {procurement.approval_comment && (
                  <div style={{ color: '#047857', marginTop: '3px', fontStyle: 'italic', paddingLeft: '20px' }}>
                    "{procurement.approval_comment}"
                  </div>
                )}
              </div>
            )}

            {procurement.rejected_by_name && (
              <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECDCA', marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ color: '#B42318', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
                  <span>Rejected by {procurement.rejected_by_name} on {procurement.rejected_date ? formatDate(procurement.rejected_date) : ''}</span>
                </div>
                {procurement.approval_comment && (
                  <div style={{ color: '#B42318', marginTop: '3px', fontStyle: 'italic', paddingLeft: '20px' }}>
                    Reason: "{procurement.approval_comment}"
                  </div>
                )}
              </div>
            )}


            <div style={{ fontSize: '12px', color: '#667085', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <div>Submitted by: <strong>{procurement.requester_name}</strong> ({procurement.requester_email})</div>
              <div>System Created: {new Date(procurement.created_at).toLocaleString()}</div>
              <div>Last Updated: {new Date(procurement.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          procurement={procurement}
          onSuccess={fetchDetail}
        />
      )}

      {isReceiveModalOpen && (
        <ReceiveModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          procurement={procurement}
          onSuccess={fetchDetail}
        />
      )}

      {isCreateAssetModalOpen && (
        <CreateAssetModal
          isOpen={isCreateAssetModalOpen}
          onClose={() => setIsCreateAssetModalOpen(false)}
          procurement={procurement}
          onSuccess={fetchDetail}
        />
      )}

      {isUpdateSoftwareModalOpen && (
        <UpdateSoftwareModal
          isOpen={isUpdateSoftwareModalOpen}
          onClose={() => setIsUpdateSoftwareModalOpen(false)}
          procurement={procurement}
          onSuccess={fetchDetail}
        />
      )}

      {/* Rejection Dialog */}
      {isRejectModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#B42318', margin: '0 0 8px 0' }}>
              Reject Procurement Request
            </h3>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 14px 0' }}>
              Please provide a clear justification for rejecting request {procurement.request_id}. The requester will be notified.
            </p>
            <textarea
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g. Budget constraints for Q3 / Duplicate request / Hardware model not supported..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleRejectConfirm} isLoading={isActionLoading}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Comparison Workspace Modal */}
      <QuotationComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        procurement={procurement}
        onSelectQuotationSuccess={() => {
          setIsCompareModalOpen(false);
          fetchDetail();
        }}
        onOpenAddQuotation={() => {
          setIsCompareModalOpen(false);
          setIsAddQuotationModalOpen(true);
        }}
      />

      {/* Add Quotation Modal */}
      <AddQuotationModal
        isOpen={isAddQuotationModalOpen}
        onClose={() => setIsAddQuotationModalOpen(false)}
        procurementId={procurement.id}
        procurementRequestId={procurement.request_id}
        itemName={procurement.item_name}
        quantity={procurement.quantity}
        onSuccess={() => {
          fetchDetail();
        }}
      />
    </div>
  );
};
