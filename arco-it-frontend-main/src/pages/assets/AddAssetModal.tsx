import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Laptop, Building2, QrCode, CheckCircle2, Printer } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { vendorsApi } from '../../api/vendors';
import { Button } from '../../components/ui';
import { AssetLabelModal } from '../../components/assets/AssetLabelModal';
import type { Asset, AssetType, CreateAssetPayload, AssetStatus, AssetCondition, AssetCategory } from '../../types';
import { sortAssetTypes } from '../../utils/assets';
import { logger } from '../../utils/logger';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [registeredVendors, setRegisteredVendors] = useState<{ id: number; name: string }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [category, setCategory] = useState<AssetCategory>('it');
  const [predictedTag, setPredictedTag] = useState<string>('ARCO-IT-0001');
  const [loadingTag, setLoadingTag] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state for instant label printing
  const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const [form, setForm] = useState<CreateAssetPayload>({
    asset_tag: '',
    category: 'it',
    asset_type: 0,
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    status: 'available',
    condition: 'new',
    location: 'Hyderabad, Telangana, India',
    purchase_date: '',
    purchase_price: '',
    vendor: '',
    warranty_start_date: '',
    warranty_end_date: '',
    notes: '',
  });

  const fetchNextTag = async (cat: AssetCategory) => {
    setLoadingTag(true);
    try {
      const res = await assetsApi.getNextAssetTag(cat);
      setPredictedTag(res.next_tag);
      setForm(prev => ({ ...prev, asset_tag: res.next_tag, category: cat }));
    } catch (err) {
      console.warn('Could not fetch predicted tag:', err);
    } finally {
      setLoadingTag(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCreatedAsset(null);
      setShowLabelModal(false);
      setError(null);
      return;
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const data = await assetsApi.getAssetTypes();
        const sorted = sortAssetTypes(data);
        setTypes(sorted);
        const filtered = sorted.filter(t => !t.default_category || t.default_category === category);
        if (filtered.length > 0 && form.asset_type === 0) {
          setForm(prev => ({ ...prev, asset_type: filtered[0].id }));
        }
      } catch (err) {
        logger.error('Assets', 'Failed to load asset types', err);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchTypes();
    fetchNextTag(category);

    vendorsApi.list({ page_size: 100 }).then(res => {
      setRegisteredVendors(res.results.map(v => ({ id: v.id, name: v.name })));
    }).catch(() => {});

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showLabelModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showLabelModal, onClose]);

  const handleCategoryChange = (newCat: AssetCategory) => {
    setCategory(newCat);
    fetchNextTag(newCat);

    // Filter available types for this category
    const matchingTypes = types.filter(t => !t.default_category || t.default_category === newCat);
    if (matchingTypes.length > 0) {
      setForm(prev => ({ ...prev, category: newCat, asset_type: matchingTypes[0].id }));
    } else {
      setForm(prev => ({ ...prev, category: newCat }));
    }
  };

  const handleTypeChange = (typeId: number) => {
    const selected = types.find(t => t.id === typeId);
    if (selected && selected.default_category && selected.default_category !== category) {
      setCategory(selected.default_category);
      fetchNextTag(selected.default_category);
      setForm(prev => ({ ...prev, asset_type: typeId, category: selected.default_category }));
    } else {
      setForm(prev => ({ ...prev, asset_type: typeId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.asset_type) {
      setError('Please select an Asset Type.');
      return;
    }
    if (!form.name.trim()) {
      setError('Asset Name / Description is required.');
      return;
    }
    if (!form.manufacturer.trim()) {
      setError('Manufacturer is required.');
      return;
    }
    if (!form.model.trim()) {
      setError('Model is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateAssetPayload = {
        ...form,
        category,
        asset_tag: form.asset_tag?.trim().toUpperCase() || predictedTag,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        warranty_start_date: form.warranty_start_date || null,
        warranty_end_date: form.warranty_end_date || null,
      };
      const created = await assetsApi.createAsset(payload);
      setCreatedAsset(created);
      onSuccess();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to create asset', err);
      const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setError(`${firstKey.replace('_', ' ')}: ${msg}`);
      } else {
        setError('Failed to create asset. Please check the required fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // If asset was just created successfully, show quick confirmation drawer with label printing
  if (createdAsset) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 26, 59, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '520px',
            maxWidth: '100vw',
            height: '100vh',
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#172033', margin: 0 }}>
              Asset Created
            </h3>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#D1FADF',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: '0 0 6px 0' }}>
              Asset Created Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: '#475467', margin: '0 0 20px 0' }}>
              Permanent Asset ID:{' '}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#1D4ED8',
                  backgroundColor: '#EFF6FF',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #BFDBFE',
                }}
              >
                {createdAsset.asset_tag}
              </span>
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                textAlign: 'left',
                fontSize: '13px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#667085' }}>Asset Name:</span>
                <span style={{ fontWeight: 600, color: '#101828' }}>{createdAsset.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#667085' }}>Category:</span>
                <span style={{ fontWeight: 600, color: '#101828' }}>
                  {createdAsset.category === 'admin_facilities' ? 'Admin & Facilities' : 'IT Asset'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#667085' }}>QR Payload:</span>
                <span style={{ fontFamily: 'monospace', color: '#2563EB', fontWeight: 500 }}>
                  {createdAsset.qr_code_url}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowLabelModal(true)}
                leftIcon={<Printer size={16} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Print Physical Sticker (60×25mm)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done &amp; Return to List
              </Button>
            </div>
          </div>

          {showLabelModal && (
            <AssetLabelModal
              isOpen={showLabelModal}
              onClose={() => {
                setShowLabelModal(false);
                onClose();
              }}
              assets={[createdAsset]}
            />
          )}
        </div>
      </div>
    );
  }

  const categoryTypes = types.filter(t => !t.default_category || t.default_category === category);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#344054',
    marginBottom: '5px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '36px',
    padding: '0 12px',
    borderRadius: '6px',
    border: '1px solid #D0D5DD',
    fontSize: '13px',
    color: '#101828',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '36px',
    padding: '0 10px',
    borderRadius: '6px',
    border: '1px solid #D0D5DD',
    fontSize: '13px',
    color: '#101828',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(7, 26, 59, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '580px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172033', margin: 0, lineHeight: 1.2 }}>
              Add Asset
            </h2>
            <p style={{ fontSize: '12px', color: '#667085', margin: '3px 0 0 0' }}>
              Create a new company asset.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#667085',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECDCA',
                  borderRadius: '8px',
                  color: '#B42318',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="#DC2626" />
                <span>{error}</span>
              </div>
            )}

            {/* Asset Category */}
            <div>
              <label style={labelStyle}>
                Asset Category <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('it')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: category === 'it' ? '2px solid #2563EB' : '1px solid #D0D5DD',
                    backgroundColor: category === 'it' ? '#EFF6FF' : '#FFFFFF',
                    color: category === 'it' ? '#1D4ED8' : '#475467',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <Laptop size={15} /> IT Assets
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('admin_facilities')}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: category === 'admin_facilities' ? '2px solid #2563EB' : '1px solid #D0D5DD',
                    backgroundColor: category === 'admin_facilities' ? '#EFF6FF' : '#FFFFFF',
                    color: category === 'admin_facilities' ? '#1D4ED8' : '#475467',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <Building2 size={15} /> Admin &amp; Facilities
                </button>
              </div>
            </div>

            {/* Next Sequential Asset ID */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    display: 'block',
                  }}
                >
                  Next Sequential Asset ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#1E40AF' }}>
                    {predictedTag}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#DBEAFE',
                      color: '#1D4ED8',
                    }}
                  >
                    Auto-assigned
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Backend Authoritative
              </span>
            </div>

            {/* Asset Type */}
            <div>
              <label style={labelStyle}>
                Asset Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={form.asset_type || ''}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
                style={selectStyle}
                required
              >
                <option value="" disabled>Select an Asset Type</option>
                {categoryTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Name / Description */}
            <div>
              <label style={labelStyle}>
                Asset Name / Description <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. MacBook Pro 16 M3 Max or Daikin 2.5 Ton AC"
                style={inputStyle}
                required
              />
            </div>

            {/* Manufacturer & Model (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Manufacturer <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                  placeholder="e.g. Apple, Dell, Daikin"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Model <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="e.g. A2991, XPS 15"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* Serial Number & Initial Status (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Serial Number</label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={e => setForm(f => ({ ...f, serial_number: e.target.value.toUpperCase() }))}
                  placeholder="e.g. C02G783KMD6R"
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Initial Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as AssetStatus }))}
                  style={selectStyle}
                >
                  <option value="available">Available / In Stock</option>
                  <option value="in_repair">In Repair</option>
                  <option value="damaged">Damaged</option>
                  <option value="retired">Retired</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
            </div>

            {/* Condition & Physical Location (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Condition</label>
                <select
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value as AssetCondition }))}
                  style={selectStyle}
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Physical Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Hyderabad HQ - Floor 3"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Purchase Date & Price (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Purchase Date</label>
                <input
                  type="date"
                  value={form.purchase_date || ''}
                  onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.purchase_price || ''}
                  onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                  placeholder="e.g. 55000.00"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Supplier / Vendor */}
            <div>
              <label style={labelStyle}>Supplier / Vendor</label>
              {registeredVendors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <select
                    value={form.vendor_supplier || ''}
                    onChange={(e) => {
                      const vId = Number(e.target.value);
                      const vendorObj = registeredVendors.find(v => v.id === vId);
                      setForm(f => ({
                        ...f,
                        vendor_supplier: vId || null,
                        vendor: vendorObj ? vendorObj.name : f.vendor,
                      }));
                    }}
                    style={selectStyle}
                  >
                    <option value="">— Select registered supplier (or type below) —</option>
                    {registeredVendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="Or enter vendor name manually..."
                    style={inputStyle}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="e.g. Dell India, Apple India"
                  style={inputStyle}
                />
              )}
            </div>

            {/* Warranty Start & End (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Warranty Start</label>
                <input
                  type="date"
                  value={form.warranty_start_date || ''}
                  onChange={e => setForm(f => ({ ...f, warranty_start_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Warranty End</label>
                <input
                  type="date"
                  value={form.warranty_end_date || ''}
                  onChange={e => setForm(f => ({ ...f, warranty_end_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Notes & Specifications */}
            <div>
              <label style={labelStyle}>Notes &amp; Specifications</label>
              <textarea
                rows={3}
                placeholder="e.g. Configuration specs, MAC address, special instructions..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Fixed Drawer Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering Asset...' : 'Save & Generate QR Label'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
