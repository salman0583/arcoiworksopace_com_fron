import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { vendorsApi } from '../../api/vendors';
import type { ContractType, ContractStatus, Contract, VendorListItem } from '../../types/vendors';

interface AddContractModalProps {
  isOpen: boolean;
  preselectedVendorId?: number;
  preselectedVendorName?: string;
  onClose: () => void;
  onSuccess: (contract: Contract) => void;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({
  isOpen,
  preselectedVendorId,
  preselectedVendorName,
  onClose,
  onSuccess,
}) => {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    vendor: preselectedVendorId || 0,
    contract_type: 'amc' as ContractType,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    renewal_date: '',
    contract_value: '',
    currency: 'INR',
    status: 'active' as ContractStatus,
    support_notes: '',
    notes: '',
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      if (!preselectedVendorId) {
        vendorsApi.list({ page_size: 100 }).then(res => {
          setVendors(res.results);
          if (res.results.length > 0 && !form.vendor) {
            setForm(f => ({ ...f, vendor: res.results[0].id }));
          }
        });
      } else {
        setForm(f => ({ ...f, vendor: preselectedVendorId }));
      }
      setError(null);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, preselectedVendorId, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Contract name is required.');
      return;
    }
    if (!form.vendor) {
      setError('Please select a vendor.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('Both start date and end date are required.');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: form.name,
        vendor: form.vendor,
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date,
        currency: form.currency,
        status: form.status,
        support_notes: form.support_notes,
        notes: form.notes,
      };
      if (form.renewal_date) payload.renewal_date = form.renewal_date;
      if (form.contract_value) payload.contract_value = form.contract_value;

      const created = await vendorsApi.createContract(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.end_date) {
        setError(Array.isArray(resp.end_date) ? resp.end_date[0] : resp.end_date);
      } else if (resp?.detail) {
        setError(resp.detail);
      } else {
        setError('Failed to record contract. Please review the dates and fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="add-vendor-modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="add-vendor-modal-dialog">
        {/* Header */}
        <div className="add-vendor-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Add Contract / Service Agreement
              </h2>
              <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>
                {preselectedVendorName ? `Vendor: ${preselectedVendorName}` : 'Record an AMC, support SLA, or subscription'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#98A2B3',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          id="add-contract-form"
          onSubmit={handleSubmit}
          className="add-vendor-modal-body"
        >
          {error && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDD3',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#B42318',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Contract / Agreement Title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              required
              placeholder="e.g. Dell ProSupport Fleet 2026, HP LaserJet AMC"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {!preselectedVendorId ? (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Associated Vendor <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    color: '#172033',
                  }}
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.vendor_id})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div style={{ gridColumn: preselectedVendorId ? 'span 2' : 'span 1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Contract Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={form.contract_type}
                onChange={e => setForm(f => ({ ...f, contract_type: e.target.value as ContractType }))}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                }}
              >
                <option value="amc">Annual Maintenance Contract (AMC)</option>
                <option value="support">Support Agreement</option>
                <option value="software_sub">Software Subscription</option>
                <option value="internet">Internet / Telecom Service</option>
                <option value="hardware_maint">Hardware Maintenance</option>
                <option value="cloud">Cloud / Hosting Service</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Start Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="date"
                required
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                End Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="date"
                required
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Renewal Target Date
              </label>
              <Input
                type="date"
                value={form.renewal_date}
                onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Contract Value
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 14500.00"
                value={form.contract_value}
                onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Currency
              </label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                }}
              >
                <option value="INR">INR (₹)</option>
                <option value="AED">AED</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ContractStatus }))}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                }}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              SLA Terms & Support Coverage Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 24/7 phone support, Next Business Day parts dispatch, 4-hour critical SLA..."
              value={form.support_notes}
              onChange={e => setForm(f => ({ ...f, support_notes: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </form>

        {/* Pinned Sticky Footer */}
        <div className="add-vendor-modal-footer">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-contract-form" isLoading={isSubmitting}>
            Save Contract
          </Button>
        </div>
      </div>
    </div>
  );
};
