import React, { useState, useEffect } from 'react';
import { X, AlertCircle, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { Button } from '../../components/ui';
import type { Asset, AssetCondition } from '../../types';
import { logger } from '../../utils/logger';

interface ReturnAssetModalProps {
  isOpen: boolean;
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCESSORY_ITEMS = [
  { key: 'laptop', label: 'Laptop / System Unit' },
  { key: 'charger', label: 'Power Adapter / Charger' },
  { key: 'mouse', label: 'Mouse' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'headphone', label: 'Headset / Headphones' },
  { key: 'hdmi', label: 'HDMI Cable' },
  { key: 'monitor', label: 'External Monitor' },
];

export const ReturnAssetModal: React.FC<ReturnAssetModalProps> = ({ isOpen, asset, onClose, onSuccess }) => {
  const [condition, setCondition] = useState<AssetCondition>(asset.condition || 'good');
  const [destinationStatus, setDestinationStatus] = useState<'available' | 'in_repair' | 'damaged' | 'retired'>('available');
  const [accessoriesReturned, setAccessoriesReturned] = useState<Record<string, boolean>>({
    laptop: true,
    charger: true,
    mouse: true,
    keyboard: true,
    headphone: true,
    hdmi: true,
    monitor: false,
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (asset.accessories_issued && Object.keys(asset.accessories_issued).length > 0) {
      setAccessoriesReturned({ ...asset.accessories_issued });
    } else {
      setAccessoriesReturned({
        laptop: true,
        charger: true,
        mouse: true,
        keyboard: true,
        headphone: true,
        hdmi: true,
        monitor: false,
      });
    }
    setCondition(asset.condition || 'good');
    setDestinationStatus('available');
    setNotes('');
    setError(null);
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const toggleAccessory = (key: string) => {
    setAccessoriesReturned(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await assetsApi.returnAsset(asset.id, {
        condition,
        destination_status: destinationStatus,
        accessories_returned: accessoriesReturned,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to return asset', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to process asset return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 23, 57, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E9F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B54708',
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Return Asset: {asset.asset_tag}
              </h3>
              <span style={{ fontSize: '12px', color: '#667085' }}>
                Currently assigned to: <strong>{asset.assigned_to_name}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FEE2E2',
                color: '#B42318',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Condition upon Return <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as AssetCondition)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                }}
                required
              >
                <option value="good">Good (Ready for re-issuance)</option>
                <option value="fair">Fair (Normal wear and tear)</option>
                <option value="damaged">Damaged (Requires repair/maintenance)</option>
                <option value="new">New (Unused condition)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Destination Status <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={destinationStatus}
                onChange={e => setDestinationStatus(e.target.value as 'available' | 'in_repair' | 'damaged' | 'retired')}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                }}
                required
              >
                <option value="available">Available (Inventory pool)</option>
                <option value="in_repair">In Repair (Service center)</option>
                <option value="damaged">Damaged (Hold for assessment)</option>
                <option value="retired">Retired (Decommission)</option>
              </select>
            </div>
          </div>

          {/* Returned Accessories Verification Checklist */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#FAFCFF',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>
              Returned Workstation Accessories Checklist
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {ACCESSORY_ITEMS.map(item => {
                const isChecked = !!accessoriesReturned[item.key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleAccessory(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: isChecked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                      backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                      color: isChecked ? '#1D4ED8' : '#64748B',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: isChecked ? 600 : 400,
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isChecked ? <CheckSquare size={16} color="#2563EB" /> : <Square size={16} color="#94A3B8" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Return Inspection Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Device returned in clean condition. Power adapter and HDMI cable accounted for."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #F5F7FA',
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmitting}>
              Confirm Return
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
