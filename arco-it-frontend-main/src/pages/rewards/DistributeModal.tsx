import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle2, AlertTriangle, Users, Package, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { rewardsApi } from '../../api/rewards';
import { employeesApi } from '../../api/employees';
import type { RewardItem } from '../../types/rewards';
import type { Employee } from '../../types';

interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programId: number;
  programName: string;
  items: RewardItem[];
  preselectedItemId?: number | null;
}

export const DistributeModal: React.FC<DistributeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  programId,
  programName,
  items,
  preselectedItemId,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<number>>(new Set());
  const [quantityPerEmp, setQuantityPerEmp] = useState<number>(1);
  const [distributionDate, setDistributionDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [empSearch, setEmpSearch] = useState<string>('');

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected item
  useEffect(() => {
    if (preselectedItemId && items.some((it) => it.id === preselectedItemId)) {
      setSelectedItemId(preselectedItemId);
    } else if (items.length > 0) {
      setSelectedItemId(items[0].id);
    }
  }, [preselectedItemId, items, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmpIds(new Set());
      setQuantityPerEmp(1);
      setDistributionDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setEmpSearch('');
      setError(null);
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Fetch active employees
      const res = await employeesApi.list({ status: 'active', page_size: 100 });
      setEmployees(res.results || []);
    } catch {
      setError('Unable to load employee directory.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const currentItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || items[0];
  }, [items, selectedItemId]);

  const availableStock = currentItem ? currentItem.remaining_quantity : 0;

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const term = empSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(term) ||
        e.employee_id.toLowerCase().includes(term) ||
        (e.department_name && e.department_name.toLowerCase().includes(term)) ||
        e.email.toLowerCase().includes(term)
    );
  }, [employees, empSearch]);

  const toggleEmployee = (id: number) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      filteredEmployees.forEach((e) => next.add(e.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedEmpIds(new Set());
  };

  // Calculations
  const selectedCount = selectedEmpIds.size;
  const totalDistributionUnits = selectedCount * quantityPerEmp;
  const remainingAfter = availableStock - totalDistributionUnits;
  const isOverQuantity = totalDistributionUnits > availableStock;

  const handleSubmit = async () => {
    if (!currentItem) {
      setError('Please select an item to distribute.');
      return;
    }
    if (selectedCount === 0) {
      setError('Please select at least one employee recipient.');
      return;
    }
    if (quantityPerEmp < 1) {
      setError('Quantity per employee must be at least 1.');
      return;
    }
    if (isOverQuantity) {
      setError(
        `Cannot distribute ${totalDistributionUnits} units. Only ${availableStock} unit(s) remaining in stock.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const empIdList = Array.from(selectedEmpIds);

      if (empIdList.length === 1) {
        // Single distribution
        await rewardsApi.createDistribution({
          item_id: currentItem.id,
          employee_id: empIdList[0],
          quantity: quantityPerEmp,
          distribution_date: distributionDate || undefined,
          notes: notes.trim(),
          override_duplicate: true,
        });
      } else {
        // Atomic bulk distribution
        await rewardsApi.bulkDistribute({
          item_id: currentItem.id,
          employee_ids: empIdList,
          quantity_per_employee: quantityPerEmp,
          distribution_date: distributionDate || undefined,
          notes: notes.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.quantity?.[0] ||
        'Distribution failed. Please check the quantities and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Distribute Rewards"
      subtitle={`Program: ${programName}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={selectedCount === 0 || isOverQuantity || submitting}
            leftIcon={<Package size={16} />}
          >
            Confirm Distribution ({totalDistributionUnits} units)
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              color: '#B42318',
              borderRadius: '8px',
              border: '1px solid #FECDCA',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Item Selection & Stock */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Select Reward Item <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(Number(e.target.value))}
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
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.reward_name} ({it.remaining_quantity} available / {it.quantity_received} received)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>
                Available Stock
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: availableStock > 0 ? '#10B981' : '#EF4444' }}>
                {availableStock} <span style={{ fontSize: '12px', fontWeight: 500 }}>units</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>
                Quantity / Employee
              </div>
              <Input
                type="number"
                min="1"
                max={availableStock || 1}
                value={quantityPerEmp}
                onChange={(e) => setQuantityPerEmp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: '100px', height: '34px', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>
                Distribution Date
              </div>
              <Input
                type="date"
                value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
                style={{ height: '34px', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* 2. Employee Recipient Selection */}
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#2563EB" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>
                Select Employee Recipients
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: selectedCount > 0 ? '#EFF6FF' : '#F5F7FA',
                  color: selectedCount > 0 ? '#175CD3' : '#667085',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                {selectedCount} Selected
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={selectAllFiltered}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Select All Filtered ({filteredEmployees.length})
              </button>
              <span style={{ color: '#E5E9F0' }}>|</span>
              <button
                type="button"
                onClick={clearSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667085',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '10px', position: 'relative' }}>
            <Input
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Search employees by name, ID, or department..."
              leftIcon={<Search size={16} color="#98A2B3" />}
            />
          </div>

          {/* Employee Directory List Box */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid #E5E9F0',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {loadingEmployees ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <LoadingSpinner />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                No employees matching search.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmpIds.has(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #F5F7FA',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#F0F7FF' : 'transparent',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmployee(emp.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                          {emp.full_name}{' '}
                          <span style={{ fontSize: '11px', color: '#667085', fontWeight: 400 }}>
                            ({emp.employee_id})
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>
                          {emp.job_title} • {emp.department_name || 'General'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Distribution Confirmation Summary Card */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: isOverQuantity ? '#FEF2F2' : '#F8FAFC',
            borderRadius: '10px',
            border: isOverQuantity ? '1px solid #FCA5A5' : '1px solid #E5E9F0',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.3px' }}>
            Distribution Summary
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#667085' }}>Selected Recipients</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#172033' }}>
                {selectedCount} <span style={{ fontSize: '11px', fontWeight: 500 }}>people</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#667085' }}>Total Units to Disburse</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563EB' }}>
                {totalDistributionUnits} <span style={{ fontSize: '11px', fontWeight: 500 }}>units</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#667085' }}>Current Stock</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#172033' }}>
                {availableStock} <span style={{ fontSize: '11px', fontWeight: 500 }}>units</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#667085' }}>Remaining After</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: remainingAfter >= 0 ? '#10B981' : '#EF4444',
                }}
              >
                {remainingAfter} <span style={{ fontSize: '11px', fontWeight: 500 }}>units</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Handover / Distribution Notes
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Distributed during Townhall meeting / Left at employee workstation"
          />
        </div>
      </div>
    </Modal>
  );
};
