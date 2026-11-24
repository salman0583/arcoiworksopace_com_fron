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

  const lowestCompVendor = summaries.find((s) => s.is_lowest_comparable);
  const maxSavings = comparisonData?.max_savings ? parseFloat(comparisonData.max_savings) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1280px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#172033',
            color: '#FFFFFF',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Purchase Request Selection Bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#667085' }}>
              <span>
                Qty: <strong style={{ color: '#172033' }}>{activeProcurement.quantity} units</strong>
              </span>
              <span>•</span>
              <span>
                Est. Budget:{' '}
                <strong style={{ color: '#0284C7' }}>
                  {formatCurrency(parseFloat(activeProcurement.estimated_total_cost) || 0)}
                </strong>
              </span>
              <span>•</span>
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* Total Vendors */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E9F0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Compared Suppliers
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#172033', marginTop: '4px' }}>
                    {vendors.length} Vendor Proposals
                  </div>
                  <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                    {comparisonData?.total_items_quoted || items.length} distinct line items parsed
                  </div>
                </div>

                {/* Common Items Matched */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E9F0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Common Matched Items
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                    {comparisonData?.common_items_count || 0} Like-For-Like Items
                  </div>
                  <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                    Eligible for direct price comparison
                  </div>
                </div>

                {/* Lowest Comparable Proposal */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #BBF7D0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    Lowest Comparable Proposal
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                    {lowestCompVendor ? formatCurrency(parseFloat(lowestCompVendor.comparable_total)) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontWeight: 600 }}>
                    {lowestCompVendor?.vendor_name} (Comparable Total)
                  </div>
                </div>

                {/* Price Difference / Potential Savings */}
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #BFDBFE',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase' }}>
                    Comparable Price Spread
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1D4ED8', marginTop: '4px' }}>
                    {formatCurrency(maxSavings)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '2px' }}>
                    Max savings between quoting vendors
                  </div>
                </div>
              </div>

              {/* 2. Item-by-Item Multi-Vendor Comparison Table */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E5E9F0',
                    backgroundColor: '#FAFAFA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="#0284C7" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: 0 }}>
                      Item-by-Item Quotation Comparison Matrix
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: '#667085' }}>
                    Matched items compare identical units; vendor-specific extra items are highlighted.
                  </div>
                </div>

                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E5E9F0' }}>
                        <th
                          style={{
                            padding: '12px 16px',
                            fontWeight: 700,
                            color: '#172033',
                            minWidth: '240px',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#F8FAFC',
                            zIndex: 2,
                            boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
                          }}
                        >
                          Item / Specification
                        </th>

                        {vendors.map((v) => (
                          <th
                            key={v.quotation_id}
                            style={{
                              padding: '12px 16px',
                              fontWeight: 700,
                              color: '#172033',
                              minWidth: '220px',
                              borderLeft: '1px solid #E5E9F0',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#172033' }}>
                                  {v.vendor_name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500, marginTop: '2px' }}>
                                  Ref: <strong>{v.quotation_number}</strong>
                                </div>
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
                                  }}
                                >
                                  SELECTED
                                </span>
                              )}
                            </div>
                          </th>
                        ))}

                        <th
                          style={{
                            padding: '12px 16px',
                            fontWeight: 700,
                            color: '#667085',
                            minWidth: '130px',
                            borderLeft: '1px solid #E5E9F0',
                            textAlign: 'right',
                          }}
                        >
                          Rate Difference
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((row, idx) => {
                        const isMatched = row.match_status === 'MATCHED';
                        const isVendorSpecific = row.match_status === 'VENDOR_SPECIFIC';

                        return (
                          <tr
                            key={row.match_key || idx}
                            style={{
                              borderBottom: '1px solid #E5E9F0',
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            }}
                          >
                            {/* Sticky Item Column */}
                            <td
                              style={{
                                padding: '12px 16px',
                                position: 'sticky',
                                left: 0,
                                backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                zIndex: 1,
                                boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
                              }}
                            >
                              <div style={{ fontWeight: 600, color: '#172033' }}>
                                {row.item_name}
                              </div>
                              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isMatched ? (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#ECFDF3',
                                      color: '#027A48',
                                      border: '1px solid #A6F4C5',
                                    }}
                                  >
                                    MATCHED
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#FFF4ED',
                                      color: '#B93815',
                                      border: '1px solid #FECDCA',
                                    }}
                                  >
                                    VENDOR-SPECIFIC
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Vendor Cells */}
                            {vendors.map((v) => {
                              const offer = row.vendor_offers[String(v.quotation_id)];
                              if (!offer || !offer.is_quoted) {
                                return (
                                  <td
                                    key={v.quotation_id}
                                    style={{
                                      padding: '12px 16px',
                                      borderLeft: '1px solid #E5E9F0',
                                      backgroundColor: '#F8FAFC',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#F1F5F9',
                                        color: '#64748B',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Not Quoted
                                    </div>
                                  </td>
                                );
                              }

                              const unitP = parseFloat(offer.unit_price || '0');
                              const lineT = parseFloat(offer.line_total || '0');

                              return (
                                <td
                                  key={v.quotation_id}
                                  style={{
                                    padding: '12px 16px',
                                    borderLeft: '1px solid #E5E9F0',
                                    backgroundColor: offer.is_lowest_price ? '#F0FDF4' : 'transparent',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                        {formatCurrency(unitP)} <span style={{ fontSize: '11px', color: '#667085', fontWeight: 400 }}>/ unit</span>
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                                        Qty: <strong>{offer.quantity}</strong>
                                        {offer.qty_status === 'partial' && (
                                          <span style={{ color: '#D97706', marginLeft: '4px', fontWeight: 600 }}>(Partial)</span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 700, color: offer.is_lowest_price ? '#047857' : '#172033' }}>
                                        {formatCurrency(lineT)}
                                      </div>
                                      {offer.is_lowest_price && (
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: '#047857',
                                            backgroundColor: '#D1FAE5',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            display: 'inline-block',
                                            marginTop: '2px',
                                          }}
                                        >
                                          LOWEST RATE
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Rate Difference Column */}
                            <td
                              style={{
                                padding: '12px 16px',
                                borderLeft: '1px solid #E5E9F0',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: parseFloat(row.price_difference) > 0 ? '#B42318' : '#667085',
                              }}
                            >
                              {parseFloat(row.price_difference) > 0 ? `+${formatCurrency(parseFloat(row.price_difference))}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Side-by-Side Vendor Financial Summaries & Commercial Breakdown */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: '0 0 10px 0' }}>
                  Vendor Summary & Financial Breakdown
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${vendors.length}, minmax(280px, 1fr))`,
                    gap: '14px',
                  }}
                >
                  {summaries.map((s) => {
                    const isSelected = s.is_selected || selectedQid === s.quotation_id;
                    const compTot = parseFloat(s.comparable_total) || 0;
                    const extraTot = parseFloat(s.extra_items_total) || 0;
                    const fullTot = parseFloat(s.full_quoted_total) || 0;
                    const diffFromLowest = parseFloat(s.price_variance_from_lowest) || 0;

                    return (
                      <div
                        key={s.quotation_id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #10B981'
                            : s.is_lowest_comparable
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
                        {/* Banner */}
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

                        {/* Breakdown Metrics */}
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, backgroundColor: isSelected ? '#F0FDF4' : '#FAFAFA' }}>
                          {/* Comparable Total */}
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              backgroundColor: s.is_lowest_comparable ? '#ECFDF3' : '#FFFFFF',
                              border: `1px solid ${s.is_lowest_comparable ? '#A6F4C5' : '#E5E9F0'}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: s.is_lowest_comparable ? '#027A48' : '#172033' }}>
                                Comparable Total (Common Items)
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 800, color: s.is_lowest_comparable ? '#027A48' : '#172033' }}>
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
                      Reason for selecting this vendor (Recorded for auditing & compliance):
                    </label>
                    <textarea
                      rows={2}
                      value={selectionReason}
                      onChange={(e) => setSelectionReason(e.target.value)}
                      placeholder="e.g. Selected lowest comparable bid with 3-year warranty and compliant delivery timeline."
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
