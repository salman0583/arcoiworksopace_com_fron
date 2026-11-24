import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { vendorsApi } from '../../api/vendors';
import type { ContactType, VendorContact } from '../../types/vendors';

interface AddContactModalProps {
  isOpen: boolean;
  vendorId: number;
  vendorName: string;
  onClose: () => void;
  onSuccess: (contact: VendorContact) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  vendorId,
  vendorName,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    role_title: '',
    email: '',
    phone: '',
    contact_type: 'support' as ContactType,
    is_primary: false,
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Contact name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await vendorsApi.addContact(vendorId, form);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.detail) {
        setError(resp.detail);
      } else {
        setError('Failed to add contact. Please check information and try again.');
      }
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
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
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
              <UserPlus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Add Vendor Contact
              </h2>
              <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>
                {vendorName}
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDD3',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#B42318',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Contact Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              required
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Job Title / Role
              </label>
              <Input
                placeholder="e.g. Escalation Engineer"
                value={form.role_title}
                onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Contact Type
              </label>
              <select
                value={form.contact_type}
                onChange={e => setForm(f => ({ ...f, contact_type: e.target.value as ContactType }))}
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
                <option value="support">Technical Support</option>
                <option value="sales">Account / Sales Manager</option>
                <option value="billing">Billing / Invoicing</option>
                <option value="technical">Technical Lead</option>
                <option value="primary">Primary Point of Contact</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Email
              </label>
              <Input
                type="email"
                placeholder="contact@vendor.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Phone Number
              </label>
              <Input
                placeholder="+971 4 000 0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary}
              onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_primary" style={{ fontSize: '13px', color: '#475467', cursor: 'pointer' }}>
              Set as primary contact for this vendor
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Notes (Coverage hours, extension, etc.)
            </label>
            <Input
              placeholder="e.g. Available 9am - 6pm GST, Ext 204"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #E5E9F0',
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
