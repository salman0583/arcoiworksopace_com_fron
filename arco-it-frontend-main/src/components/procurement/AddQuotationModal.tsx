import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { vendorsApi } from '../../api/vendors';
import type { Vendor } from '../../types/vendors';
import { Button, Input, LoadingSpinner } from '../ui';

interface AddQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurementId: number;
  procurementRequestId: string;
  itemName: string;
  quantity: number;
  onSuccess: () => void;
}

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
  } else if (rawErr.message) {
    msg = String(rawErr.message);
  } else {
    msg = JSON.stringify(rawErr);
  }

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
  if (lower.includes('positive integer') || lower.includes('invalid quantity')) {
    return msg.replace(/[\[\]']/g, '') || 'One or more rows contain an invalid quantity. Quantity must be a positive number.';
  }
  if (lower.includes('cannot be negative') || lower.includes('invalid unit price')) {
    return msg.replace(/[\[\]']/g, '') || 'One or more rows contain an invalid unit price.';
  }
  if (lower.includes('empty') || lower.includes('no quotation items') || lower.includes('no valid line items')) {
    return 'No quotation items were found in this file. Please verify that the file contains line items with quantities and prices.';
  }
  if (lower.includes('corrupt') || lower.includes('could not read') || lower.includes('bad zip file')) {
    return 'We could not read this file. Please verify that the spreadsheet is not damaged and try again.';
  }

  return msg.replace(/^[\["']+|[\]"']+$/g, '').trim();
}

export const AddQuotationModal: React.FC<AddQuotationModalProps> = ({
  isOpen,
  onClose,
  procurementId,
  procurementRequestId,
  itemName,
  quantity,
  onSuccess,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [deliveryTimeline, setDeliveryTimeline] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 days');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoadingVendors(true);
      vendorsApi.list({ status: 'active' })
        .then((res) => {
          setVendors(res.results || []);
          if (res.results && res.results.length > 0) {
            setSelectedVendorId(res.results[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVendors(false));
    }
  }, [isOpen]);

  // Automatically calculate unit price when total amount changes or vice versa
  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && quantity > 0) {
      setUnitPrice((parsed / quantity).toFixed(2));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && quantity > 0) {
      setTotalAmount((parsed * quantity).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setError('Please select a vendor.');
      return;
    }
    const isSpreadsheet = attachmentFile && ['.xlsx', '.xls', '.csv'].some(ext => attachmentFile.name.toLowerCase().endsWith(ext));
    if (!totalAmount && !isSpreadsheet) {
      setError('Please enter a total quotation amount or attach an Excel / CSV quotation file.');
      return;
    }
    if (totalAmount && parseFloat(totalAmount) <= 0) {
      setError('Please enter a valid total quotation amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('vendor', String(selectedVendorId));
      formData.append('quotation_number', quotationNumber.trim());
      formData.append('quotation_date', quotationDate);
      if (validUntil) formData.append('valid_until', validUntil);
      if (totalAmount) formData.append('total_amount', totalAmount);
      if (unitPrice) formData.append('unit_price', unitPrice);
      if (deliveryTimeline) formData.append('delivery_timeline', deliveryTimeline.trim());
      if (paymentTerms) formData.append('payment_terms', paymentTerms.trim());
      if (warrantyTerms) formData.append('warranty_terms', warrantyTerms.trim());
      if (notes) formData.append('notes', notes.trim());
      if (attachmentFile) formData.append('attachment', attachmentFile);

      await procurementApi.addQuotation(procurementId, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(formatUploadError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#172033', margin: 0 }}>
              Add Vendor Quotation
            </h2>
            <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
              {procurementRequestId} — {itemName} (Qty: {quantity})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#667085',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECDCA',
                  borderRadius: '6px',
                  color: '#B42318',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Vendor Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Vendor Supplier <span style={{ color: '#EF4444' }}>*</span>
              </label>
              {loadingVendors ? (
                <div style={{ padding: '8px 0' }}><LoadingSpinner /></div>
              ) : (
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    outline: 'none',
                  }}
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.vendor_id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quotation Number & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Quotation # / Ref <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q-DELL-101"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Quotation Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Total Amount & Unit Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Total Amount (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 48000.00"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontWeight: 600,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Calculated per unit"
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Delivery Timeline & Payment Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Delivery Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5-7 business days"
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Payment Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. Net 30 days"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Valid Until & Warranty Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Valid Until Date
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Warranty Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 Years OEM On-Site"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Quotation Document File Attachment */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475467' }}>
                  Quotation Document (Excel .xlsx, CSV, PDF, etc.)
                </label>
                <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>
                  ⚡ Auto-parses line items from .xlsx / .csv
                </span>
              </div>
              <div
                style={{
                  border: '1px dashed #CBD5E1',
                  borderRadius: '8px',
                  padding: '14px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('quotation-file-input')?.click()}
              >
                <input
                  id="quotation-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachmentFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                {attachmentFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0284C7', fontWeight: 600, fontSize: '13px' }}>
                    <FileText size={18} />
                    <span>{attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAttachmentFile(null); }}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', marginLeft: '6px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#667085', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={16} color="#667085" />
                      <span>Click to browse and upload quotation file</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Upload .xlsx or .csv for multi-vendor line-item comparison
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Commercial Notes & Details
              </label>
              <textarea
                rows={2}
                placeholder="Itemized inclusions, special discounts, terms notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #E5E9F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#F8FAFC',
            }}
          >
            <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting}>
              Add Quotation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
