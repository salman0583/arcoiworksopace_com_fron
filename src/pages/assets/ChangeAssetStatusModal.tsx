import React, { useState } from 'react';
import { X, AlertCircle, AlertTriangle, Activity } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { Button } from '../../components/ui';
import type { Asset, AssetStatus, AssetCondition } from '../../types';
import { logger } from '../../utils/logger';

interface ChangeAssetStatusModalProps {
  isOpen: boolean;
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangeAssetStatusModal: React.FC<ChangeAssetStatusModalProps> = ({ isOpen, asset, onClose, onSuccess }) => {
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [condition, setCondition] = useState<AssetCondition>(asset.condition);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDestructive = status === 'retired' || status === 'disposed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await assetsApi.changeAssetStatus(asset.id, {
        status,
        condition,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to change asset status', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to update asset status.');
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
          maxWidth: '500px',
          width: '100%',
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
            backgroundColor: isDestructive ? '#FEF2F2' : '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: isDestructive ? '#FEE2E2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDestructive ? '#DC2626' : '#175CD3' }}>
              <Activity size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Update Status: {asset.asset_tag}
              </h3>
              <span style={{ fontSize: '12px', color: '#667085' }}>Current: {asset.status}</span>
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
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEE2E2', color: '#B42318', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          {isDestructive && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#FFFAEB', color: '#B54708', border: '1px solid #FEDF89', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Warning:</strong> {status === 'retired'
                  ? 'Retiring this asset will decommission it from active use. If assigned, it will automatically be unassigned.'
                  : 'Disposing this asset marks it as permanently removed from inventory. The record will be preserved for audit history, but cannot be re-assigned.'}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Target Status <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as AssetStatus)}
              style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#172033' }}
              required
            >
              <option value="available">Available (In storage / Ready)</option>
              <option value="in_repair">In Repair (Service center)</option>
              <option value="damaged">Damaged (Requires inspection)</option>
              <option value="lost">Lost (Missing / Unaccounted)</option>
              <option value="retired">Retired (Decommissioned)</option>
              <option value="disposed">Disposed (E-waste / Scrapped)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Condition
            </label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as AssetCondition)}
              style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#172033' }}
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Reason / Activity Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Mainboard fried after power surge; sending for disposal."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #F5F7FA' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              style={isDestructive ? { backgroundColor: '#DC2626' } : undefined}
            >
              Confirm Status Change
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
