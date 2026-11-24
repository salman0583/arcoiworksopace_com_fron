import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import type { ProcurementRequestDetail, ReceivingCondition } from '../../types/procurement';
import { Button, Input } from '../../components/ui';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement: ProcurementRequestDetail;
  onSuccess: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  procurement,
  onSuccess,
}) => {
  const pendingQty = Math.max(0, procurement.quantity - procurement.received_quantity);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityReceived, setQuantityReceived] = useState<number>(pendingQty || 1);
  const [condition, setCondition] = useState<ReceivingCondition>('good');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantityReceived(pendingQty || 1);
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setCondition('good');
      setNotes('');
      setError(null);
    }
  }, [isOpen, pendingQty]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantityReceived <= 0) {
      setError('Received quantity must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await procurementApi.receive(procurement.id, {
        received_date: receivedDate,
        quantity_received: Number(quantityReceived),
        condition,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to record received items.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const willBeFullyReceived = (procurement.received_quantity + Number(quantityReceived)) >= procurement.quantity;

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
          maxWidth: '500px',
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
            <PackageCheck size={18} color="#059669" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Record Delivery / Receiving
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
          {/* Quantity Progress Summary */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #D1FADF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Ordered
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534' }}>
                {procurement.quantity} units
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
                Already Received
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D' }}>
                {procurement.received_quantity} units
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#B54708', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#B54708' }}>
                {pendingQty} units
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B42318', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Delivery Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Quantity Delivered Now <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Condition of Received Goods
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ReceivingCondition)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                backgroundColor: '#fff',
              }}
            >
              <option value="good">Good Condition (Sealed & Verified)</option>
              <option value="acceptable">Acceptable (Minor Box Wear / Functional)</option>
              <option value="damaged">Damaged / Needs Vendor Replacement</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Receiving Notes / Storage Location
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivered to 2nd Floor IT Storage Room by DHL tracking #..."
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

          {/* Resulting status info badge */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: willBeFullyReceived ? '#EFF6FF' : '#FFFAEB',
              border: `1px solid ${willBeFullyReceived ? '#B2CCFF' : '#FEDF89'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: willBeFullyReceived ? '#1E40AF' : '#92400E',
            }}
          >
            <AlertCircle size={15} />
            <span>
              {willBeFullyReceived
                ? 'This delivery will fulfill the entire order (Status will become "Received").'
                : `Partial delivery: ${procurement.quantity - (procurement.received_quantity + Number(quantityReceived))} unit(s) will remain pending (Status will be "Partially Received").`}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E5E9F0' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Confirm Delivery
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
