import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { softwareApi } from '../../api/software';
import { employeesApi } from '../../api/employees';
import { assetsApi } from '../../api/assets';
import type { Software, Employee, Asset } from '../../types';
import { Button } from '../../components/ui/Button';

interface AssignSoftwareModalProps {
  software: Software | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSoftware: Software) => void;
}

export const AssignSoftwareModal: React.FC<AssignSoftwareModalProps> = ({
  software,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && software) {
      setSelectedEmployeeId('');
      setSelectedAssetId('');
      setNotes('');
      setError(null);
      loadDependencies();
    }
  }, [isOpen, software]);

  const loadDependencies = async () => {
    setFetchingData(true);
    try {
      const [empResp, assetResp] = await Promise.all([
        employeesApi.list({ page: 1, status: 'active' }),
        assetsApi.listAssets({ page_size: 100 }),
      ]);
      setEmployees(empResp?.results || []);
      setAssets(assetResp?.results || []);
    } catch {
      setError('Failed to load employee and device list.');
    } finally {
      setFetchingData(false);
    }
  };

  if (!isOpen || !software) return null;

  // Filter assets when an employee is selected to make device selection effortless
  const relevantAssets = selectedEmployeeId
    ? assets.filter(a => a.assigned_to === parseInt(selectedEmployeeId) || !a.assigned_to)
    : assets;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId && !selectedAssetId) {
      setError('Please select at least an employee or a device.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await softwareApi.assignSoftware(software.id, {
        employee_id: selectedEmployeeId ? parseInt(selectedEmployeeId) : null,
        asset_id: selectedAssetId ? parseInt(selectedAssetId) : null,
        notes: notes.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.detail) {
        setError(respData.detail);
      } else if (respData && typeof respData === 'object') {
        const firstKey = Object.keys(respData)[0];
        const val = respData[firstKey];
        setError(Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val));
      } else {
        setError('Failed to assign software license. Please try again.');
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
          maxWidth: '520px',
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
              Assign License
            </h2>
            <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
              {software.name} ({software.software_id}) — {software.available_licenses} of {software.total_licenses} available
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
                Assign to Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                disabled={fetchingData}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_id} — {emp.full_name} ({emp.job_title})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Link to Hardware Asset / Device (Optional)
              </label>
              <select
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
                disabled={fetchingData}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">-- None / Cloud SaaS License --</option>
                {relevantAssets.map(ast => (
                  <option key={ast.id} value={ast.id}>
                    {ast.asset_tag} — {ast.name} ({ast.asset_type_name || 'Hardware'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Assignment Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Project onboarding, approval ticket reference..."
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
            <Button variant="primary" type="submit" isLoading={loading} disabled={software.available_licenses <= 0}>
              Confirm Assignment
            </Button>

          </div>
        </form>
      </div>
    </div>
  );
};
