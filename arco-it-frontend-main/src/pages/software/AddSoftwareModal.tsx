import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { softwareApi } from '../../api/software';
import type { Software, SoftwareCategory, LicenseType, AllocationScope } from '../../types';
import { Button } from '../../components/ui/Button';

interface AddSoftwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSoftware: Software) => void;
}

export const AddSoftwareModal: React.FC<AddSoftwareModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState<SoftwareCategory>('productivity');
  const [allocationScope, setAllocationScope] = useState<AllocationScope>('user_specific');
  const [licenseType, setLicenseType] = useState<LicenseType>('subscription');
  const [licenseKey, setLicenseKey] = useState('');
  const [totalLicenses, setTotalLicenses] = useState<number>(5);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Software name is required.');
      return;
    }
    if (!publisher.trim()) {
      setError('Publisher / Vendor is required.');
      return;
    }
    if (totalLicenses < 1) {
      setError('Total licenses must be at least 1.');
      return;
    }
    if (startDate && expiryDate && expiryDate < startDate) {
      setError('Expiry date cannot be earlier than start date.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Partial<Software> = {
        name: name.trim(),
        publisher: publisher.trim(),
        version: version.trim(),
        category,
        allocation_scope: allocationScope,
        license_type: licenseType,
        license_key: licenseKey.trim(),
        total_licenses: totalLicenses,
        purchase_date: purchaseDate || null,
        license_start_date: startDate || null,
        license_expiry_date: expiryDate || null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes.trim(),
      };

      const created = await softwareApi.createSoftware(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData && typeof respData === 'object') {
        const firstKey = Object.keys(respData)[0];
        const val = respData[firstKey];
        setError(Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val));
      } else {
        setError('Failed to create software record. Please try again.');
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
          maxWidth: '620px',
          maxHeight: '90vh',
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
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', margin: 0 }}>Add Software & License</h2>
            <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>Register a company software asset or license seat</p>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Software Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microsoft 365 Business"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Publisher / Vendor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microsoft Corporation"
                  value={publisher}
                  onChange={e => setPublisher(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Version
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024 / v4.2"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Allocation Scope
                </label>
                <select
                  value={allocationScope}
                  onChange={e => setAllocationScope(e.target.value as AllocationScope)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="user_specific">User-Specific (Per Employee Seat)</option>
                  <option value="company_wide">Company-Wide (Common Access)</option>
                  <option value="infrastructure">Infrastructure (Hosting / Cloud / Web)</option>
                  <option value="device_specific">Device-Specific (Per Workstation)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as SoftwareCategory)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="productivity">Productivity</option>
                  <option value="communication">Communication</option>
                  <option value="security">Security</option>
                  <option value="development">Development</option>
                  <option value="design">Design</option>
                  <option value="operating_system">Operating System</option>
                  <option value="database">Database</option>
                  <option value="vpn_remote">VPN / Remote Access</option>
                  <option value="hosting_infrastructure">Hosting / Infrastructure</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  License Type
                </label>
                <select
                  value={licenseType}
                  onChange={e => setLicenseType(e.target.value as LicenseType)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="subscription">Subscription</option>
                  <option value="per_user">Per User</option>
                  <option value="per_device">Per Device</option>
                  <option value="perpetual">Perpetual</option>
                  <option value="trial">Trial</option>
                  <option value="open_source">Free / Open Source</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Total License Seats *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={totalLicenses}
                  onChange={e => setTotalLicenses(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Cost (AED / USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1500.00"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                License Key / Activation Code
              </label>
              <textarea
                rows={2}
                placeholder="Product key, volume license code, or portal invitation link"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                Securely stored and only visible to IT Admin and Super Admin.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  License Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  License Expiry
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Notes / Procurement Details
              </label>
              <textarea
                rows={2}
                placeholder="Vendor contact, account manager, contract number..."
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
              Save Software
            </Button>

          </div>
        </form>
      </div>
    </div>
  );
};
