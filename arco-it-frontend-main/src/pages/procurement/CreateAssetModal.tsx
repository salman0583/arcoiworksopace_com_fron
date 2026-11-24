import React, { useState, useEffect } from 'react';
import { X, Laptop, CheckCircle2 } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { assetsApi } from '../../api/assets';
import type { ProcurementRequestDetail } from '../../types/procurement';
import type { AssetType } from '../../types';
import { sortAssetTypes } from '../../utils/assets';
import { Button, Input } from '../../components/ui';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  procurement: ProcurementRequestDetail;
  onSuccess: () => void;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  isOpen,
  onClose,
  procurement,
  onSuccess,
}) => {
  const [assetTag, setAssetTag] = useState('');
  const [assetTypeId, setAssetTypeId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      assetsApi.getAssetTypes()
        .then(types => {
          const sorted = sortAssetTypes(types);
          setAssetTypes(sorted);
          if (sorted.length > 0) {
            // Match type by item name keywords
            const itemLower = procurement.item_name.toLowerCase();
            const matched = sorted.find(t => itemLower.includes(t.name.toLowerCase()));
            setAssetTypeId(matched ? matched.id : sorted[0].id);
          }
        })
        .catch(() => {});

      // Parse brand / model from item name
      const itemName = procurement.item_name;
      setName(itemName);
      const parts = itemName.split(' ');
      const guessedMfr = parts[0] || 'Dell';
      const guessedModel = parts.slice(1).join(' ') || itemName;
      setManufacturer(guessedMfr);
      setModel(guessedModel);

      // Pre-fill tag sequence e.g. ARCO-LAP-030
      const nextNum = 30 + procurement.created_assets.length;
      setAssetTag(`ARCO-LAP-0${nextNum}`);

      const pDate = procurement.actual_delivery_date || procurement.order_date || new Date().toISOString().split('T')[0];
      setPurchaseDate(pDate);
      setWarrantyStartDate(pDate);

      const pPrice = procurement.actual_unit_cost || procurement.estimated_unit_cost || '0';
      setPurchasePrice(pPrice);

      setNotes(`Created from Procurement Request ${procurement.request_id} (PO: ${procurement.order_number || 'N/A'})`);
      setError(null);
    }
  }, [isOpen, procurement]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetTag.trim()) {
      setError('Asset tag is required.');
      return;
    }
    if (!assetTypeId) {
      setError('Please select an asset type.');
      return;
    }
    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await procurementApi.createAsset(procurement.id, {
        asset_tag: assetTag.trim(),
        asset_type_id: Number(assetTypeId),
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim(),
        purchase_date: purchaseDate || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        vendor: procurement.actual_vendor_detail?.name || procurement.vendor_name,
        vendor_supplier_id: procurement.actual_vendor || procurement.preferred_vendor || undefined,
        warranty_start_date: warrantyStartDate || null,
        warranty_end_date: warrantyEndDate || null,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.asset_tag?.[0] || err.response?.data?.detail || 'Failed to create asset.';
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
          maxWidth: '600px',
          maxHeight: '90vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            <Laptop size={18} color="#2563EB" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Create Asset from Purchase ({procurement.request_id})
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B42318', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Asset Tag <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="e.g. ARCO-LAP-026"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Asset Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={assetTypeId}
                onChange={(e) => setAssetTypeId(Number(e.target.value))}
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
                <option value="">-- Select Type --</option>
                {assetTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Asset Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dell Latitude 5440"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Manufacturer <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Model <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Serial Number
              </label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Hardware S/N"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Purchase Price (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Purchase Date
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Vendor
              </label>
              <Input
                value={procurement.actual_vendor_detail?.name || procurement.vendor_name || 'Dell'}
                readOnly
                disabled
              />
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E9F0',
              fontSize: '12px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0 }} />
            <span>Initial status will be set to <strong>Available</strong> in Asset Management, ready for assignment to an employee.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E5E9F0' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Register Asset in Asset Management
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
