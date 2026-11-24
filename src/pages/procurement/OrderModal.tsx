import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { vendorsApi } from '../../api/vendors';
import type { ProcurementRequestDetail } from '../../types/procurement';
import type { Vendor } from '../../types/vendors';
import { Button, Input } from '../../components/ui';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement: ProcurementRequestDetail;
  onSuccess: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  procurement,
  onSuccess,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [actualUnitCost, setActualUnitCost] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      vendorsApi.list({ page_size: 100 })
        .then(res => {
          setVendors(res.results);
          // Pre-select preferred vendor if available
          if (procurement.preferred_vendor) {
            setVendorId(procurement.preferred_vendor);
          } else if (res.results.length > 0) {
            setVendorId(res.results[0].id);
          }
        })
        .catch(() => {});

      // Pre-fill initial PO number sequence e.g. PO-2026-XXX
      const year = new Date().getFullYear();
      setOrderNumber(procurement.order_number || `PO-${year}-${String(procurement.id).padStart(3, '0')}`);
      setActualUnitCost(procurement.actual_unit_cost || procurement.estimated_unit_cost || '0');
      setError(null);
    }
  }, [isOpen, procurement]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Order / PO Number is required.');
      return;
    }
    if (!vendorId) {
      setError('Please select the vendor fulfilling this order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await procurementApi.order(procurement.id, {
        order_number: orderNumber.trim(),
        order_date: orderDate,
        actual_vendor_id: Number(vendorId),
        expected_delivery_date: expectedDeliveryDate || null,
        actual_unit_cost: actualUnitCost ? parseFloat(actualUnitCost) : null,
        order_notes: orderNotes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.order_number?.[0] || 'Failed to record purchase order.';
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
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#0284C7" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Record Purchase Order
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B42318', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Purchase Order Number (PO #) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. PO-2026-001"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Order Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Vendor <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(Number(e.target.value))}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                }}
              >
                <option value="">-- Select Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Expected Delivery Date
              </label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Actual Unit Price (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={actualUnitCost}
                onChange={(e) => setActualUnitCost(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Order Notes / Tracking Information
            </label>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Quote reference, tracking URL, courier name, etc."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E5E9F0' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Save & Mark Ordered
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
