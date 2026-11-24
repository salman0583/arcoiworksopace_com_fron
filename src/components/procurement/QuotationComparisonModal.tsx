import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Award, Clock, DollarSign, ShieldCheck,
  CreditCard, FileText, Download, AlertCircle, Plus, Check,
  Layers, Info, TrendingDown, ArrowRight, CheckCheck,
  Search, ChevronDown, RefreshCw, ShoppingCart, User, Building2,
} from 'lucide-react';
import type {
  ProcurementRequestDetail,
  ProcurementRequestListItem,
  QuotationComparisonResponse,
  QuotationComparisonItemRow,
  QuotationVendorSummary,
} from '../../types/procurement';
import { procurementApi } from '../../api/procurement';
import { useAuth } from '../../context/AuthContext';
import { Button, LoadingSpinner } from '../ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AddQuotationModal } from './AddQuotationModal';
import { ProcurementStatusBadge } from './ProcurementBadges';

interface QuotationComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement?: ProcurementRequestDetail | ProcurementRequestListItem | null;
  onSelectQuotationSuccess?: () => void;
  onOpenAddQuotation?: () => void;
}

export const QuotationComparisonModal: React.FC<QuotationComparisonModalProps> = ({
  isOpen,
  onClose,
  procurement: initialProcurement,
  onSelectQuotationSuccess,
  onOpenAddQuotation,
}) => {
  const { user } = useAuth();
  const isITAdmin = user && ['it_admin', 'super_admin'].includes(user.role);

  // Active Selected Procurement Request
  const [activeProcurement, setActiveProcurement] = useState<
    ProcurementRequestDetail | ProcurementRequestListItem | null
  >(null);

  // Request list for dropdown selection
  const [allRequests, setAllRequests] = useState<ProcurementRequestListItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>('');

  // Comparison Data State
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<QuotationComparisonResponse | null>(null);
  const [selectedQid, setSelectedQid] = useState<number | null>(null);
  const [selectionReason, setSelectionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Internal Add Quotation Modal State
  const [isInternalAddQuotationOpen, setIsInternalAddQuotationOpen] = useState<boolean>(false);

  // Fetch list of active purchase requests for selection
  const fetchAllRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await procurementApi.list({
        // fetch up to 100 recent requests
      });
      setAllRequests(res.results || []);
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch comparison data for specific procurement request ID
  const fetchComparison = async (procId: number) => {
    setLoadingComparison(true);
    setError(null);
    try {
      const data = await procurementApi.compareQuotations(procId);
      setComparisonData(data);

      // Pre-set selected quotation if already marked
      const currentSelected = data.vendors?.find((v) => v.is_selected);
      if (currentSelected) {
        setSelectedQid(currentSelected.quotation_id);
        const summary = data.vendor_summaries?.find((s) => s.quotation_id === currentSelected.quotation_id);
        if (summary?.selection_notes) {
          setSelectionReason(summary.selection_notes);
        }
      } else {
        setSelectedQid(null);
        setSelectionReason('');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load quotation comparison data.');
    } finally {
      setLoadingComparison(false);
    }
  };

  // Sync state on modal open or prop changes
  useEffect(() => {
    if (isOpen) {
      fetchAllRequests();
      if (initialProcurement) {
        setActiveProcurement(initialProcurement);
        fetchComparison(initialProcurement.id);
      } else {
        setActiveProcurement(null);
        setComparisonData(null);
      }
    } else {
      setActiveProcurement(null);
      setComparisonData(null);
      setSelectedQid(null);
      setSelectionReason('');
      setError(null);
      setRequestSearchQuery('');
      setIsInternalAddQuotationOpen(false);
    }
  }, [isOpen, initialProcurement]);

  // Body scroll lock & Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // When active procurement changes
  const handleSelectRequest = (req: ProcurementRequestListItem) => {
    setActiveProcurement(req);
    fetchComparison(req.id);
  };

  const handleSelectVendorRadio = (qid: number) => {
    setSelectedQid(qid);
    const summary = comparisonData?.vendor_summaries?.find((s) => s.quotation_id === qid);
    if (summary?.is_lowest_comparable) {
      setSelectionReason('Selected based on lowest comparable proposal and complete technical compliance.');
    } else {
      setSelectionReason('Selected based on favorable delivery timeline, warranty support, and commercial terms.');
    }
  };

  const handleConfirmSelection = async () => {
    if (!activeProcurement || !selectedQid) {
      setError('Please select a vendor proposal.');
      return;
    }
    if (!selectionReason.trim()) {
      setError('Please provide a justification reason for audit compliance.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await procurementApi.selectQuotation(activeProcurement.id, selectedQid, selectionReason.trim());
      if (onSelectQuotationSuccess) {
        onSelectQuotationSuccess();
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to record vendor selection.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddQuote = () => {
    if (onOpenAddQuotation && initialProcurement) {
      onOpenAddQuotation();
    } else {
      setIsInternalAddQuotationOpen(true);
    }
  };

  const handleAddQuotationSuccess = () => {
    if (activeProcurement) {
      fetchComparison(activeProcurement.id);
      fetchAllRequests();
      if (onSelectQuotationSuccess) {
        onSelectQuotationSuccess();
      }
    }
  };

  // Filter requests for the selector
  const filteredRequests = useMemo(() => {
    if (!requestSearchQuery.trim()) return allRequests;
    const q = requestSearchQuery.toLowerCase();
    return allRequests.filter(
      (r) =>
        r.request_id.toLowerCase().includes(q) ||
        r.item_name.toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        (r.department_name && r.department_name.toLowerCase().includes(q))
    );
  }, [allRequests, requestSearchQuery]);

  if (!isOpen) return null;

  const canSelect =
    isITAdmin &&
    activeProcurement &&
    !['completed', 'cancelled', 'rejected'].includes(activeProcurement.status);
  const vendors = comparisonData?.vendors || [];
  const items = comparisonData?.items || [];
  const summaries = comparisonData?.vendor_summaries || [];
  const hasMultipleVendors = vendors.length >= 2;

  // Split into core matched items vs vendor-specific extra items
  const coreMatchedItems = items.filter(
    (row) => row.match_status !== 'VENDOR_SPECIFIC' && row.match_status !== 'EXTRA_ITEM'
  );
  const extraItems = items.filter(
    (row) => row.match_status === 'VENDOR_SPECIFIC' || row.match_status === 'EXTRA_ITEM'
  );

  // Tie detection for Lowest Comparable Proposal
  const validComparableSummaries = summaries.filter((s) => parseFloat(s.comparable_total) > 0);
  const minComparableValue = validComparableSummaries.length > 0
    ? Math.min(...validComparableSummaries.map((s) => parseFloat(s.comparable_total)))
    : 0;
  const lowestCompVendors = validComparableSummaries.filter(
    (s) => Math.abs(parseFloat(s.comparable_total) - minComparableValue) < 0.001
  );
  const isComparableTie = lowestCompVendors.length > 1;
  const lowestCompVendor = lowestCompVendors[0] || summaries.find((s) => s.is_lowest_comparable);

  const maxSavings = comparisonData?.max_savings ? parseFloat(comparisonData.max_savings) : 0;

  return (
    <div
      className="quotation-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="quotation-modal-dialog">
        {/* Top Header */}
        <div className="quotation-header-bar">
          <div>
            <div className="quotation-header-title-group">
              <Award size={20} color="#38BDF8" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Quotation Comparison Workspace
              </h2>
              {activeProcurement && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontFamily: 'monospace',
                  }}
                >
                  {activeProcurement.request_id}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0 0' }}>
              Compare multi-vendor price proposals, review like-for-like items, and select the winning supplier proposal.
            </p>
          </div>

          <div className="quotation-header-actions">
            {activeProcurement && canSelect && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenAddQuote}
                leftIcon={<Plus size={14} />}
                style={{ backgroundColor: '#1E293B', color: '#F1F5F9', borderColor: '#334155' }}
              >
                Add Vendor Quotation
              </Button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                cursor: 'pointer',
                color: '#CBD5E1',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Workspace (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Purchase Request Selection Bar */}
        <div className="quotation-selector-bar">
          <div className="quotation-selector-left">
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Purchase Request:
            </span>

            {/* Dropdown Selector */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '650px' }}>
              <select
                value={activeProcurement ? activeProcurement.id : ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!val) {
                    setActiveProcurement(null);
                    setComparisonData(null);
                  } else {
                    const found = allRequests.find((r) => r.id === val);
                    if (found) handleSelectRequest(found);
                  }
                }}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 32px 0 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: activeProcurement ? '#172033' : '#64748B',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">-- Select a Purchase Request to Compare --</option>
                {allRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.request_id} — {r.item_name} (Qty: {r.quantity}) • Requester: {r.requester_name} • {r.quotations_count || 0} Quote(s)
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                color="#64748B"
                style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {activeProcurement && (
            <div className="quotation-selector-meta">
              <span className="quotation-meta-pill">
                Qty: <strong style={{ color: '#172033' }}>{activeProcurement.quantity} units</strong>
              </span>
              <span className="quotation-meta-pill">
                Est. Budget:{' '}
                <strong style={{ color: '#0284C7' }}>
                  {formatCurrency(parseFloat(activeProcurement.estimated_total_cost) || 0)}
                </strong>
              </span>
              {activeProcurement.requester_name && (
                <span className="quotation-meta-pill">
                  Requester: <strong style={{ color: '#172033' }}>{activeProcurement.requester_name}</strong>
                </span>
              )}
              <ProcurementStatusBadge status={activeProcurement.status} size="sm" />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                borderRadius: '8px',
                color: '#B42318',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* STATE 1: NO PURCHASE REQUEST SELECTED YET (PATH A ENTRY POINT) */}
          {!activeProcurement ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    color: '#0284C7',
                  }}
                >
                  <Award size={24} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#172033', margin: '0 0 6px 0' }}>
                  Select a Purchase Request to Compare Quotations
                </h3>
                <p style={{ fontSize: '13px', color: '#667085', maxWidth: '580px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                  Choose any active purchase request below to review vendor quotations, analyze like-for-like pricing differences, or upload additional vendor proposals (.xlsx/.csv).
                </p>

                {/* Search Box */}
                <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
                  <Search
                    size={16}
                    color="#94A3B8"
                    style={{ position: 'absolute', left: '12px', top: '10px' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by Request ID, item name, requester, or department..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 12px 0 36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Purchase Request Selection Table */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #E5E9F0', backgroundColor: '#FAFAFA', fontWeight: 700, fontSize: '13px', color: '#172033' }}>
                  Available Purchase Requests ({filteredRequests.length})
                </div>

                {loadingRequests ? (
                  <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                    No purchase requests matched your search.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#475467', fontSize: '12px' }}>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Request ID</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Item Description</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Qty</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Requester</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Quotations</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((req, idx) => {
                          const qCount = req.quotations_count || 0;
                          return (
                            <tr
                              key={req.id}
                              style={{
                                borderBottom: '1px solid #E5E9F0',
                                backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleSelectRequest(req)}
                            >
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7' }}>
                                {req.request_id}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#172033' }}>
                                {req.item_name}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475467' }}>
                                {req.quantity} units
                              </td>
                              <td style={{ padding: '12px 16px', color: '#667085' }}>
                                {req.requester_name}
                                {req.department_name && ` (${req.department_name})`}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <ProcurementStatusBadge status={req.status} size="sm" />
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: qCount >= 2 ? '#ECFDF3' : qCount === 1 ? '#EFF6FF' : '#F1F5F9',
                                    color: qCount >= 2 ? '#027A48' : qCount === 1 ? '#1D4ED8' : '#64748B',
                                    border: `1px solid ${qCount >= 2 ? '#A6F4C5' : qCount === 1 ? '#BFDBFE' : '#E2E8F0'}`,
                                  }}
                                >
                                  {qCount >= 2 ? `${qCount} Quotes (Ready)` : qCount === 1 ? '1 Quote' : '0 Quotes'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectRequest(req);
                                  }}
                                  rightIcon={<ArrowRight size={13} />}
                                >
                                  {qCount >= 2 ? 'Compare' : 'Open'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : loadingComparison ? (
            <div style={{ padding: '80px', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          ) : !hasMultipleVendors ? (
            /* STATE 2: SINGLE OR ZERO VENDOR QUOTATIONS */
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px dashed #E5E9F0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  color: '#0284C7',
                }}
              >
                <Layers size={26} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#172033', margin: '0 0 6px 0' }}>
                Add At Least One More Vendor Quotation to Compare
              </h3>
              <p style={{ fontSize: '13px', color: '#667085', maxWidth: '540px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                {vendors.length === 1
                  ? `Currently, 1 quotation from "${vendors[0].vendor_name}" (Ref: ${vendors[0].quotation_number}) is attached to ${activeProcurement.request_id}. Upload a second proposal (.xlsx or .csv) to enable line-by-line price comparisons and like-for-like totals.`
                  : `No vendor quotations have been uploaded for ${activeProcurement.request_id} yet. Upload supplier proposals (.xlsx or .csv) to begin comparison.`}
              </p>

              {canSelect && (
                <Button variant="primary" size="md" onClick={handleOpenAddQuote} leftIcon={<Plus size={16} />}>
                  {vendors.length === 1 ? 'Upload Second Vendor Quotation' : 'Upload First Quotation'}
                </Button>
              )}

              {/* Display existing single quote preview if available */}
              {vendors.length === 1 && (
                <div
                  style={{
                    marginTop: '28px',
                    width: '100%',
                    maxWidth: '480px',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E9F0',
                    backgroundColor: '#F8FAFC',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Existing Quotation on File
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#172033' }}>
                      {vendors[0].vendor_name}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7' }}>
                      {formatCurrency(parseFloat(vendors[0].total_amount) || 0)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
                    Quote Ref: <strong>{vendors[0].quotation_number}</strong> • Delivery: {vendors[0].delivery_timeline || 'Standard'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STATE 3: FULL MULTI-VENDOR COMPARISON WORKSPACE */
            <>
              {/* 1. Comparison KPI Cards */}
              <div className="quotation-kpi-grid">
                {/* Total Vendors */}
                <div className="quotation-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Compared Suppliers
                    </span>
                    <Building2 size={16} color="#64748B" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#172033', marginTop: '6px' }}>
                    {vendors.length} Vendor Proposals
                  </div>
                  <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                    {comparisonData?.total_items_quoted || items.length} distinct line items parsed
                  </div>
                </div>

                {/* Common Items Matched */}
                <div className="quotation-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Common Matched Items
                    </span>
                    <CheckCircle2 size={16} color="#0284C7" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', marginTop: '6px' }}>
                    {comparisonData?.common_items_count || coreMatchedItems.length} Like-For-Like Items
                  </div>
                  <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                    Eligible for direct price comparison
                  </div>
                </div>

                {/* Lowest Comparable Proposal */}
                <div
                  className="quotation-kpi-card"
                  style={{
                    backgroundColor: isComparableTie ? '#EFF6FF' : '#F0FDF4',
                    borderColor: isComparableTie ? '#BFDBFE' : '#BBF7D0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isComparableTie ? '#1D4ED8' : '#166534',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {isComparableTie ? 'Tied Lowest Proposal' : 'Lowest Comparable Proposal'}
                    </span>
                    <Award size={16} color={isComparableTie ? '#1D4ED8' : '#15803D'} />
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: isComparableTie ? '#1D4ED8' : '#15803D',
                      marginTop: '6px',
                    }}
                  >
                    {minComparableValue > 0 ? formatCurrency(minComparableValue) : '—'}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: isComparableTie ? '#1D4ED8' : '#166534',
                      marginTop: '2px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isComparableTie
                      ? `Tied: ${lowestCompVendors.map((v) => v.vendor_name).join(' & ')}`
                      : lowestCompVendor
                      ? `${lowestCompVendor.vendor_name} (Comparable Total)`
                      : 'No common items matched'}
                  </div>
                </div>

                {/* Price Difference / Potential Savings */}
                <div
                  className="quotation-kpi-card"
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderColor: '#BFDBFE',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Comparable Price Spread
                    </span>
                    <TrendingDown size={16} color="#1D4ED8" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1D4ED8', marginTop: '6px' }}>
                    {formatCurrency(maxSavings)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '2px' }}>
                    {maxSavings > 0
                      ? 'Max savings between quoting vendors'
                      : vendors.length >= 2
                      ? 'Identical bids (₹0.00 variance)'
                      : 'Awaiting additional quotes'}
                  </div>
                </div>
              </div>

              {/* 2. Item-by-Item Multi-Vendor Comparison Table */}
              <div className="quotation-matrix-card">
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E5E9F0',
                    backgroundColor: '#FAFAFA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="#0284C7" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Item-by-Item Quotation Comparison Matrix
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: '#667085' }}>
                    Matched items compare identical units; vendor-specific extra items are segregated.
                  </div>
                </div>

                {(() => {
                  const vendorCount = Math.max(1, vendors.length);
                  const totalDynamicWeight = 1.35 + vendorCount * 1.0 + 0.9;
                  const itemWidthPct = ((1.35 / totalDynamicWeight) * 100).toFixed(1);
                  const vendorWidthPct = ((1.0 / totalDynamicWeight) * 100).toFixed(1);
                  const remarksWidthPct = ((0.9 / totalDynamicWeight) * 100).toFixed(1);
                  const tableMinCalculated = Math.max(860, 220 + 75 + vendorCount * 205 + 125 + 165);

                  return (
                    <div className="quotation-matrix-viewport">
                      <table className="quotation-matrix-table" style={{ minWidth: `${tableMinCalculated}px` }}>
                        <colgroup>
                          <col className="qmat-col-item" style={{ width: `${itemWidthPct}%` }} />
                          <col className="qmat-col-qty" style={{ width: '80px' }} />
                          {vendors.map((v) => (
                            <col key={`col-${v.quotation_id}`} className="qmat-col-vendor" style={{ width: `${vendorWidthPct}%` }} />
                          ))}
                          <col className="qmat-col-diff" style={{ width: '135px' }} />
                          <col className="qmat-col-remarks" style={{ width: `${remarksWidthPct}%` }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="sticky-col-item">
                              Item / Specification
                            </th>
                            <th className="qmat-col-qty" style={{ textAlign: 'center' }}>
                              Req. Qty
                            </th>
                            {vendors.map((v) => (
                              <th key={v.quotation_id} className="qmat-vendor-header">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                                    <div className="qmat-vendor-title">
                                      {v.vendor_name}
                                    </div>
                                    {v.is_selected && (
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          backgroundColor: '#D1FAE5',
                                          color: '#047857',
                                          padding: '2px 6px',
                                          borderRadius: '8px',
                                          flexShrink: 0,
                                        }}
                                      >
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>
                                    Ref: <strong>{v.quotation_number}</strong>
                                  </div>
                                  <div className="qmat-vendor-total">
                                    Total: {formatCurrency(v.total_amount)}
                                  </div>
                                </div>
                              </th>
                            ))}
                            <th className="qmat-cell-diff">
                              Price Difference
                            </th>
                            <th className="qmat-cell-remarks">
                              Comparison Result / Remarks
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Section 1: Core Requested / Common Matched Items */}
                          {coreMatchedItems.map((row, idx) => {
                            const isEven = idx % 2 === 0;
                            const rowBg = isEven ? '#FFFFFF' : '#FAFAFA';

                            return (
                              <tr key={row.match_key || idx} style={{ borderBottom: '1px solid #E5E9F0', backgroundColor: rowBg }}>
                                {/* Sticky Item Column */}
                                <td
                                  className="sticky-col-item qmat-cell-item"
                                  style={{
                                    padding: '12px 14px',
                                    backgroundColor: rowBg,
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: '#172033', fontSize: '13px' }}>
                                    {row.item_name}
                                  </div>
                                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: '#ECFDF3',
                                        color: '#027A48',
                                        border: '1px solid #A6F4C5',
                                        flexShrink: 0,
                                      }}
                                    >
                                      MATCHED
                                    </span>
                                  </div>
                                </td>

                                {/* Req Qty */}
                                <td className="qmat-cell-qty" style={{ padding: '12px 10px' }}>
                                  {activeProcurement.quantity}
                                </td>

                                {/* Vendor Offer Columns */}
                                {vendors.map((v) => {
                                  const offer = row.vendor_offers[String(v.quotation_id)];
                                  if (!offer || !offer.is_quoted || offer.status === 'NOT_QUOTED') {
                                    return (
                                      <td
                                        key={v.quotation_id}
                                        className="qmat-cell-vendor"
                                        style={{
                                          padding: '12px 14px',
                                          backgroundColor: '#F8FAFC',
                                        }}
                                      >
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: '#F1F5F9',
                                            color: '#64748B',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                          }}
                                        >
                                          Not Quoted
                                        </span>
                                      </td>
                                    );
                                  }

                                  const unitP = parseFloat(offer.unit_price || '0');
                                  const lineT = parseFloat(offer.line_total || '0');
                                  const isLowest = offer.is_lowest_price && row.quoted_vendors_count > 1;

                                  return (
                                    <td
                                      key={v.quotation_id}
                                      className="qmat-cell-vendor"
                                      style={{
                                        padding: '12px 14px',
                                        backgroundColor: isLowest ? '#F0FDF4' : 'transparent',
                                      }}
                                    >
                                      <div style={{ fontWeight: 700, color: isLowest ? '#047857' : '#0F172A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(lineT)}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(unitP)} <span style={{ fontWeight: 400 }}>/ unit</span> (Qty: {offer.quantity})
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                        {offer.qty_status === 'partial' && (
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 700,
                                              color: '#B45309',
                                              backgroundColor: '#FEF3C7',
                                              border: '1px solid #FDE68A',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            Partial: {offer.quantity} of {activeProcurement.quantity}
                                          </span>
                                        )}
                                        {isLowest && (
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 700,
                                              color: '#047857',
                                              backgroundColor: '#D1FAE5',
                                              border: '1px solid #A6F4C5',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '2px',
                                            }}
                                          >
                                            <Check size={10} /> Lowest Rate
                                          </span>
                                        )}
                                        {!isLowest && offer.price_delta_from_lowest && parseFloat(offer.price_delta_from_lowest) > 0 && (
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 600,
                                              color: '#92400E',
                                              backgroundColor: '#FEF3C7',
                                              border: '1px solid #FDE68A',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            +{formatCurrency(offer.price_delta_from_lowest)} / unit
                                          </span>
                                        )}
                                      </div>
                                      {offer.description && (
                                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', fontStyle: 'italic', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.4 }}>
                                          {offer.description}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Price Difference Column */}
                                <td className="qmat-cell-diff" style={{ padding: '12px 14px' }}>
                                  {row.quoted_vendors_count > 1 && parseFloat(row.price_difference) > 0 ? (
                                    <div>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap' }}>
                                        +{formatCurrency(row.price_difference)} / unit
                                      </div>
                                      {row.total_difference && parseFloat(row.total_difference) > 0 && (
                                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                          Total Diff: +{formatCurrency(row.total_difference)}
                                        </div>
                                      )}
                                    </div>
                                  ) : row.quoted_vendors_count === 1 ? (
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>Single quote</span>
                                  ) : (
                                    <span style={{ color: '#94A3B8' }}>—</span>
                                  )}
                                </td>

                                {/* Comparison Result / Remarks */}
                                <td className="qmat-cell-remarks" style={{ padding: '12px 14px' }}>
                                  {row.comparison_remark || (row.quoted_vendors_count === 1 ? 'Quoted only by 1 vendor' : 'Matched across quotations')}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Section 2: Additional / Vendor-Specific Extra Items */}
                          {extraItems.length > 0 && (
                            <>
                              <tr style={{ backgroundColor: '#FFFBEB', borderTop: '2px solid #FEF3C7', borderBottom: '1px solid #FDE68A' }}>
                                <td
                                  colSpan={2 + vendors.length + 2}
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#B45309',
                                  }}
                                >
                                  Additional / Vendor-Specific Extra Items (Excluded from common like-for-like comparison)
                                </td>
                              </tr>
                              {extraItems.map((row, idx) => (
                                <tr key={`extra-${idx}`} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FEFDF8' }}>
                                  <td
                                    className="sticky-col-item qmat-cell-item"
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: '#FEFDF8',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{row.item_name}</span>
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          backgroundColor: '#FEF3C7',
                                          color: '#92400E',
                                          border: '1px solid #FDE68A',
                                          flexShrink: 0,
                                        }}
                                      >
                                        Extra Item
                                      </span>
                                    </div>
                                  </td>
                                  <td className="qmat-cell-qty" style={{ padding: '10px 10px', color: '#94A3B8' }}>—</td>
                                  {vendors.map((v) => {
                                    const offer = row.vendor_offers[String(v.quotation_id)];
                                    if (!offer || !offer.is_quoted || offer.status === 'NOT_QUOTED') {
                                      return (
                                        <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 14px', color: '#94A3B8' }}>
                                          —
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 14px' }}>
                                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                          {formatCurrency(offer.line_total || '0')}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                          {formatCurrency(offer.unit_price || '0')} / unit (Qty: {offer.quantity})
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="qmat-cell-diff" style={{ padding: '10px 14px', color: '#94A3B8' }}>—</td>
                                  <td className="qmat-cell-remarks" style={{ padding: '10px 14px' }}>
                                    {row.comparison_remark || 'Vendor add-on item'}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* 3. Side-by-Side Vendor Financial Summaries & Commercial Breakdown */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: '0 0 10px 0' }}>
                  Vendor Summary & Financial Breakdown
                </h4>

                <div className="vendor-summaries-grid">
                  {summaries.map((s) => {
                    const isSelected = s.is_selected || selectedQid === s.quotation_id;
                    const compTot = parseFloat(s.comparable_total) || 0;
                    const extraTot = parseFloat(s.extra_items_total) || 0;
                    const fullTot = parseFloat(s.full_quoted_total) || 0;
                    const diffFromLowest = parseFloat(s.price_variance_from_lowest) || 0;
                    const isTied = isComparableTie && lowestCompVendors.some((lv) => lv.quotation_id === s.quotation_id);

                    // Check if vendor has partial coverage
                    const hasPartialCoverage = coreMatchedItems.some((it) => {
                      const off = it.vendor_offers[String(s.quotation_id)];
                      return !off || !off.is_quoted || off.qty_status === 'partial';
                    });

                    return (
                      <div
                        key={s.quotation_id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #10B981'
                            : isTied || s.is_lowest_comparable
                            ? '2px solid #38BDF8'
                            : '1px solid #E5E9F0',
                          boxShadow: isSelected
                            ? '0 8px 16px -4px rgba(16, 185, 129, 0.2)'
                            : '0 1px 3px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {/* Top Status Banner */}
                        {isSelected ? (
                          <div
                            style={{
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={13} /> SELECTED PROPOSAL
                          </div>
                        ) : isTied ? (
                          <div
                            style={{
                              backgroundColor: '#0284C7',
                              color: '#FFFFFF',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Award size={13} /> TIED LOWEST PROPOSAL
                          </div>
                        ) : s.is_lowest_comparable ? (
                          <div
                            style={{
                              backgroundColor: '#0284C7',
                              color: '#FFFFFF',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Award size={13} /> LOWEST COMPARABLE PROPOSAL
                          </div>
                        ) : null}

                        {/* Card Header */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F5F7FA' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                                Supplier
                              </div>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#172033', marginTop: '2px' }}>
                                {s.vendor_name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                                Quote Ref: <strong>{s.quotation_number}</strong>
                              </div>
                            </div>
                            {hasPartialCoverage && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Partial Coverage
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, backgroundColor: isSelected ? '#F0FDF4' : '#FAFAFA' }}>
                          {/* Comparable Total */}
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              backgroundColor: (s.is_lowest_comparable || isTied) ? '#ECFDF3' : '#FFFFFF',
                              border: `1px solid ${(s.is_lowest_comparable || isTied) ? '#A6F4C5' : '#E5E9F0'}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: (s.is_lowest_comparable || isTied) ? '#027A48' : '#172033' }}>
                                Comparable Total (Common Items)
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 800, color: (s.is_lowest_comparable || isTied) ? '#027A48' : '#172033' }}>
                                {formatCurrency(compTot)}
                              </span>
                            </div>
                            {diffFromLowest > 0 && (
                              <div style={{ fontSize: '11px', color: '#B42318', marginTop: '2px', fontWeight: 600 }}>
                                +{formatCurrency(diffFromLowest)} vs lowest bid
                              </div>
                            )}
                          </div>

                          {/* Extra Items Total */}
                          {extraTot > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#667085', padding: '0 4px' }}>
                              <span>Extra / Vendor-Specific Items:</span>
                              <strong style={{ color: '#172033' }}>+{formatCurrency(extraTot)}</strong>
                            </div>
                          )}

                          {/* Full Quoted Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '6px', borderTop: '1px solid #E5E9F0', padding: '6px 4px 0 4px' }}>
                            <span style={{ fontSize: '12px', color: '#475467', fontWeight: 600 }}>
                              Full Quoted Total:
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#172033' }}>
                              {formatCurrency(fullTot)}
                            </span>
                          </div>

                          {/* Commercial terms */}
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E9F0', fontSize: '11px', color: '#667085', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><strong>Delivery:</strong> {s.delivery_timeline || 'Standard'}</div>
                            <div><strong>Payment:</strong> {s.payment_terms || 'Net 30 days'}</div>
                            {s.warranty_terms && <div><strong>Warranty:</strong> {s.warranty_terms}</div>}
                          </div>
                        </div>

                        {/* Card Selection Footer */}
                        {canSelect && (
                          <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E9F0', backgroundColor: '#FFFFFF' }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: isSelected ? '#047857' : '#172033',
                              }}
                            >
                              <input
                                type="radio"
                                name="selected_vendor_quote"
                                checked={selectedQid === s.quotation_id}
                                onChange={() => handleSelectVendorRadio(s.quotation_id)}
                                style={{ width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
                              />
                              <span>{isSelected ? 'Selected Proposal' : 'Select Proposal'}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Selection Confirmation and Justification Form */}
              {canSelect && selectedQid && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid #E5E9F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Vendor Selection Justification
                    </h4>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '4px' }}>
                      Reason for selecting this vendor (Recorded for auditing & compliance) <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <textarea
                      rows={2}
                      value={selectionReason}
                      onChange={(e) => setSelectionReason(e.target.value)}
                      placeholder="e.g. Selected lowest comparable bid with compliant delivery timeline and warranty terms."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleConfirmSelection}
                      isLoading={submitting}
                      disabled={submitting || !selectedQid || !selectionReason.trim()}
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      leftIcon={<CheckCheck size={16} />}
                    >
                      Confirm Vendor Selection
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ fontSize: '12px', color: '#667085' }}>
            Phase 1: Deterministic spreadsheet line-item analysis & like-for-like comparison
          </div>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>

      {/* Internal Add Quotation Modal */}
      {activeProcurement && (
        <AddQuotationModal
          isOpen={isInternalAddQuotationOpen}
          onClose={() => setIsInternalAddQuotationOpen(false)}
          procurementId={activeProcurement.id}
          procurementRequestId={activeProcurement.request_id}
          itemName={activeProcurement.item_name}
          quantity={activeProcurement.quantity}
          onSuccess={handleAddQuotationSuccess}
        />
      )}
    </div>
  );
};
