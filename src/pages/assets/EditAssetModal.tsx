import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Edit3 } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { Button, Input } from '../../components/ui';
import type { Asset, AssetType, CreateAssetPayload, AssetCondition } from '../../types';
import { sortAssetTypes } from '../../utils/assets';
import { logger } from '../../utils/logger';

interface EditAssetModalProps {
  isOpen: boolean;
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({ isOpen, asset, onClose, onSuccess }) => {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<CreateAssetPayload>>({
    name: asset.name,
    asset_type: asset.asset_type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serial_number: asset.serial_number || '',
    condition: asset.condition,
    location: asset.location || '',
    purchase_date: asset.purchase_date || '',
    purchase_price: asset.purchase_price || '',
    vendor: asset.vendor || '',
    warranty_start_date: asset.warranty_start_date || '',
    warranty_end_date: asset.warranty_end_date || '',
    notes: asset.notes || '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const data = await assetsApi.getAssetTypes();
        setTypes(sortAssetTypes(data));
      } catch (err) {
        logger.error('Assets', 'Failed to load asset types', err);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
    setForm({
      name: asset.name,
      asset_type: asset.asset_type,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serial_number: asset.serial_number || '',
      condition: asset.condition,
      location: asset.location || '',
      purchase_date: asset.purchase_date || '',
      purchase_price: asset.purchase_price || '',
      vendor: asset.vendor || '',
      warranty_start_date: asset.warranty_start_date || '',
      warranty_end_date: asset.warranty_end_date || '',
      notes: asset.notes || '',
    });
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError('Asset Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: Partial<CreateAssetPayload> = {
        ...form,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        warranty_start_date: form.warranty_start_date || null,
        warranty_end_date: form.warranty_end_date || null,
      };
      await assetsApi.updateAsset(asset.id, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to update asset', err);
      setError('Failed to update asset. Please check the entered values.');
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
          maxWidth: '640px',
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
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#175CD3' }}>
              <Edit3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Edit Asset: {asset.asset_tag}
              </h3>
              <span style={{ fontSize: '12px', color: '#667085' }}>Modify hardware details and specifications</span>
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEE2E2', color: '#B42318', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Asset Name / Title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              value={form.name || ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Asset Type
              </label>
              <select
                value={form.asset_type || 0}
                onChange={e => setForm(f => ({ ...f, asset_type: Number(e.target.value) }))}
                style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#172033' }}
                disabled={loadingTypes}
              >
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Condition
              </label>
              <select
                value={form.condition || 'good'}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value as AssetCondition }))}
                style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#172033' }}
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Manufacturer
              </label>
              <Input
                value={form.manufacturer || ''}
                onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Model
              </label>
              <Input
                value={form.model || ''}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Serial Number
              </label>
              <Input
                value={form.serial_number || ''}
                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Location
              </label>
              <Input
                value={form.location || ''}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Price
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.purchase_price || ''}
                onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Vendor
              </label>
              <Input
                value={form.vendor || ''}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Warranty Start Date
              </label>
              <Input
                type="date"
                value={form.warranty_start_date || ''}
                onChange={e => setForm(f => ({ ...f, warranty_start_date: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Warranty End Date
              </label>
              <Input
                type="date"
                value={form.warranty_end_date || ''}
                onChange={e => setForm(f => ({ ...f, warranty_end_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #F5F7FA' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
