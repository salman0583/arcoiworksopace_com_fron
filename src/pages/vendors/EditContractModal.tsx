import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { vendorsApi } from '../../api/vendors';
import type { Contract, ContractType, ContractStatus } from '../../types/vendors';

interface EditContractModalProps {
  isOpen: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSuccess: (updated: Contract) => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  isOpen,
  contract,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    contract_type: 'amc' as ContractType,
    start_date: '',
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
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (contract) {
      setForm({
        name: contract.name || '',
        contract_type: contract.contract_type || 'amc',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        renewal_date: contract.renewal_date || '',
        contract_value: contract.contract_value !== null && contract.contract_value !== undefined ? String(contract.contract_value) : '',
        currency: contract.currency || 'INR',
        status: contract.status || 'active',
        support_notes: contract.support_notes || '',
        notes: contract.notes || '',
      });
      setError(null);
    }
  }, [contract]);

  if (!isOpen || !contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Contract name is required.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('Start date and end date are required.');
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
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date,
        renewal_date: form.renewal_date || null,
        status: form.status,
        support_notes: form.support_notes,
        notes: form.notes,
      };
      if (form.contract_value !== '') {
        payload.contract_value = form.contract_value;
      }

      const updated = await vendorsApi.updateContract(contract.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.end_date) {
        setError(Array.isArray(resp.end_date) ? resp.end_date[0] : resp.end_date);
      } else if (resp?.detail) {
        setError(resp.detail);
      } else {
        setError('Failed to update contract. Please review the details.');
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
                Edit / Renew Contract ({contract.contract_id})
              </h2>
              <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>
                Vendor: {contract.vendor_name}
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

        {/* Form Body */}
        <form
          id="edit-contract-form"
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
              Contract Title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Contract Type
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Start Date
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
                End Date (Renewal Deadline)
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Contract Value
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              SLA Terms & Support Coverage Notes
            </label>
            <textarea
              rows={3}
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Internal Notes
            </label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </form>

        {/* Pinned Sticky Footer */}
        <div className="add-vendor-modal-footer">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="edit-contract-form" isLoading={isSubmitting}>
            Update Contract
          </Button>
        </div>
      </div>
    </div>
  );
};
