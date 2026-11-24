import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Award, ArrowLeft, Plus, Check, Search, Trash2, Eye, Download,
  AlertCircle, FileText, CheckCircle2, ChevronRight, RotateCcw,
  Building2, DollarSign, Clock, ShieldCheck, ShoppingCart, Info,
  AlertTriangle, Upload, X,
} from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { vendorsApi } from '../../api/vendors';
import { useAuth } from '../../context/AuthContext';
import type {
  ProcurementRequestListItem,
  ProcurementRequestDetail,
  ProcurementQuotation,
  QuotationComparisonResponse,
  QuotationComparisonItemRow,
  QuotationVendorSummary,
  QuotationRowValidationError,
} from '../../types/procurement';
import type { Vendor } from '../../types/vendors';
import {
  ProcurementStatusBadge,
  RequestTypeBadge,
  ProcurementPriorityBadge,
} from '../../components/procurement/ProcurementBadges';
import { Button, LoadingSpinner } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';

// Map technical backend error messages to clear business language
function formatUploadError(rawErr: any): string {
  if (!rawErr) return 'Failed to upload quotation. Please check the file and try again.';
  
  let msg = '';
  if (typeof rawErr === 'string') {
    msg = rawErr;
  } else if (rawErr.response?.data?.attachment) {
    const att = rawErr.response.data.attachment;
    msg = Array.isArray(att) ? att.join(' ') : String(att);
  } else if (rawErr.response?.data?.detail) {
    msg = String(rawErr.response.data.detail);
  } else if (rawErr.response?.data?.message) {
    msg = String(rawErr.response.data.message);
  } else if (rawErr.message) {
    msg = String(rawErr.message);
  } else {
    msg = JSON.stringify(rawErr);
  }

  // Convert technical errors to user-friendly messages
  const lower = msg.toLowerCase();
  if (lower.includes('unsupported') || lower.includes('file extension') || lower.includes('.xlsx or .csv')) {
    return 'This file type is not supported. Please upload an Excel (.xlsx) or CSV (.csv) file.';
  }
  if (lower.includes('file too large') || lower.includes('maximum size')) {
    return 'This file is too large. Please upload a smaller quotation file (under 10MB).';
  }
  if (lower.includes('item column') || lower.includes('could not find an item')) {
    return 'Required item column could not be found. Expected column headers include: Item, Item Name, Product, or Description.';
  }
  if (lower.includes('quantity column') || lower.includes('could not find a quantity')) {
    return 'Required quantity column could not be found. Expected column headers include: Quantity, Qty, or Count.';
  }
  if (lower.includes('unit price column') || lower.includes('could not find a unit price')) {
    return 'Required unit price column could not be found. Expected column headers include: Unit Price, Price, Rate, or Cost.';
  }
  if (lower.includes('empty') || lower.includes('no quotation items') || lower.includes('no valid line items')) {
    return 'No quotation items were found in this file. Please verify that the file contains line items with quantities and prices.';
  }
  if (lower.includes('corrupt') || lower.includes('could not read') || lower.includes('bad zip file')) {
    return 'We could not read this file. Please verify that the spreadsheet is not damaged and try again.';
  }

  // Clean generic bracket quotes
  return msg.replace(/^[\["']+|[\]"']+$/g, '').trim();
}

export const QuotationComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isITAdmin = user && ['it_admin', 'super_admin'].includes(user.role);

  // Workflow Step: 1 = Select Request, 2 = Add Quotations, 3 = Compare & Select
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Request Selection
  const [requests, setRequests] = useState<ProcurementRequestListItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active Selected Purchase Request
  const [activeProcurement, setActiveProcurement] = useState<ProcurementRequestDetail | ProcurementRequestListItem | null>(null);
  const [loadingActiveReq, setLoadingActiveReq] = useState(false);

  // Step 2 State: Quotations List
  const [quotations, setQuotations] = useState<ProcurementQuotation[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [isAddQuotationOpen, setIsAddQuotationOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<ProcurementQuotation | null>(null);
  const [deletingQuotation, setDeletingQuotation] = useState(false);

  // Step 3 State: Comparison Matrix & Selection
  const [comparisonData, setComparisonData] = useState<QuotationComparisonResponse | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [selectedQid, setSelectedQid] = useState<number | null>(null);
  const [selectionReason, setSelectionReason] = useState('');
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [selectionSuccess, setSelectionSuccess] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Upload Modal State (in Step 2)
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
  const [uploadVendorId, setUploadVendorId] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRefNumber, setUploadRefNumber] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadDelivery, setUploadDelivery] = useState('');
  const [uploadPayment, setUploadPayment] = useState('Net 30 days');
  const [uploadWarranty, setUploadWarranty] = useState('');
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'reading' | 'done'>('idle');
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<{ vendorName: string; fileName: string; itemsCount: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStructuredErrors, setUploadStructuredErrors] = useState<QuotationRowValidationError[]>([]);
  const [duplicateVendorWarning, setDuplicateVendorWarning] = useState<ProcurementQuotation | null>(null);

  // 1. Fetch Request List for Step 1
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await procurementApi.list({
        search: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
      });
      setRequests(res.results || []);
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 2. Load Quotations for Active Request
  const fetchQuotations = useCallback(async (procId: number) => {
    setLoadingQuotations(true);
    try {
      const quotes = await procurementApi.listQuotations(procId);
      setQuotations(quotes || []);
      return quotes;
    } catch {
      setQuotations([]);
      return [];
    } finally {
      setLoadingQuotations(false);
    }
  }, []);

  // 3. Load Comparison Data for Active Request
  const fetchComparison = useCallback(async (procId: number) => {
    setLoadingComparison(true);
    setComparisonError(null);
    try {
      const data = await procurementApi.compareQuotations(procId);
      setComparisonData(data);

      const preSelected = data.vendors?.find((v) => v.is_selected);
      if (preSelected) {
        setSelectedQid(preSelected.quotation_id);
        const summary = data.vendor_summaries?.find((s) => s.quotation_id === preSelected.quotation_id);
        if (summary?.selection_notes) {
          setSelectionReason(summary.selection_notes);
        }
      }
    } catch (err: any) {
      setComparisonError(formatUploadError(err));
    } finally {
      setLoadingComparison(false);
    }
  }, []);

  // 4. Initial URL param check (?id=123)
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      const procId = parseInt(idParam, 10);
      if (!isNaN(procId)) {
        setLoadingActiveReq(true);
        procurementApi.get(procId)
          .then(async (req) => {
            setActiveProcurement(req);
            const quotes = await fetchQuotations(req.id);
            if (quotes && quotes.length >= 2) {
              setStep(3);
              fetchComparison(req.id);
            } else {
              setStep(2);
            }
          })
          .catch(() => {
            setStep(1);
          })
          .finally(() => setLoadingActiveReq(false));
      }
    }
  }, [searchParams, fetchQuotations, fetchComparison]);

  // Load active vendors list for upload dialog
  useEffect(() => {
    vendorsApi.list({ status: 'active', page_size: 100 })
      .then((res) => {
        setVendorsList(res.results || []);
      })
      .catch(() => {});
  }, []);

  // Handle selecting a purchase request in Step 1
  const handleSelectRequest = async (req: ProcurementRequestListItem) => {
    setActiveProcurement(req);
    setSearchParams({ id: String(req.id) });
    const quotes = await fetchQuotations(req.id);
    if (quotes && quotes.length >= 2) {
      setStep(3);
      fetchComparison(req.id);
    } else {
      setStep(2);
    }
  };

  // Handle returning to Step 1 (Change Request)
  const handleResetToStep1 = () => {
    setActiveProcurement(null);
    setQuotations([]);
    setComparisonData(null);
    setSelectedQid(null);
    setSelectionReason('');
    setSelectionSuccess(false);
    setSearchParams({});
    setStep(1);
  };

  // Check for duplicate vendor when choosing a vendor in upload form
  const handleVendorSelectChange = (vendorId: number) => {
    setUploadVendorId(vendorId);
    setUploadError(null);
    setUploadStructuredErrors([]);
    const existing = quotations.find((q) => q.vendor === vendorId);
    if (existing) {
      setDuplicateVendorWarning(existing);
    } else {
      setDuplicateVendorWarning(null);
    }
  };

  // Handle Quotation Upload Submission
  const handleUploadQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcurement) return;
    if (!uploadVendorId) {
      setUploadError('Please select a supplier / vendor.');
      return;
    }
    if (!uploadFile) {
      setUploadError('Please select an Excel (.xlsx) or CSV (.csv) quotation file.');
      return;
    }

    setUploadProgress('uploading');
    setUploadError(null);
    setUploadStructuredErrors([]);

    try {
      // If replacing duplicate, delete previous quote first
      if (duplicateVendorWarning) {
        try {
          await procurementApi.deleteQuotation(activeProcurement.id, duplicateVendorWarning.id);
        } catch {
          // ignore
        }
      }

      const formData = new FormData();
      formData.append('vendor', String(uploadVendorId));
      if (uploadRefNumber.trim()) formData.append('quotation_number', uploadRefNumber.trim());
      formData.append('quotation_date', uploadDate);
      if (uploadDelivery.trim()) formData.append('delivery_timeline', uploadDelivery.trim());
      if (uploadPayment.trim()) formData.append('payment_terms', uploadPayment.trim());
      if (uploadWarranty.trim()) formData.append('warranty_terms', uploadWarranty.trim());
      formData.append('attachment', uploadFile);

      setUploadProgress('reading');
      const created = await procurementApi.addQuotation(activeProcurement.id, formData);

      setUploadProgress('done');
      const selectedVendor = vendorsList.find((v) => v.id === uploadVendorId);
      setUploadSuccessInfo({
        vendorName: selectedVendor?.name || created.vendor_name || 'Vendor',
        fileName: uploadFile.name,
        itemsCount: created.items_count || (created.items ? created.items.length : 1),
      });

      // Refresh quotations list
      const updatedQuotes = await fetchQuotations(activeProcurement.id);

      // Close modal after brief success presentation
      setTimeout(() => {
        setIsAddQuotationOpen(false);
        setUploadProgress('idle');
        setUploadFile(null);
        setUploadVendorId('');
        setUploadRefNumber('');
        setUploadDelivery('');
        setUploadWarranty('');
        setDuplicateVendorWarning(null);
        setUploadSuccessInfo(null);
        setUploadStructuredErrors([]);
      }, 1400);

    } catch (err: any) {
      setUploadProgress('idle');
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        setUploadStructuredErrors(err.response.data.errors);
      } else {
        setUploadStructuredErrors([]);
      }
      setUploadError(formatUploadError(err));
    }
  };

  // Handle Quotation Deletion
  const handleDeleteQuotationConfirm = async () => {
    if (!activeProcurement || !quotationToDelete) return;
    setDeletingQuotation(true);
    try {
      await procurementApi.deleteQuotation(activeProcurement.id, quotationToDelete.id);
      setQuotationToDelete(null);
      await fetchQuotations(activeProcurement.id);
    } catch (err: any) {
      alert(formatUploadError(err));
    } finally {
      setDeletingQuotation(false);
    }
  };

  // Handle Confirming Vendor Selection
  const handleConfirmVendorSelection = async () => {
    if (!activeProcurement || !selectedQid) return;
    if (!selectionReason.trim()) {
      alert('Please enter a justification for your vendor selection.');
      return;
    }

    setSubmittingSelection(true);
    try {
      await procurementApi.selectQuotation(activeProcurement.id, selectedQid, selectionReason.trim());
      setSelectionSuccess(true);
      await fetchComparison(activeProcurement.id);
    } catch (err: any) {
      alert(formatUploadError(err));
    } finally {
      setSubmittingSelection(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 1. Header with Breadcrumb & Change Request */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/procurement')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E9F0',
                color: '#475467',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
              }}
              title="Return to Purchasing Dashboard"
            >
              <ArrowLeft size={14} /> Purchasing
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="#172033" />
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', margin: 0 }}>
                Quotation Comparison
              </h1>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#667085', margin: '6px 0 0 0' }}>
            Compare vendor quotations for a purchase request and select the quotation that best meets the requirement.
          </p>
        </div>

        {activeProcurement && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={handleResetToStep1}
            style={{ color: '#475467', borderColor: '#D0D5DD', backgroundColor: '#FFFFFF' }}
          >
            Change Request
          </Button>
        )}
      </div>

      {/* 2. Stepper Progress Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: '10px',
          border: '1px solid #E5E9F0',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
          overflowX: 'auto',
        }}
      >
        {/* Step 1 Pill */}
        <div
          onClick={() => setStep(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: activeProcurement ? '#ECFDF3' : step === 1 ? '#0F172A' : '#F2F4F7',
              color: activeProcurement ? '#027A48' : step === 1 ? '#FFFFFF' : '#667085',
              border: activeProcurement ? '1px solid #A6F4C5' : 'none',
            }}
          >
            {activeProcurement ? <Check size={14} /> : '1'}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Step 1</div>
            <div style={{ fontSize: '13px', fontWeight: step === 1 ? 700 : 600, color: step === 1 ? '#0F172A' : '#475467' }}>
              Select Request
            </div>
          </div>
        </div>

        <div style={{ width: '48px', height: '2px', backgroundColor: activeProcurement ? '#10B981' : '#E5E9F0', margin: '0 12px' }} />

        {/* Step 2 Pill */}
        <div
          onClick={() => activeProcurement && setStep(2)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: activeProcurement ? 'pointer' : 'not-allowed',
            opacity: activeProcurement ? 1 : 0.45,
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: quotations.length >= 2 && step === 3 ? '#ECFDF3' : step === 2 ? '#0F172A' : '#F2F4F7',
              color: quotations.length >= 2 && step === 3 ? '#027A48' : step === 2 ? '#FFFFFF' : '#667085',
              border: quotations.length >= 2 && step === 3 ? '1px solid #A6F4C5' : 'none',
            }}
          >
            {quotations.length >= 2 && step === 3 ? <Check size={14} /> : '2'}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Step 2</div>
            <div style={{ fontSize: '13px', fontWeight: step === 2 ? 700 : 600, color: step === 2 ? '#0F172A' : '#475467' }}>
              Add Quotations
            </div>
          </div>
        </div>

        <div style={{ width: '48px', height: '2px', backgroundColor: quotations.length >= 2 && step === 3 ? '#10B981' : '#E5E9F0', margin: '0 12px' }} />

        {/* Step 3 Pill */}
        <div
          onClick={() => {
            if (quotations.length >= 2 && activeProcurement) {
              setStep(3);
              fetchComparison(activeProcurement.id);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: quotations.length >= 2 ? 'pointer' : 'not-allowed',
            opacity: quotations.length >= 2 ? 1 : 0.45,
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: selectionSuccess ? '#ECFDF3' : step === 3 ? '#0F172A' : '#F2F4F7',
              color: selectionSuccess ? '#027A48' : step === 3 ? '#FFFFFF' : '#667085',
              border: selectionSuccess ? '1px solid #A6F4C5' : 'none',
            }}
          >
            {selectionSuccess ? <Check size={14} /> : '3'}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Step 3</div>
            <div style={{ fontSize: '13px', fontWeight: step === 3 ? 700 : 600, color: step === 3 ? '#0F172A' : '#475467' }}>
              Compare & Select
            </div>
          </div>
        </div>
      </div>

      {/* 3. Selected Request Summary Bar (Visible on Steps 2 & 3) */}
      {activeProcurement && step !== 1 && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Purchase Request</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                {activeProcurement.request_id}
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', backgroundColor: '#CBD5E1' }} />

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Item</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '1px' }}>
                {activeProcurement.item_name}
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', backgroundColor: '#CBD5E1' }} />

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Quantity</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '1px' }}>
                {activeProcurement.quantity} Units
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', backgroundColor: '#CBD5E1' }} />

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Requester</span>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '1px' }}>
                {activeProcurement.requester_name}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToStep1}
            style={{ fontSize: '12px', color: '#0284C7', borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', fontWeight: 600 }}
          >
            Change Request
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: SELECT PURCHASE REQUEST                                           */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172033', margin: 0 }}>
                  Select a Purchase Request
                </h2>
                <p style={{ fontSize: '13px', color: '#667085', margin: '3px 0 0 0' }}>
                  Choose a purchase request to review vendor quotations and analyze pricing differences.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                <Search size={15} color="#98A2B3" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search request ID, item, requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Requests Table */}
            {loadingRequests ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <LoadingSpinner />
                <p style={{ fontSize: '13px', color: '#667085', marginTop: '8px' }}>Loading purchase requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#667085' }}>
                <ShoppingCart size={32} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>No purchase requests found</p>
                <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your search query or check active purchase requests.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #EAECF0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Request ID</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Item & Category</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Quantity</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Requester</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475467' }}>Quotations</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475467' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => handleSelectRequest(req)}
                        style={{
                          borderBottom: '1px solid #F2F4F7',
                          cursor: 'pointer',
                          backgroundColor: '#FFFFFF',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#172033', whiteSpace: 'nowrap' }}>
                          {req.request_id}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{req.item_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            <RequestTypeBadge type={req.request_type} />
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          Qty: {req.quantity}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475467', whiteSpace: 'nowrap' }}>
                          {req.requester_name}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <ProcurementStatusBadge status={req.status} />
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: req.quotations_count && req.quotations_count > 0 ? '#EFF8FF' : '#F2F4F7',
                              color: req.quotations_count && req.quotations_count > 0 ? '#175CD3' : '#667085',
                            }}
                          >
                            <FileText size={12} />
                            {req.quotations_count || 0} Quotes
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            rightIcon={<ChevronRight size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRequest(req);
                            }}
                            style={{ padding: '4px 10px', height: '30px', fontSize: '12px', fontWeight: 600 }}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ADD VENDOR QUOTATIONS                                             */}
      {/* ========================================================================= */}
      {step === 2 && activeProcurement && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
            }}
          >
            {/* Header with CTA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172033', margin: 0 }}>
                  Add Vendor Quotations
                </h2>
                <p style={{ fontSize: '13px', color: '#667085', margin: '3px 0 0 0' }}>
                  Upload quotations from your suppliers to compare their prices and item availability.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {['cancelled', 'rejected'].includes(activeProcurement.status) ? (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#FEF3F2',
                      color: '#B42318',
                      border: '1px solid #FECDCA',
                    }}
                  >
                    Request is {activeProcurement.status} (Quotations locked)
                  </span>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus size={15} />}
                      onClick={() => {
                        setUploadError(null);
                        setDuplicateVendorWarning(null);
                        setUploadProgress('idle');
                        setIsAddQuotationOpen(true);
                      }}
                      style={{ fontWeight: 600 }}
                    >
                      Add Vendor Quotation
                    </Button>
                    <span style={{ fontSize: '11px', color: '#667085' }}>
                      Accepted: Excel (.xlsx) & CSV (.csv) • Max: 10MB
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Minimum 2 Quotations Status Alert */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                backgroundColor: quotations.length >= 2 ? '#F0FDF4' : quotations.length === 1 ? '#EFF8FF' : '#FEFBE8',
                border: quotations.length >= 2 ? '1px solid #BBF7D0' : quotations.length === 1 ? '1px solid #B2DDFF' : '1px solid #FDE68A',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {quotations.length >= 2 ? (
                  <CheckCircle2 size={18} color="#16A34A" />
                ) : (
                  <Info size={18} color={quotations.length === 1 ? '#0284C7' : '#D97706'} />
                )}
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: quotations.length >= 2 ? '#15803D' : quotations.length === 1 ? '#175CD3' : '#B45309',
                    }}
                  >
                    Quotations added: {quotations.length} {quotations.length < 2 && '/ 2 minimum'}
                  </div>
                  <div style={{ fontSize: '12px', color: quotations.length >= 2 ? '#166534' : quotations.length === 1 ? '#1E40AF' : '#92400E' }}>
                    {quotations.length >= 2
                      ? 'Ready for comparison! You can compare now or add more vendor quotations.'
                      : quotations.length === 1
                      ? 'Add one more vendor quotation to compare prices.'
                      : 'Upload at least 2 vendor quotations to enable comparative analysis.'}
                  </div>
                </div>
              </div>

              {quotations.length >= 2 && (
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ChevronRight size={14} />}
                  onClick={() => {
                    setStep(3);
                    fetchComparison(activeProcurement.id);
                  }}
                  style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 600 }}
                >
                  Compare Quotations Now
                </Button>
              )}
            </div>

            {/* Uploaded Quotations Grid */}
            {loadingQuotations ? (
              <div style={{ padding: '30px 0', textAlign: 'center' }}>
                <LoadingSpinner />
                <p style={{ fontSize: '13px', color: '#667085', marginTop: '8px' }}>Loading vendor quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <Upload size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '0 0 4px 0' }}>
                  No quotations uploaded yet
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '440px', margin: '0 auto 12px auto' }}>
                  Upload Excel or CSV quotation files from suppliers to automatically import line items and compare prices.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => {
                    setUploadError(null);
                    setDuplicateVendorWarning(null);
                    setUploadProgress('idle');
                    setIsAddQuotationOpen(true);
                  }}
                >
                  Upload First Quotation
                </Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {quotations.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(16, 24, 40, 0.04)',
                      position: 'relative',
                    }}
                  >
                    {/* Top Row: Vendor & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                          Vendor {String.fromCharCode(65 + idx)}
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                          {q.vendor_name || 'Vendor'}
                        </h4>
                      </div>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#F0FDF4',
                          color: '#166534',
                          border: '1px solid #BBF7D0',
                        }}
                      >
                        <Check size={11} /> Imported
                      </span>
                    </div>

                    {/* Quotation Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Total Quoted:</span>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                          {formatCurrency(q.total_amount)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Items Quoted:</span>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>
                          {q.items_count || (q.items ? q.items.length : 1)} items
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Lead Time:</span>
                        <div style={{ color: '#334155' }}>
                          {q.delivery_timeline || 'Standard'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Warranty:</span>
                        <div style={{ color: '#334155' }}>
                          {q.warranty_terms || 'Standard'}
                        </div>
                      </div>
                    </div>

                    {/* File Attachment & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                        <FileText size={14} color="#0284C7" />
                        <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.attachment ? q.attachment.split('/').pop() : q.quotation_number || 'Quotation File'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {q.attachment_url && (
                          <a
                            href={q.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Download size={11} /> File
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuotationToDelete(q)}
                          style={{ color: '#DC2626', padding: '4px 6px', height: '26px' }}
                          title="Remove Quotation"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Bottom Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #EAECF0' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft size={14} />}
                style={{ color: '#475467' }}
              >
                Change Request
              </Button>

              <Button
                variant="primary"
                size="md"
                rightIcon={<ChevronRight size={16} />}
                disabled={quotations.length < 2}
                onClick={() => {
                  setStep(3);
                  fetchComparison(activeProcurement.id);
                }}
                style={{
                  fontWeight: 700,
                  opacity: quotations.length < 2 ? 0.5 : 1,
                  cursor: quotations.length < 2 ? 'not-allowed' : 'pointer',
                }}
              >
                Proceed to Compare & Select →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: COMPARE & SELECT                                                  */}
      {/* ========================================================================= */}
      {step === 3 && activeProcurement && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Control Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
              onClick={() => setStep(2)}
              style={{ color: '#475467', borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}
            >
              Back to Quotations ({quotations.length})
            </Button>

            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Comparing <strong>{comparisonData?.vendors?.length || quotations.length} vendor proposals</strong> for {activeProcurement.request_id}
            </div>
          </div>

          {loadingComparison ? (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '40px 0', textAlign: 'center', border: '1px solid #E5E9F0' }}>
              <LoadingSpinner />
              <p style={{ fontSize: '13px', color: '#667085', marginTop: '8px' }}>Building item-by-item comparison matrix...</p>
            </div>
          ) : comparisonError ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECDCA', borderRadius: '8px', padding: '16px', color: '#B42318', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <AlertCircle size={16} /> Comparison Error
              </div>
              <p style={{ margin: '6px 0 0 0' }}>{comparisonError}</p>
            </div>
          ) : comparisonData ? (
            <>
              {/* 3.1 Vendor Summary KPI Cards (Neutral, No Auto Winner) */}
              <div className="vendor-summaries-grid">
                {(() => {
                  const validCompSums = comparisonData.vendor_summaries?.filter((s) => parseFloat(s.comparable_total) > 0) || [];
                  const minCompVal = validCompSums.length > 0 ? Math.min(...validCompSums.map((s) => parseFloat(s.comparable_total))) : 0;
                  const lowestCompVendors = validCompSums.filter((s) => Math.abs(parseFloat(s.comparable_total) - minCompVal) < 0.001);
                  const isCompTie = lowestCompVendors.length > 1;

                  return comparisonData.vendor_summaries?.map((sum, vIdx) => {
                    const isRadioSelected = selectedQid === sum.quotation_id;
                    const isTied = isCompTie && lowestCompVendors.some((lv) => lv.quotation_id === sum.quotation_id);
                    return (
                      <div
                        key={sum.quotation_id}
                        onClick={() => setSelectedQid(sum.quotation_id)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          border: isRadioSelected ? '2px solid #0284C7' : isTied ? '2px solid #38BDF8' : '1px solid #E2E8F0',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: isRadioSelected ? '0 4px 6px -1px rgba(2, 132, 199, 0.1)' : '0 1px 3px rgba(16, 24, 40, 0.04)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                                Vendor {String.fromCharCode(65 + vIdx)}
                              </span>
                              {isTied && (
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                                  Tied Lowest Bid
                                </span>
                              )}
                              {!isTied && sum.is_lowest_comparable && (
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ECFDF3', color: '#027A48' }}>
                                  Lowest Comparable
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                              {sum.vendor_name}
                            </div>
                          </div>

                          <input
                            type="radio"
                            name="vendor_select_card"
                            checked={isRadioSelected}
                            onChange={() => setSelectedQid(sum.quotation_id)}
                            style={{ accentColor: '#0284C7', cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                        </div>

                        <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#64748B' }}>Comparable Total:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{formatCurrency(sum.comparable_total)}</span>
                          </div>
                          {parseFloat(sum.extra_items_total || '0') > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#D97706' }}>
                              <span>+ Extra Items:</span>
                              <span>{formatCurrency(sum.extra_items_total)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', paddingTop: '4px', borderTop: '1px solid #EAECF0' }}>
                            <span>Full Quote Total:</span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(sum.full_quoted_total)}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Lead Time: <strong>{sum.delivery_timeline || 'N/A'}</strong></span>
                          <span>Warranty: <strong>{sum.warranty_terms || 'Standard'}</strong></span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* 3.2 Detailed Comparison Table */}
              <div className="quotation-matrix-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', backgroundColor: '#F8FAFC' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
                    Item-by-Item Price & Specification Comparison
                  </h3>
                  <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
                    Like-for-like pricing breakdown across core requested items and vendor add-ons.
                  </p>
                </div>

                {(() => {
                  const vendorCount = Math.max(1, comparisonData.vendors?.length || 1);
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
                          {comparisonData.vendors?.map((v) => (
                            <col key={`col-${v.quotation_id}`} className="qmat-col-vendor" style={{ width: `${vendorWidthPct}%` }} />
                          ))}
                          <col className="qmat-col-diff" style={{ width: '135px' }} />
                          <col className="qmat-col-remarks" style={{ width: `${remarksWidthPct}%` }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="sticky-col-item">
                              Item & Specifications
                            </th>
                            <th className="qmat-col-qty" style={{ textAlign: 'center' }}>
                              Req. Qty
                            </th>
                            {comparisonData.vendors?.map((v, vIdx) => (
                              <th key={v.quotation_id} className="qmat-vendor-header">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div className="qmat-vendor-title">
                                    Vendor {String.fromCharCode(65 + vIdx)}: {v.vendor_name}
                                  </div>
                                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
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
                              Remark / Comparison
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                      {/* Section: Comparable Items */}
                      {comparisonData.items?.filter((row) => row.match_status !== 'VENDOR_SPECIFIC' && row.match_status !== 'EXTRA_ITEM').map((row, rIdx) => (
                        <tr key={row.match_key || rIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td className="sticky-col-item qmat-cell-item" style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{row.item_name}</div>
                          </td>
                          <td className="qmat-cell-qty" style={{ padding: '12px 14px' }}>
                            {activeProcurement.quantity}
                          </td>
                          {comparisonData.vendors?.map((v) => {
                            const offer = row.vendor_offers[String(v.quotation_id)];
                            if (!offer || !offer.is_quoted || offer.status === 'NOT_QUOTED') {
                              return (
                                <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      backgroundColor: '#FEF2F2',
                                      color: '#B91C1C',
                                      border: '1px solid #FCA5A5',
                                    }}
                                  >
                                    Not Quoted
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                  {formatCurrency(offer.line_total || '0')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                  {formatCurrency(offer.unit_price || '0')} / unit (Qty: {offer.quantity})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                  {offer.is_lowest_price && (comparisonData.vendors?.length || 0) > 1 && row.quoted_vendors_count > 1 && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        backgroundColor: '#ECFDF3',
                                        color: '#027A48',
                                        border: '1px solid #A6F4C5',
                                      }}
                                    >
                                      <Check size={10} /> Lowest Price
                                    </span>
                                  )}
                                  {!offer.is_lowest_price && offer.price_delta_from_lowest && parseFloat(offer.price_delta_from_lowest) > 0 && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        backgroundColor: '#FEF3C7',
                                        color: '#92400E',
                                        border: '1px solid #FDE68A',
                                      }}
                                    >
                                      +{formatCurrency(offer.price_delta_from_lowest)} / unit
                                    </span>
                                  )}
                                </div>
                                {offer.description && (
                                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', fontStyle: 'italic', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.4 }}>
                                    {offer.description}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="qmat-cell-diff" style={{ padding: '12px 16px' }}>
                            {row.quoted_vendors_count > 1 && row.price_difference && parseFloat(row.price_difference) > 0 ? (
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
                          <td className="qmat-cell-remarks" style={{ padding: '12px 16px' }}>
                            {row.comparison_remark || (row.quoted_vendors_count === 1 ? 'Quoted only by 1 vendor' : 'Matched across quotations')}
                          </td>
                        </tr>
                      ))}

                      {/* Section: Extra / Vendor Specific Items (if any) */}
                      {comparisonData.items?.filter((row) => row.match_status === 'VENDOR_SPECIFIC' || row.match_status === 'EXTRA_ITEM').length > 0 && (
                        <>
                          <tr style={{ backgroundColor: '#FFFBEB', borderTop: '2px solid #FEF3C7', borderBottom: '1px solid #FDE68A' }}>
                            <td colSpan={2 + (comparisonData.vendors?.length || 0) + 2} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: '#B45309' }}>
                              Additional / Vendor Specific Items
                            </td>
                          </tr>
                          {comparisonData.items?.filter((row) => row.match_status === 'VENDOR_SPECIFIC' || row.match_status === 'EXTRA_ITEM').map((row, rIdx) => (
                            <tr key={`extra-${rIdx}`} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FEFDF8' }}>
                              <td className="sticky-col-item qmat-cell-item" style={{ padding: '10px 16px', backgroundColor: '#FEFDF8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{row.item_name}</span>
                                  <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', flexShrink: 0 }}>
                                    Extra Item
                                  </span>
                                </div>
                              </td>
                              <td className="qmat-cell-qty" style={{ padding: '10px 14px', color: '#94A3B8' }}>—</td>
                              {comparisonData.vendors?.map((v) => {
                                const offer = row.vendor_offers[String(v.quotation_id)];
                                if (!offer || !offer.is_quoted || offer.status === 'NOT_QUOTED') {
                                  return (
                                    <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 16px', color: '#CBD5E1', fontSize: '12px' }}>
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 16px' }}>
                                    <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                      {formatCurrency(offer.line_total || '0')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                      {formatCurrency(offer.unit_price || '0')} / unit (Qty: {offer.quantity})
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="qmat-cell-diff" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                              <td className="qmat-cell-remarks" style={{ padding: '10px 16px' }}>
                                {row.comparison_remark || 'Vendor add-on item'}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Section: Commercial & Delivery Terms */}
                      <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #EAECF0' }}>
                        <td className="sticky-col-item qmat-cell-item" style={{ padding: '10px 16px', fontWeight: 700, color: '#475467', backgroundColor: '#F8FAFC' }}>
                          Delivery Lead Time
                        </td>
                        <td className="qmat-cell-qty" style={{ padding: '10px 14px', color: '#94A3B8' }}>—</td>
                        {comparisonData.vendors?.map((v) => (
                          <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 16px', fontWeight: 600, color: '#1E293B' }}>
                            {v.delivery_timeline || 'Standard Delivery'}
                          </td>
                        ))}
                        <td className="qmat-cell-diff" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                        <td className="qmat-cell-remarks" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                      </tr>
                      <tr style={{ backgroundColor: '#F8FAFC' }}>
                        <td className="sticky-col-item qmat-cell-item" style={{ padding: '10px 16px', fontWeight: 700, color: '#475467', backgroundColor: '#F8FAFC' }}>
                          Payment Terms
                        </td>
                        <td className="qmat-cell-qty" style={{ padding: '10px 14px', color: '#94A3B8' }}>—</td>
                        {comparisonData.vendors?.map((v) => (
                          <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 16px', color: '#334155' }}>
                            {v.payment_terms || 'Net 30 days'}
                          </td>
                        ))}
                        <td className="qmat-cell-diff" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                        <td className="qmat-cell-remarks" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                      </tr>
                      <tr style={{ backgroundColor: '#F8FAFC' }}>
                        <td className="sticky-col-item qmat-cell-item" style={{ padding: '10px 16px', fontWeight: 700, color: '#475467', backgroundColor: '#F8FAFC' }}>
                          Warranty Period
                        </td>
                        <td className="qmat-cell-qty" style={{ padding: '10px 14px', color: '#94A3B8' }}>—</td>
                        {comparisonData.vendors?.map((v) => (
                          <td key={v.quotation_id} className="qmat-cell-vendor" style={{ padding: '10px 16px', color: '#334155' }}>
                            {v.warranty_terms || 'Standard 1 Year'}
                          </td>
                        ))}
                        <td className="qmat-cell-diff" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                        <td className="qmat-cell-remarks" style={{ padding: '10px 16px', color: '#94A3B8' }}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

              {/* 3.3 Explicit Vendor Selection & Justification (Human Choice Only) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E5E9F0',
                  padding: '20px',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172033', margin: 0 }}>
                    Select Preferred Vendor
                  </h3>
                  <p style={{ fontSize: '13px', color: '#667085', margin: '3px 0 0 0' }}>
                    Choose the winning vendor proposal and enter a justification reason for audit logging.
                  </p>
                </div>

                {selectionSuccess && (
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      color: '#166534',
                      fontSize: '13px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                      <CheckCircle2 size={18} color="#16A34A" />
                      Vendor Quotation Selected Successfully!
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/procurement')}
                      style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                    >
                      Return to Purchasing List
                    </Button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Vendor Radios */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                    {comparisonData.vendors?.map((v) => {
                      const isChecked = selectedQid === v.quotation_id;
                      return (
                        <label
                          key={v.quotation_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: isChecked ? '2px solid #0284C7' : '1px solid #D0D5DD',
                            backgroundColor: isChecked ? '#F0F9FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="selected_vendor_radio"
                            value={v.quotation_id}
                            checked={isChecked}
                            onChange={() => setSelectedQid(v.quotation_id)}
                            style={{ accentColor: '#0284C7' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {v.vendor_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {formatCurrency(v.total_amount)} • {v.delivery_timeline || 'Standard delivery'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Justification Textarea */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Selection Justification <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={selectionReason}
                      onChange={(e) => setSelectionReason(e.target.value)}
                      placeholder="e.g. Selected Vendor B due to superior 3-year onsite warranty and faster 5-day delivery timeline despite minor price variance."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Submit Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleConfirmVendorSelection}
                      isLoading={submittingSelection}
                      disabled={!selectedQid || !selectionReason.trim() || submittingSelection}
                      style={{ fontWeight: 700 }}
                    >
                      Confirm Vendor Selection
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMPLE ADD VENDOR QUOTATION (STEP 2)                               */}
      {/* ========================================================================= */}
      {isAddQuotationOpen && activeProcurement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && uploadProgress === 'idle') {
              setIsAddQuotationOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E9F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#172033', margin: 0 }}>
                  Add Vendor Quotation
                </h3>
                <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
                  {activeProcurement.request_id} — {activeProcurement.item_name}
                </p>
              </div>
              <button
                onClick={() => setIsAddQuotationOpen(false)}
                disabled={uploadProgress !== 'idle'}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#667085', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUploadQuotationSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Error Alert / Multi-Row Validation Breakdown */}
              {uploadError && (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECDCA',
                    borderRadius: '8px',
                    color: '#B42318',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <AlertTriangle size={15} /> Unable to import quotation
                  </div>

                  {uploadStructuredErrors.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#991B1B' }}>
                        Please correct the following {uploadStructuredErrors.length} issue{uploadStructuredErrors.length > 1 ? 's' : ''} in your file and try again:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {uploadStructuredErrors.map((issue, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #FCA5A5',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#1E293B',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {issue.row != null && (
                                <span
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#FEE2E2',
                                    color: '#991B1B',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                  }}
                                >
                                  Row {issue.row}
                                </span>
                              )}
                              {issue.item && (
                                <strong style={{ color: '#0F172A' }}>{issue.item}</strong>
                              )}
                            </div>
                            <div style={{ color: '#B91C1C', fontSize: '12px', marginTop: '2px' }}>
                              {issue.problem || issue.message}
                            </div>
                            {issue.expected && (
                              <div style={{ color: '#64748B', fontSize: '11px' }}>
                                Expected: {issue.expected}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px' }}>{uploadError}</div>
                  )}
                </div>
              )}

              {/* Success Progress Alert */}
              {uploadProgress !== 'idle' && (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: uploadProgress === 'done' ? '#F0FDF4' : '#EFF8FF',
                    border: uploadProgress === 'done' ? '1px solid #BBF7D0' : '1px solid #B2DDFF',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '13px',
                  }}
                >
                  {uploadProgress === 'uploading' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#175CD3', fontWeight: 600 }}>
                      <LoadingSpinner size="sm" /> Uploading quotation file...
                    </div>
                  )}
                  {uploadProgress === 'reading' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#175CD3', fontWeight: 600 }}>
                      <LoadingSpinner size="sm" /> Reading & normalizing quotation line items...
                    </div>
                  )}
                  {uploadProgress === 'done' && uploadSuccessInfo && (
                    <div style={{ color: '#15803D' }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> Quotation uploaded successfully!
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {uploadSuccessInfo.vendorName} • {uploadSuccessInfo.itemsCount} items imported
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Supplier / Vendor <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={uploadVendorId}
                  onChange={(e) => handleVendorSelectChange(Number(e.target.value))}
                  disabled={uploadProgress !== 'idle'}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">Select a vendor...</option>
                  {vendorsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.primary_contact_name ? `(${v.primary_contact_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Vendor Warning Alert */}
              {duplicateVendorWarning && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#FEFBE8',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#92400E',
                  }}
                >
                  <strong>Notice:</strong> Vendor <em>{duplicateVendorWarning.vendor_name}</em> already has an uploaded quotation for this request. Uploading will replace the existing quote.
                </div>
              )}

              {/* File Upload Drop Zone */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Quotation File (Excel / CSV) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div
                  style={{
                    border: uploadFile ? '2px solid #0284C7' : '2px dashed #CBD5E1',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    textAlign: 'center',
                    backgroundColor: uploadFile ? '#F0F9FF' : '#F8FAFC',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadError(null);
                        setUploadStructuredErrors([]);
                      }
                    }}
                  />
                  {uploadFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0369A1' }}>
                      <FileText size={20} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{uploadFile.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB • Click to change file
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={24} color="#64748B" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                        Drag and drop your quotation here or <span style={{ color: '#0284C7' }}>Choose File</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Supported: Excel (.xlsx) and CSV (.csv)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Fields (Quotation Ref, Date, Delivery, Warranty) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Quotation Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q-DELL-101"
                    value={uploadRefNumber}
                    onChange={(e) => setUploadRefNumber(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Delivery Lead Time (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5-7 business days"
                    value={uploadDelivery}
                    onChange={(e) => setUploadDelivery(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Warranty Terms (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Years Onsite"
                    value={uploadWarranty}
                    onChange={(e) => setUploadWarranty(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Form Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #E5E9F0' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddQuotationOpen(false)}
                  disabled={uploadProgress !== 'idle'}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!uploadVendorId || !uploadFile || uploadProgress !== 'idle'}
                  style={{ fontWeight: 600 }}
                >
                  {duplicateVendorWarning ? 'Replace & Upload' : 'Upload Quotation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE QUOTATION CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {quotationToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#B42318' }}>
              Remove Vendor Quotation
            </h3>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 16px 0' }}>
              Are you sure you want to remove the quotation from <strong>{quotationToDelete.vendor_name}</strong>? This will remove its imported line items from comparison.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" size="sm" onClick={() => setQuotationToDelete(null)} disabled={deletingQuotation}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteQuotationConfirm} isLoading={deletingQuotation}>
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
