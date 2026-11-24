import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  UserPlus,
  Key,
  Calendar,
  DollarSign,
  Building,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Copy,
  Check,
  UserCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Globe,
} from 'lucide-react';
import { softwareApi } from '../../api/software';
import type { Software, SoftwareAssignment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  SoftwareStatusBadge,
  SoftwareCategoryBadge,
  LicenseTypeBadge,
  LicenseUtilizationBar,
  AllocationScopeBadge,
} from '../../components/software/SoftwareBadges';
import { EditSoftwareModal } from './EditSoftwareModal';
import { AssignSoftwareModal } from './AssignSoftwareModal';
import { ReassignSoftwareModal } from './ReassignSoftwareModal';
import { logger } from '../../utils/logger';

export const SoftwareDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === 'it_admin' || user?.role === 'super_admin';

  const [software, setSoftware] = useState<Software | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SoftwareAssignment | null>(null);

  // Sensitive fields toggles
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Action states
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const fetchSoftware = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await softwareApi.getSoftware(parseInt(id));
      setSoftware(data);
    } catch (err: any) {
      logger.error('SoftwareDetail', `Failed to fetch software ${id}`, err);
      if (err?.response?.status === 403) {
        setError('You do not have permission to view this software record.');
      } else {
        setError('Software record not found.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftware();
  }, [id]);

  const handleCopyKey = () => {
    if (software?.license_key) {
      navigator.clipboard.writeText(software.license_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevoke = async (assignment: SoftwareAssignment) => {
    if (!software) return;
    const target = assignment.employee_name || assignment.asset_tag || 'user';
    if (!window.confirm(`Are you sure you want to revoke this license from ${target}?`)) {
      return;
    }

    setRevokingId(assignment.id);
    try {
      const updated = await softwareApi.revokeSoftware(software.id, {
        assignment_id: assignment.id,
        notes: 'Revoked via software detail dashboard',
      });
      setSoftware(updated);
    } catch (err) {
      logger.error('SoftwareDetail', 'Failed to revoke license', err);
      alert('Failed to revoke license. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async () => {
    if (!software) return;
    const confirmText = software.used_licenses > 0
      ? `This software currently has ${software.used_licenses} active assignments. Deleting will retire it and preserve audit history. Continue?`
      : `Are you sure you want to permanently delete ${software.name}?`;

    if (!window.confirm(confirmText)) return;

    try {
      await softwareApi.deleteSoftware(software.id);
      navigate('/software');
    } catch (err) {
      logger.error('SoftwareDetail', 'Failed to delete software', err);
      alert('Failed to delete/retire software.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#98A2B3' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Loading software information...</p>
      </div>
    );
  }

  if (error || !software) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <AlertTriangle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
              {error || 'Software Not Found'}
            </h2>
            <p style={{ color: '#667085', fontSize: '14px', marginBottom: '20px' }}>
              The software you are looking for might have been retired or you do not have permission.
            </p>
            <Button variant="primary" onClick={() => navigate('/software')}>
              <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Software & Licenses
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCompanyWideOrInfra = software.allocation_scope === 'company_wide' || software.allocation_scope === 'infrastructure';
  const activeAssignments = (software.assignments || []).filter(a => a.is_active);
  const revokedAssignments = (software.assignments || []).filter(a => !a.is_active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Back Button & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/software')}
          className="detail-back-button"
          style={{ marginBottom: 0 }}
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Software & Licenses</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAdminOrSuper && (
            <>
              {!isCompanyWideOrInfra && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAssignOpen(true)}
                  disabled={software.available_licenses <= 0}
                >
                  <UserPlus size={14} style={{ marginRight: '4px' }} /> Assign License
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
                <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} title="Retire/Delete Software">
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', margin: 0, lineHeight: 1.2 }}>
                {software.name}
              </h1>
              {software.version && (
                <span
                  style={{
                    backgroundColor: '#F5F7FA',
                    color: '#475467',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {software.version}
                </span>
              )}
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#175CD3',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                {software.software_id}
              </span>
              <AllocationScopeBadge scope={software.allocation_scope} />
              <SoftwareStatusBadge status={software.computed_status || software.status} />
            </div>

            <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0' }}>
              Published by <strong>{software.publisher}</strong> &bull; Category:{' '}
              <span style={{ color: '#475467', fontWeight: 500 }}>{software.category}</span> &bull; Type:{' '}
              <span style={{ color: '#475467', fontWeight: 500 }}>{software.license_type}</span>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#667085' }}>
              {isCompanyWideOrInfra ? 'Allocation Scope' : 'Seat Availability'}
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: isCompanyWideOrInfra ? '#4F46E5' : (software.available_licenses > 0 ? '#10B981' : '#EF4444'),
              }}
            >
              {software.allocation_scope === 'company_wide'
                ? 'Company-Wide'
                : software.allocation_scope === 'infrastructure'
                ? 'Infrastructure Service'
                : `${software.available_licenses} Available`}
            </div>
          </div>
        </div>

        {/* Informational Callout for Company-Wide and Infrastructure */}
        {isCompanyWideOrInfra && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: software.allocation_scope === 'infrastructure' ? '#ECFDF5' : '#EEF2FF',
              border: `1px solid ${software.allocation_scope === 'infrastructure' ? '#A7F3D0' : '#C7D2FE'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {software.allocation_scope === 'infrastructure' ? (
              <Globe size={18} style={{ color: '#047857', marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <Shield size={18} style={{ color: '#4338CA', marginTop: '2px', flexShrink: 0 }} />
            )}
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: software.allocation_scope === 'infrastructure' ? '#065F46' : '#312E81',
                }}
              >
                {software.allocation_scope === 'infrastructure'
                  ? 'Infrastructure & Cloud Web Hosting'
                  : 'Company-Wide Common Access Service'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: software.allocation_scope === 'infrastructure' ? '#047857' : '#4338CA',
                  marginTop: '2px',
                  lineHeight: 1.4,
                }}
              >
                {software.allocation_scope === 'infrastructure'
                  ? 'This record represents corporate web hosting, DNS, and server infrastructure for ARCO Workplace. It is provisioned at the organizational infrastructure level.'
                  : 'This application is provisioned as a standard corporate tool for all employees across ARCO Workplace. Individual seat assignments are not required.'}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Main 2-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '12px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Utilization & Assignments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* License Utilization Card */}
          <Card>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '16px' }}>
              License Utilization
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <LicenseUtilizationBar
                used={software.used_licenses}
                total={software.total_licenses}
                showNumbers={true}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>TOTAL PURCHASED</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#172033' }}>{software.total_licenses}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>CURRENTLY ASSIGNED</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB' }}>{software.used_licenses}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>AVAILABLE SEATS</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: software.available_licenses > 0 ? '#10B981' : '#EF4444',
                  }}
                >
                  {software.available_licenses}
                </div>
              </div>
            </div>
          </Card>

          {/* Active Assignments Table Card */}
          <Card noPadding>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Active Users & Devices ({activeAssignments.length})
                </h2>
                <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                  Employees and hardware assets holding an active license
                </p>
              </div>

              {isAdminOrSuper && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAssignOpen(true)}
                  disabled={software.available_licenses <= 0}
                >

                  <UserPlus size={14} style={{ marginRight: '4px' }} /> Assign
                </Button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: '#475569' }}>Assigned Employee</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: '#475569' }}>Linked Device</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: '#475569' }}>Assigned Date</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px 20px', textAlign: 'center', color: '#98A2B3' }}>
                        No active assignments for this software yet.
                      </td>
                    </tr>
                  ) : (
                    activeAssignments.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '12px 20px' }}>
                          {a.employee_name ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#172033' }}>{a.employee_name}</div>
                              <div style={{ fontSize: '11px', color: '#667085' }}>
                                {a.employee_code} &bull; {a.employee_department || 'General'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#98A2B3' }}>Unassigned to Person</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          {a.asset_tag ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Laptop size={14} style={{ color: '#2563EB' }} />
                              <div>
                                <span style={{ fontWeight: 500, color: '#475467' }}>{a.asset_name}</span>
                                <div style={{ fontSize: '11px', color: '#98A2B3', fontFamily: 'monospace' }}>
                                  {a.asset_tag}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#98A2B3' }}>Cloud / SaaS Seat</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px', color: '#667085' }}>{a.assigned_date}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                          {isAdminOrSuper && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {a.employee_id && (
                                <button
                                  onClick={() => {
                                    setSelectedAssignment(a);
                                    setIsReassignOpen(true);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2563EB',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                  }}
                                >
                                  Reassign
                                </button>
                              )}
                              <button
                                onClick={() => handleRevoke(a)}
                                disabled={revokingId === a.id}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#EF4444',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  padding: '2px 6px',
                                }}
                              >
                                {revokingId === a.id ? 'Revoking...' : 'Revoke'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Historical / Revoked Assignments Table Card */}
          {revokedAssignments.length > 0 && (
            <Card noPadding>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E9F0', backgroundColor: '#F8FAFC' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: 0 }}>
                  License Custody History ({revokedAssignments.length} revoked / transitioned)
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E9F0' }}>
                      <th style={{ padding: '10px 20px', fontWeight: 600, color: '#667085' }}>Former Assignee</th>
                      <th style={{ padding: '10px 20px', fontWeight: 600, color: '#667085' }}>Device</th>
                      <th style={{ padding: '10px 20px', fontWeight: 600, color: '#667085' }}>Period</th>
                      <th style={{ padding: '10px 20px', fontWeight: 600, color: '#667085' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revokedAssignments.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F5F7FA', color: '#667085' }}>
                        <td style={{ padding: '10px 20px' }}>{a.employee_name || a.employee_code || '—'}</td>
                        <td style={{ padding: '10px 20px' }}>{a.asset_tag || 'Cloud Seat'}</td>
                        <td style={{ padding: '10px 20px' }}>
                          {a.assigned_date} &rarr; {a.revoked_date || 'Revoked'}
                        </td>
                        <td style={{ padding: '10px 20px', maxWidth: '200px' }}>{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Audit History Card */}
          <Card>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '16px' }}>
              Change History & Activity Log
            </h2>
            {software.history && software.history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {software.history.map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <div
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#E5E9F0',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11px',
                        color: '#475467',
                      }}
                    >
                      {h.action}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: '#172033' }}>{h.details}</p>
                      <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                        By {h.actor_name || 'System'} &bull; {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#98A2B3', fontSize: '13px', margin: 0 }}>No history logs recorded yet.</p>
            )}
          </Card>
        </div>

        {/* Right Column: License Specs, Key, Procurement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* License Key & Security Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Key size={18} style={{ color: '#2563EB' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                License Information
              </h3>
            </div>

            {isAdminOrSuper ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#667085', marginBottom: '6px', fontWeight: 500 }}>
                  LICENSE KEY / ACTIVATION
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#172033',
                      wordBreak: 'break-all',
                    }}
                  >
                    {software.license_key
                      ? showKey
                        ? software.license_key
                        : '••••••••••••••••••••••••••••'
                      : 'No key entered'}
                  </span>

                  {software.license_key && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#667085',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedKey ? '#10B981' : '#667085',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Copy key"
                      >
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#667085',
                  marginBottom: '16px',
                }}
              >
                License keys and contract pricing are restricted to IT Administrators.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#667085' }}>License Start:</span>
                <strong style={{ marginLeft: '8px', color: '#172033' }}>
                  {software.license_start_date || 'Not specified'}
                </strong>
              </div>

              <div>
                <span style={{ color: '#667085' }}>License Expiry:</span>
                <strong style={{ marginLeft: '8px', color: '#172033' }}>
                  {software.license_expiry_date || 'Perpetual / Ongoing'}
                </strong>
              </div>

              {isAdminOrSuper && software.cost && (
                <div>
                  <span style={{ color: '#667085' }}>License Cost:</span>
                  <strong style={{ marginLeft: '8px', color: '#172033' }}>
                    {typeof software.cost === 'number' ? `AED ${software.cost.toFixed(2)}` : software.cost}
                  </strong>
                </div>
              )}

              <div>
                <span style={{ color: '#667085' }}>Purchase Date:</span>
                <strong style={{ marginLeft: '8px', color: '#172033' }}>
                  {software.purchase_date || 'Not recorded'}
                </strong>
              </div>
            </div>
          </Card>

          {/* Software Specs Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Building size={18} style={{ color: '#2563EB' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Specifications
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#667085', fontSize: '11px', fontWeight: 600 }}>PUBLISHER / VENDOR</div>
                <div style={{ fontWeight: 600, color: '#172033', marginTop: '2px' }}>{software.publisher}</div>
              </div>

              <div>
                <div style={{ color: '#667085', fontSize: '11px', fontWeight: 600 }}>CATEGORY</div>
                <div style={{ marginTop: '4px' }}>
                  <SoftwareCategoryBadge category={software.category} />
                </div>
              </div>

              <div>
                <div style={{ color: '#667085', fontSize: '11px', fontWeight: 600 }}>LICENSE TYPE</div>
                <div style={{ marginTop: '4px' }}>
                  <LicenseTypeBadge type={software.license_type} />
                </div>
              </div>

              <div>
                <div style={{ color: '#667085', fontSize: '11px', fontWeight: 600 }}>CREATED BY</div>
                <div style={{ color: '#475467', marginTop: '2px' }}>
                  {software.created_by_name || 'System Admin'} &bull; {new Date(software.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Card>

          {/* Notes Card */}
          {software.notes && (
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginBottom: '10px' }}>
                Procurement & Admin Notes
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {software.notes}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditSoftwareModal
          software={software}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={updated => setSoftware(updated)}
        />
      )}

      {/* Assign Modal */}
      {isAssignOpen && (
        <AssignSoftwareModal
          software={software}
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          onSuccess={updated => setSoftware(updated)}
        />
      )}

      {/* Reassign Modal */}
      {isReassignOpen && (
        <ReassignSoftwareModal
          software={software}
          currentAssignment={selectedAssignment}
          isOpen={isReassignOpen}
          onClose={() => setIsReassignOpen(false)}
          onSuccess={updated => setSoftware(updated)}
        />
      )}
    </div>
  );
};
