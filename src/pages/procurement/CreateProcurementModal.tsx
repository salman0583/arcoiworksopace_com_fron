import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { vendorsApi } from '../../api/vendors';
import type { RequestType, ProcurementPriority } from '../../types/procurement';
import type { Vendor } from '../../types/vendors';
import { Button, Input } from '../../components/ui';

interface CreateProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const CreateProcurementModal: React.FC<CreateProcurementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [itemName, setItemName] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('hardware');
  const [quantity, setQuantity] = useState<number>(1);
  const [estimatedUnitCost, setEstimatedUnitCost] = useState<string>('0');
  const [priority, setPriority] = useState<ProcurementPriority>('medium');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [preferredVendor, setPreferredVendor] = useState<number | null>(null);
  const [businessJustification, setBusinessJustification] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      vendorsApi.list({ page_size: 100 })
        .then(res => setVendors(res.results))
        .catch(() => {});
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const estimatedTotal = (quantity * (parseFloat(estimatedUnitCost) || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Please provide an item name.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (!businessJustification.trim()) {
      setError('Business justification is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await procurementApi.create({
        item_name: itemName.trim(),
        request_type: requestType,
        quantity: Number(quantity),
        estimated_unit_cost: parseFloat(estimatedUnitCost) || 0,
        priority,
        required_by_date: requiredByDate || null,
        preferred_vendor: preferredVendor || null,
        business_justification: businessJustification.trim(),
        description: description.trim(),
        notes: notes.trim(),
      });

      onSuccess(res.request_id);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.item_name?.[0] || 'Failed to submit procurement request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Create Purchase Request
              </h2>
              <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
                Submit a purchase request for hardware, software, or IT equipment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                color: '#B42318',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Item / Product Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              placeholder="e.g. Dell Latitude 5440 Laptop or 27-inch 4K Monitor"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          {/* Type & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Request Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as RequestType)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
              >
                <option value="hardware">Hardware (Laptops, Desktops, Servers)</option>
                <option value="software">Software (New Application)</option>
                <option value="license">License / Subscription Renewal</option>
                <option value="it_service">IT Service / Cloud Provider</option>
                <option value="network">Network / Wi-Fi Equipment</option>
                <option value="accessories">Accessories & Peripherals (Mice, Hubs, Headsets)</option>
                <option value="office_supplies">Office Supplies & Stationery</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Priority <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProcurementPriority)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Quantity & Estimated Unit Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Quantity <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Est. Unit Cost (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedUnitCost}
                onChange={(e) => setEstimatedUnitCost(e.target.value)}
              />
            </div>
          </div>

          {/* Computed Total Cost Banner */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px dashed #E5E9F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: '#667085', fontWeight: 500 }}>
              Estimated Total Budget:
            </span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#172033' }}>
              ₹{estimatedTotal}
            </span>
          </div>

          {/* Preferred Vendor & Required By Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Preferred Vendor (Optional)
              </label>
              <select
                value={preferredVendor || ''}
                onChange={(e) => setPreferredVendor(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
              >
                <option value="">-- Select Preferred Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Required By Date
              </label>
              <Input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
              />
            </div>
          </div>

          {/* Business Justification */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Business Justification <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Why is this purchase required? (e.g. equipment replacement, team expansion, client deliverable)"
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Specifications / Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Technical Specifications / Description
            </label>
            <textarea
              rows={2}
              placeholder="Model numbers, configurations, license tiers, or specific requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E5E9F0',
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
