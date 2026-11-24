import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, Globe, MapPin, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { vendorsApi } from '../../api/vendors';
import type { VendorType, VendorStatus, VendorDetail } from '../../types/vendors';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vendor: VendorDetail) => void;
}

export const normalizeAndValidateWebsite = (
  url: string
): { isValid: boolean; normalized: string; error?: string } => {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: true, normalized: '' };
  }

  let toTest = trimmed;
  if (!/^https?:\/\//i.test(toTest)) {
    toTest = `https://${toTest}`;
  }

  try {
    const parsed = new URL(toTest);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        isValid: false,
        normalized: trimmed,
        error: 'Please enter a valid website URL with http:// or https:// (e.g. https://example.com).',
      };
    }
    // Hostname must have valid structure (contains a dot, doesn't end with a dot, no spaces)
    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.endsWith('.') || /\s/.test(parsed.hostname)) {
      return {
        isValid: false,
        normalized: trimmed,
        error: 'Please enter a valid website URL (e.g. https://example.com or example.com).',
      };
    }
    return { isValid: true, normalized: toTest };
  } catch {
    return {
      isValid: false,
      normalized: trimmed,
      error: 'Please enter a valid website URL (e.g. https://example.com or example.com).',
    };
  }
};

export const AddVendorModal: React.FC<AddVendorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    vendor_type: 'hardware_supplier' as VendorType,
    status: 'active' as VendorStatus,
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    support_email: '',
    support_phone: '',
    website: '',
    address: '',
    city: 'Hyderabad',
    country: 'India',
    tax_id: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      errors.name = 'Vendor / Supplier Name is required.';
    }

    const websiteValidation = normalizeAndValidateWebsite(form.website);
    if (!websiteValidation.isValid) {
      errors.website = websiteValidation.error || 'Please enter a valid website URL.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const payload = {
      ...form,
      name: trimmedName,
      website: websiteValidation.normalized,
      primary_contact_name: form.primary_contact_name.trim(),
      primary_contact_email: form.primary_contact_email.trim(),
      primary_contact_phone: form.primary_contact_phone.trim(),
      support_email: form.support_email.trim(),
      support_phone: form.support_phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      tax_id: form.tax_id.trim(),
      notes: form.notes.trim(),
    };

    try {
      const created = await vendorsApi.create(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      const backendErrors: Record<string, string> = {};

      if (resp && typeof resp === 'object') {
        if (resp.name) {
          backendErrors.name = Array.isArray(resp.name) ? resp.name[0] : String(resp.name);
        }
        if (resp.website) {
          backendErrors.website = Array.isArray(resp.website) ? resp.website[0] : String(resp.website);
        }
        if (resp.primary_contact_email) {
          backendErrors.primary_contact_email = Array.isArray(resp.primary_contact_email)
            ? resp.primary_contact_email[0]
            : String(resp.primary_contact_email);
        }
        if (resp.support_email) {
          backendErrors.support_email = Array.isArray(resp.support_email)
            ? resp.support_email[0]
            : String(resp.support_email);
        }
        if (resp.detail) {
          setError(String(resp.detail));
        } else if (Object.keys(backendErrors).length === 0) {
          setError(resp.message || 'Failed to register vendor. Please verify the information and try again.');
        }
      } else {
        setError('Failed to register vendor. Please check your connection and try again.');
      }

      setFieldErrors(backendErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        zIndex: 1050,
        padding: '20px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '680px',
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
            padding: '18px 24px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
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
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Register New Vendor
              </h2>
              <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>
                Onboard a technology supplier, maintenance contractor, or service partner
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

          {/* Core Info */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Company Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Vendor / Supplier Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Dell Middle East, Al Falak Computers"
                  value={form.name}
                  error={fieldErrors.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }));
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Vendor Type <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={form.vendor_type}
                  onChange={e => setForm(f => ({ ...f, vendor_type: e.target.value as VendorType }))}
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
                  <option value="hardware_supplier">Hardware Supplier</option>
                  <option value="software_vendor">Software Vendor</option>
                  <option value="internet_network">Internet / Network Provider</option>
                  <option value="it_support">IT Support Provider</option>
                  <option value="printer_amc">Printer / AMC Provider</option>
                  <option value="telecom">Telecom Provider</option>
                  <option value="cloud_hosting">Cloud / Hosting Provider</option>
                  <option value="security">Security Provider</option>
                  <option value="office_tech">Office Technology Supplier</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Initial Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as VendorStatus }))}
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
                  <option value="inactive">Inactive</option>
                  <option value="on_hold">On Hold</option>
                  <option value="blocked">Blocked / Blacklisted</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Website
                </label>
                <Input
                  placeholder="https://www.vendor.com or vendor.com"
                  value={form.website}
                  error={fieldErrors.website}
                  onChange={e => {
                    setForm(f => ({ ...f, website: e.target.value }));
                    if (fieldErrors.website) setFieldErrors(prev => ({ ...prev, website: '' }));
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Tax ID / TRN (VAT)
                </label>
                <Input
                  placeholder="e.g. TRN-100293848100003"
                  value={form.tax_id}
                  onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Primary & Support Contacts */}
          <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Contacts & Technical Support
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Primary Contact Name
                </label>
                <Input
                  placeholder="Account Manager / Contact"
                  value={form.primary_contact_name}
                  onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Primary Email
                </label>
                <Input
                  type="email"
                  placeholder="contact@vendor.com"
                  value={form.primary_contact_email}
                  error={fieldErrors.primary_contact_email}
                  onChange={e => {
                    setForm(f => ({ ...f, primary_contact_email: e.target.value }));
                    if (fieldErrors.primary_contact_email) setFieldErrors(prev => ({ ...prev, primary_contact_email: '' }));
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Primary Phone
                </label>
                <Input
                  placeholder="+971 4 000 0000"
                  value={form.primary_contact_phone}
                  onChange={e => setForm(f => ({ ...f, primary_contact_phone: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Support Escalation Email
                </label>
                <Input
                  type="email"
                  placeholder="support@vendor.com"
                  value={form.support_email}
                  error={fieldErrors.support_email}
                  onChange={e => {
                    setForm(f => ({ ...f, support_email: e.target.value }));
                    if (fieldErrors.support_email) setFieldErrors(prev => ({ ...prev, support_email: '' }));
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Support Escalation Phone
                </label>
                <Input
                  placeholder="+971 800 0000"
                  value={form.support_phone}
                  onChange={e => setForm(f => ({ ...f, support_phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Location & Notes */}
          <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Location & Operational Notes
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  City
                </label>
                <Input
                  placeholder="Hyderabad"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Country
                </label>
                <Input
                  placeholder="India"
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Office Address / Building
              </label>
              <Input
                placeholder="Building Name, Area / Madhapur, Hyderabad"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Internal IT Notes
              </label>
              <textarea
                rows={3}
                placeholder="Account notes, warranty handling guidelines, SLA expectations..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #E5E9F0',
              paddingTop: '16px',
              marginTop: '8px',
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Register Vendor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
