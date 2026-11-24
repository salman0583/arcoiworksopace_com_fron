import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ArrowRightLeft, UserCheck, ShieldCheck, CheckSquare, Square } from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { employeesApi } from '../../api/employees';
import { Button } from '../../components/ui';
import type { Asset, Employee, AssetCondition } from '../../types';
import { logger } from '../../utils/logger';

interface ReassignAssetModalProps {
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

export const ReassignAssetModal: React.FC<ReassignAssetModalProps> = ({ isOpen, asset, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [conditionOnReturn, setConditionOnReturn] = useState<AssetCondition>('good');
  const [conditionOnAssignment, setConditionOnAssignment] = useState<AssetCondition>('good');
  const [reason, setReason] = useState<string>('redistribution');
  const [accessoriesReturned, setAccessoriesReturned] = useState<Record<string, boolean>>({
    laptop: true,
    charger: true,
    mouse: true,
    keyboard: true,
    headphone: true,
    hdmi: true,
    monitor: false,
  });
  const [accessoriesIssued, setAccessoriesIssued] = useState<Record<string, boolean>>({
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
        // Exclude current custodian
        const filtered = res.results.filter(e => e.id !== asset.assigned_to);
        setEmployees(filtered);
        if (filtered.length > 0) {
          setSelectedEmployeeId(filtered[0].id);
        }
      } catch (err) {
        logger.error('Assets', 'Failed to fetch employees for reassignment', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();

    // Initialize accessory states from asset if present
    if (asset.accessories_issued && Object.keys(asset.accessories_issued).length > 0) {
      setAccessoriesReturned({ ...asset.accessories_issued });
      setAccessoriesIssued({ ...asset.accessories_issued });
    }
    setConditionOnReturn(asset.condition || 'good');
    setConditionOnAssignment(asset.condition || 'good');
    setReason('redistribution');
    setNotes('');
    setError(null);
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const toggleReturnedAccessory = (key: string) => {
    setAccessoriesReturned(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleIssuedAccessory = (key: string) => {
    setAccessoriesIssued(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('Please select the new employee custodian.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await assetsApi.reassignAsset(asset.id, {
        new_employee_id: selectedEmployeeId,
        condition_on_return: conditionOnReturn,
        condition_on_assignment: conditionOnAssignment,
        reason,
        accessories_returned: accessoriesReturned,
        accessories_issued: accessoriesIssued,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to reassign asset', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to complete asset redistribution.');
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
          maxWidth: '620px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#175CD3',
              }}
            >
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Redistribute / Reassign Asset
              </h3>
              <span style={{ fontSize: '12px', color: '#667085' }}>
                {asset.asset_tag} — {asset.name}
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

        {/* Scrollable Form Body */}
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

          {/* Current Custodian Summary Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current Custodian
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {asset.assigned_to_name || 'Unassigned / Inventory'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {asset.assigned_to_code && `ID: ${asset.assigned_to_code} • `}
                {asset.assigned_to_department && `Dept: ${asset.assigned_to_department} • `}
                {asset.assigned_date && `Issued: ${asset.assigned_date}`}
              </div>
            </div>
            <div
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={14} />
              Custody Transfer
            </div>
          </div>

          {/* New Assignee Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              New Custodian (Active Employee) <span style={{ color: '#EF4444' }}>*</span>
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
              <option value={0}>-- Select New Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id}) — {typeof emp.department === 'object' ? emp.department.name : emp.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reassignment Reason */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Transfer Reason <span style={{ color: '#EF4444' }}>*</span>
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
                required
              >
                <option value="redistribution">Controlled Redistribution</option>
                <option value="hardware_upgrade">Hardware Upgrade / Refresh</option>
                <option value="department_transfer">Department / Role Transition</option>
                <option value="workstation_replacement">Workstation Replacement</option>
                <option value="temporary_allocation">Temporary Project Allocation</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
                Condition upon Transfer
              </label>
              <select
                value={conditionOnAssignment}
                onChange={e => {
                  setConditionOnAssignment(e.target.value as AssetCondition);
                  setConditionOnReturn(e.target.value as AssetCondition);
                }}
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
                <option value="good">Good (Fully Functional)</option>
                <option value="fair">Fair (Normal Wear)</option>
                <option value="new">New (Like New)</option>
                <option value="damaged">Damaged (Requires Maintenance)</option>
              </select>
            </div>
          </div>

          {/* Workstation Accessories Verification Checklists */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#FAFCFF',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>
              Workstation Accessories Checklist (Transferred to New Assignee)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {ACCESSORY_ITEMS.map(item => {
                const isChecked = !!accessoriesIssued[item.key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleIssuedAccessory(item.key)}
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

          {/* Transfer & Inspection Notes */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475467', display: 'block', marginBottom: '4px' }}>
              Redistribution Notes / Inspection Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Workstation reassigned per IT management allocation plan. Cleaned and formatted."
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

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<UserCheck size={16} />}>
              Confirm Reassignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
