import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { softwareApi } from '../../api/software';
import type { ProcurementRequestDetail } from '../../types/procurement';
import type { Software } from '../../types';
import { Button, Input } from '../../components/ui';

interface UpdateSoftwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement: ProcurementRequestDetail;
  onSuccess: () => void;
}

export const UpdateSoftwareModal: React.FC<UpdateSoftwareModalProps> = ({
  isOpen,
  onClose,
  procurement,
  onSuccess,
}) => {
  const [softwareId, setSoftwareId] = useState<number | ''>('');
  const [additionalLicenses, setAdditionalLicenses] = useState<number>(procurement.quantity || 1);
  const [notes, setNotes] = useState('');

  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      softwareApi.getSoftwareList({ page_size: 100 })
        .then((res: { results: Software[] }) => {
          setSoftwareList(res.results);

          if (procurement.linked_software) {
            setSoftwareId(procurement.linked_software);
          } else if (res.results.length > 0) {
            // Try to match by item name
            const itemLower = procurement.item_name.toLowerCase();
            const matched = res.results.find(s => itemLower.includes(s.name.toLowerCase()));
            setSoftwareId(matched ? matched.id : res.results[0].id);
          }
        })
        .catch(() => {});

      setAdditionalLicenses(procurement.quantity || 1);
      setNotes(`Added licenses from Procurement ${procurement.request_id} (PO: ${procurement.order_number || 'N/A'})`);
      setError(null);
    }
  }, [isOpen, procurement]);

  if (!isOpen) return null;

  const selectedSoftware = softwareList.find(s => s.id === Number(softwareId));
  const currentLicenses = selectedSoftware?.total_licenses || 0;
  const newLicenses = currentLicenses + Number(additionalLicenses || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareId) {
      setError('Please select the software package to update.');
      return;
    }
    if (additionalLicenses <= 0) {
      setError('Additional licenses must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await procurementApi.updateSoftware(procurement.id, {
        software_id: Number(softwareId),
        additional_licenses: Number(additionalLicenses),
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update software licenses.';
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
          maxWidth: '520px',
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
            <Layers size={18} color="#7C3AED" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Update Software Licenses ({procurement.request_id})
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
              Select Existing Software Record <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(Number(e.target.value))}
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
              <option value="">-- Select Software --</option>
              {softwareList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.software_id}) — Currently: {s.total_licenses} licenses
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Additional Licenses to Add <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              type="number"
              min="1"
              value={additionalLicenses}
              onChange={(e) => setAdditionalLicenses(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          {/* License Expansion Preview */}
          {selectedSoftware && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#F5F3FF',
                border: '1px solid #DDD6FE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 600, textTransform: 'uppercase' }}>
                  Current Total
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#5B21B6' }}>
                  {currentLicenses} seats
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#8B5CF6' }}>+</div>
              <div>
                <div style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 600, textTransform: 'uppercase' }}>
                  Adding Now
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#6D28D9' }}>
                  {additionalLicenses} seats
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#8B5CF6' }}>=</div>
              <div>
                <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
                  New Capacity
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D' }}>
                  {newLicenses} seats
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Notes / License Key Allocation
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Portal confirmation or PO reference..."
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
              Update Software Licenses
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
