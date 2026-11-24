import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { softwareApi } from '../../api/software';
import { employeesApi } from '../../api/employees';
import type { Software, SoftwareAssignment, Employee } from '../../types';
import { Button } from '../../components/ui/Button';

interface ReassignSoftwareModalProps {
  software: Software | null;
  currentAssignment: SoftwareAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSoftware: Software) => void;
}

export const ReassignSoftwareModal: React.FC<ReassignSoftwareModalProps> = ({
  software,
  currentAssignment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toEmployeeId, setToEmployeeId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentAssignment) {
      setToEmployeeId('');
      setNotes('');
      setError(null);
      loadEmployees();
    }
  }, [isOpen, currentAssignment]);

  const loadEmployees = async () => {
    setFetchingEmployees(true);
    try {
      const resp = await employeesApi.list({ page: 1, status: 'active' });
      setEmployees(resp?.results || []);
    } catch {
      setError('Failed to load active employee list.');
    } finally {
      setFetchingEmployees(false);
    }
  };

  if (!isOpen || !software || !currentAssignment || !currentAssignment.employee_id) return null;

  const eligibleEmployees = employees.filter(e => e.id !== currentAssignment.employee_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmployeeId) {
      setError('Please select the employee to receive this license.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await softwareApi.reassignSoftware(software.id, {
        from_employee_id: currentAssignment.employee_id!,
        to_employee_id: parseInt(toEmployeeId),
        notes: notes.trim(),
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.detail) {
        setError(respData.detail);
      } else {
        setError('Failed to reassign license. Please try again.');
      }
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
        backgroundColor: 'rgba(11, 23, 57, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Reassign Software License
            </h2>
            <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
              Transfer {software.name} from {currentAssignment.employee_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#667085',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECDCA',
                  borderRadius: '6px',
                  color: '#DC2626',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Current Holder
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F5F7FA',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#172033',
                  fontWeight: 500,
                }}
              >
                {currentAssignment.employee_code} — {currentAssignment.employee_name} ({currentAssignment.employee_department})
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Transfer To Employee *
              </label>
              <select
                required
                value={toEmployeeId}
                onChange={e => setToEmployeeId(e.target.value)}
                disabled={fetchingEmployees}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">-- Select New Recipient --</option>
                {eligibleEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_id} — {emp.full_name} ({emp.job_title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Reassignment Reason / Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Employee transition, replacement license, role change..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '16px 24px',
              borderTop: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
            }}
          >
            <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Transfer License
            </Button>

          </div>
        </form>
      </div>
    </div>
  );
};
