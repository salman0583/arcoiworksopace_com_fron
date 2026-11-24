import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Laptop, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { assetsApi } from '../../api/assets';
import type { Asset, MyAsset, AssetCondition } from '../../types';
import type { Employee360Asset } from '../../types';

export interface AssetAcknowledgementModalProps {
  asset: Asset | MyAsset | Employee360Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssetAcknowledgementModal: React.FC<AssetAcknowledgementModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [condition, setCondition] = useState<AssetCondition>('good');
  const [notes, setNotes] = useState('');
  const [reportIssue, setReportIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && asset) {
      setCondition((asset.condition as AssetCondition) || 'good');
      setNotes('');
      setReportIssue(false);
      setError(null);
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportIssue && !notes.trim()) {
      setError('Please provide details in the notes explaining the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await assetsApi.acknowledgeAsset(asset.id, {
        condition,
        notes: notes.trim(),
        report_issue: reportIssue,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to acknowledge asset receipt. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const assetTag = asset.asset_tag;
  const assetName = asset.name;
  const manufacturer = 'manufacturer' in asset ? asset.manufacturer : '';
  const model = 'model' in asset ? asset.model : '';
  const serial = 'serial_number' in asset ? asset.serial_number : '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 23, 57, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
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
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172033', margin: 0 }}>
                Acknowledge Asset Handover
              </h2>
              <p style={{ fontSize: '12px', color: '#667085', margin: 0 }}>
                Confirm equipment possession and report physical condition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#98A2B3',
              cursor: submitting ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                borderRadius: '8px',
                color: '#B42318',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Asset Info Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E9F0',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '18px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                flexShrink: 0,
              }}
            >
              <Laptop size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#172033',
                    backgroundColor: '#E5E9F0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {assetTag}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {assetName}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#667085', marginTop: '3px' }}>
                {[manufacturer, model].filter(Boolean).join(' • ')}
                {serial ? ` (S/N: ${serial})` : ''}
              </div>
            </div>
          </div>

          {/* Condition Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475467',
                marginBottom: '8px',
              }}
            >
              Condition Upon Handover <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(
                [
                  { value: 'new', label: 'New / Mint' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'damaged', label: 'Damaged' },
                ] as const
              ).map((cond) => {
                const isSelected = condition === cond.value;
                return (
                  <button
                    key={cond.value}
                    type="button"
                    onClick={() => setCondition(cond.value)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E5E9F0',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#175CD3' : '#475467',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>{cond.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Issue Checkbox */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: reportIssue ? '#FEF2F2' : '#F8FAFC',
              border: reportIssue ? '1px solid #FECDCA' : '1px solid #E5E9F0',
              marginBottom: '18px',
              transition: 'all 0.15s ease',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: reportIssue ? '#B42318' : '#475467',
              }}
            >
              <input
                type="checkbox"
                checked={reportIssue}
                onChange={(e) => setReportIssue(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#EF4444' }}
              />
              <div>
                <span>Report an issue with this equipment</span>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: reportIssue ? '#B42318' : '#667085',
                    margin: '2px 0 0 0',
                  }}
                >
                  Check this if the item is damaged, incomplete, not matching specs, or malfunctioning. IT Support will receive an alert.
                </p>
              </div>
            </label>
          </div>

          {/* Condition Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475467',
                marginBottom: '6px',
              }}
            >
              {reportIssue ? 'Issue Details / Notes *' : 'Handover Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                reportIssue
                  ? 'Please describe the defect, missing parts, or malfunction...'
                  : 'Add any remarks regarding accessories received, condition, etc.'
              }
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid #E5E9F0',
              paddingTop: '16px',
            }}
          >
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              style={{
                backgroundColor: reportIssue ? '#EF4444' : '#2563EB',
                borderColor: reportIssue ? '#EF4444' : '#2563EB',
                color: '#FFFFFF',
              }}
              isLoading={submitting}
              leftIcon={reportIssue ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            >
              {reportIssue ? 'Report Issue & Submit' : 'Confirm & Acknowledge Receipt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
