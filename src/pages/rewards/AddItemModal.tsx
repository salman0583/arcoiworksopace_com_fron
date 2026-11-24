import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button, Input } from '../../components/ui';
import { rewardsApi } from '../../api/rewards';
import type { RewardItem, RewardCategory } from '../../types/rewards';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: RewardItem) => void;
  programId: number;
  programName: string;
  itemToEdit?: RewardItem | null;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  programId,
  programName,
  itemToEdit,
}) => {
  const isEditing = Boolean(itemToEdit);

  // Dynamic Free-Text Reward Name
  const [rewardName, setRewardName] = useState('');
  const [category, setCategory] = useState<RewardCategory>('physical');
  const [quantityReceived, setQuantityReceived] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [procurementReference, setProcurementReference] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setRewardName(itemToEdit.reward_name);
      setCategory(itemToEdit.category);
      setQuantityReceived(String(itemToEdit.quantity_received));
      setUnitCost(itemToEdit.unit_cost ? String(itemToEdit.unit_cost) : '');
      setProcurementReference(itemToEdit.procurement_reference || '');
      setAvailableDate(itemToEdit.available_date || '');
      setDescription(itemToEdit.description || '');
      setNotes(itemToEdit.notes || '');
    } else {
      setRewardName('');
      setCategory('physical');
      setQuantityReceived('25');
      setUnitCost('');
      setProcurementReference('');
      setAvailableDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setNotes('');
    }
    setError(null);
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim()) {
      setError('Product / Reward Name is required.');
      return;
    }

    const qty = parseInt(quantityReceived, 10);
    if (isNaN(qty) || qty < 1) {
      setError('Quantity received must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        program: programId,
        reward_name: rewardName.trim(),
        category,
        quantity_received: qty,
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        procurement_reference: procurementReference.trim(),
        available_date: availableDate || undefined,
        description: description.trim(),
        notes: notes.trim(),
      };

      let result: RewardItem;
      if (isEditing && itemToEdit) {
        result = await rewardsApi.updateItem(itemToEdit.id, payload);
      } else {
        result = await rewardsApi.createItem(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.reward_name?.[0] ||
        err.response?.data?.quantity_received?.[0] ||
        err.response?.data?.detail ||
        'Failed to save reward item. Please verify required fields.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Item / Reward' : 'Add Item / Reward'}
      subtitle={`Program: ${programName}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Item Changes' : 'Add Item to Program'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              color: '#B42318',
              borderRadius: '6px',
              border: '1px solid #FECDCA',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Dynamic Free-Text Reward Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Product / Reward Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <Input
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder="Type any item (e.g. Stainless Steel Thermal Flask, ₹5,000 Gift Card, Bluetooth Speaker)"
            required
            autoFocus
          />
          <span style={{ fontSize: '11px', color: '#667085', marginTop: '4px', display: 'block' }}>
            Free-text title for this item or reward (supports any future product/award).
          </span>
        </div>

        {/* 2-Column Grid */}
        <div className="rewards-form-grid-2">
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RewardCategory)}
              className="standard-select"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#fff',
                color: '#172033',
                outline: 'none',
              }}
            >
              <option value="physical">Physical Item</option>
              <option value="voucher">Gift Voucher / Coupon</option>
              <option value="digital">Digital Reward</option>
              <option value="merchandise">Branded Merchandise</option>
              <option value="gift">Gourmet Box / Festive Gift</option>
              <option value="other">Other Reward</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Quantity Received <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <Input
              type="number"
              min="1"
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
              placeholder="e.g. 50"
              required
            />
          </div>
        </div>

        <div className="rewards-form-grid-2">
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Unit Cost (₹)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g. 75.00"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Procurement Reference / PO Number
            </label>
            <Input
              value={procurementReference}
              onChange={(e) => setProcurementReference(e.target.value)}
              placeholder="e.g. PO-2026-APP-01"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Available / Received Date
          </label>
          <Input
            type="date"
            value={availableDate}
            onChange={(e) => setAvailableDate(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Description & Specifications
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Item specifications, model, dimensions, or voucher terms..."
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              fontFamily: 'inherit',
              color: '#172033',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Notes / Packaging Info
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gift wrapping, delivery location, or storage notes..."
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              fontFamily: 'inherit',
              color: '#172033',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </form>
    </Modal>
  );
};
