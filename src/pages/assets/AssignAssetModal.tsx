import React, { useState, useEffect } from 'react';
import { X, AlertCircle, UserCheck, CheckSquare, Square } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { employeesApi } from '../../api/employees';
import { Button } from '../../components/ui';
import type { Asset, Employee, AssetCondition } from '../../types';
import { logger } from '../../utils/logger';

interface AssignAssetModalProps {
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

export const AssignAssetModal: React.FC<AssignAssetModalProps> = ({ isOpen, asset, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [condition, setCondition] = useState<AssetCondition>(asset.condition || 'good');
  const [reason, setReason] = useState<string>('initial_issue');
  const [accessories, setAccessories] = useState<Record<string, boolean>>({
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
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await employeesApi.list({ page_size: 100, status: 'active' });
        setEmployees(res.results);
        if (res.results.length > 0) {
          setSelectedEmployeeId(res.results[0].id);
        }
      } catch (err) {
        logger.error('Assets', 'Failed to fetch employees for assignment', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
    setCondition(asset.condition || 'good');
    setReason('initial_issue');
    setAccessories({
      laptop: true,
      charger: true,
      mouse: true,
      keyboard: true,
      headphone: true,
      hdmi: true,
      monitor: false,
    });
    setNotes('');
    setError(null);
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const toggleAccessory = (key: string) => {
    setAccessories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await assetsApi.assignAsset(asset.id, {
        employee_id: selectedEmployeeId,
        condition,
        accessories,
        reason,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to assign asset', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to assign asset. Please verify status.');
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
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#175CD3',
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Assign Asset: {asset.asset_tag}
              </h3>
              <span style={{ fontSize: '12px', color: '#667085' }}>{asset.name}</span>
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

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Select Assignee (Active Employee) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(Number(e.target.value))}
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
              disabled={loadingEmployees}
              required
            >
              <option value={0}>-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id}) — {typeof emp.department === 'object' ? emp.department.name : emp.department_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Assignment Reason
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
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
              >
                <option value="initial_issue">New Employee Onboarding / Initial Issue</option>
                <option value="redistribution">Internal Redistribution</option>
                <option value="hardware_upgrade">Hardware Upgrade</option>
                <option value="temporary_allocation">Temporary Allocation</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Condition on Assignment
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
              >
                <option value="good">Good (Fully Operational)</option>
                <option value="new">New (Brand New / Sealed)</option>
                <option value="fair">Fair (Normal Wear)</option>
                <option value="damaged">Damaged (Minor Defect)</option>
              </select>
            </div>
          </div>

          {/* Workstation Accessories Checklist */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#FAFCFF',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>
              Workstation Accessories Checklist
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {ACCESSORY_ITEMS.map(item => {
                const isChecked = !!accessories[item.key];
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
              Assignment Notes / Handover Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Issued with power adapter, HDMI cable, and laptop bag."
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
            <Button type="submit" isLoading={isSubmitting}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
