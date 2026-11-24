import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Laptop,
  Calendar,
  User,
  Tag,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Download,
  Edit,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Building2,
  ExternalLink,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  AssetStatusBadge,
  AssetConditionBadge,
  WarrantyBadge,
  AssetAcknowledgementBadge,
} from './AssetBadges';
import { AssetAcknowledgementModal } from './AssetAcknowledgementModal';
import { ReassignAssetModal } from '../../pages/assets/ReassignAssetModal';
import { assetsApi } from '../../api/assets';
import { employeesApi } from '../../api/employees';
import type { Asset, AssetStatus, AssetCondition, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export interface AssetDetailDrawerProps {
  assetId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onOpenEmployee360?: (employeeId: number) => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  assetId,
  isOpen,
  onClose,
  onUpdated,
  onOpenEmployee360,
}) => {
  const { user } = useAuth();
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;
  const isITStaff = user ? user.role !== 'employee' : false;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals inside drawer
  const [showAckModal, setShowAckModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Assign modal state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [assignCondition, setAssignCondition] = useState<AssetCondition>('good');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Return modal state
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('good');
  const [returnDestStatus, setReturnDestStatus] = useState<'available' | 'in_repair' | 'damaged' | 'retired'>('available');
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);

  // Status modal state
  const [newStatus, setNewStatus] = useState<AssetStatus>('available');
  const [statusCondition, setStatusCondition] = useState<AssetCondition>('good');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchAsset = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await assetsApi.getAsset(assetId);
      setAsset(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load asset details.');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (isOpen && assetId) {
      fetchAsset();
    } else {
      setAsset(null);
      setError(null);
      setActionMessage(null);
    }
  }, [isOpen, assetId, fetchAsset]);

  // Load employees for assignment modal
  const loadEmployees = async () => {
    try {
      const res = await employeesApi.list({ page_size: 200, status: 'active' });
      setEmployees(res.results || []);
    } catch (e) {
      console.error('Failed to load employees for assignment', e);
    }
  };

  const handleCopySerial = () => {
    if (asset?.serial_number) {
      navigator.clipboard.writeText(asset.serial_number);
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2000);
    }
  };

  // Handle Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !selectedEmpId) return;
    setAssigning(true);
    try {
      await assetsApi.assignAsset(asset.id, {
        employee_id: Number(selectedEmpId),
        condition: assignCondition,
        notes: assignNotes.trim(),
      });
      setShowAssignModal(false);
      setActionMessage('Asset assigned successfully.');
      fetchAsset();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to assign asset.');
    } finally {
      setAssigning(false);
    }
  };

  // Handle Return
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    setReturning(true);
    try {
      await assetsApi.returnAsset(asset.id, {
        condition: returnCondition,
        destination_status: returnDestStatus,
        notes: returnNotes.trim(),
      });
      setShowReturnModal(false);
      setActionMessage('Asset returned to inventory successfully.');
      fetchAsset();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to return asset.');
    } finally {
      setReturning(false);
    }
  };

  // Handle Status Change
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    setUpdatingStatus(true);
    try {
      await assetsApi.changeAssetStatus(asset.id, {
        status: newStatus,
        condition: statusCondition,
        notes: statusNotes.trim(),
      });
      setShowStatusModal(false);
      setActionMessage('Asset status updated successfully.');
      fetchAsset();
      onUpdated?.();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to update asset status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isAssignedToCurrentUser =
    user && asset && asset.assigned_to && user.email === asset.assigned_to_email;

  const canAcknowledge =
    asset &&
    (isAssignedToCurrentUser || isITAdmin) &&
    asset.status === 'assigned' &&
    asset.acknowledgement_status === 'pending';

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 26, 59, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 990,
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
            zIndex: 1000,
            animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Drawer Top Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#172033',
                  letterSpacing: '0.3px',
                }}
              >
                {asset?.asset_tag || 'Asset Details'}
              </span>
              {asset && (
                <>
                  <AssetStatusBadge status={asset.status} />
                  <AssetConditionBadge condition={asset.condition} />
                </>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#667085',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Toast Message */}
          {actionMessage && (
            <div
              style={{
                padding: '10px 18px',
                backgroundColor: '#EFF6FF',
                borderBottom: '1px solid #B2CCFF',
                color: '#175CD3',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{actionMessage}</span>
              <button
                onClick={() => setActionMessage(null)}
                style={{ background: 'none', border: 'none', color: '#175CD3', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Drawer Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {loading ? (
              <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
                <AlertTriangle size={32} style={{ marginBottom: '8px' }} />
                <p>{error}</p>
                <Button size="sm" variant="secondary" onClick={fetchAsset} style={{ marginTop: '12px' }}>
                  Retry
                </Button>
              </div>
            ) : asset ? (
              <>
                {/* 1. Primary Title & Specs Card */}
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#172033',
                      lineHeight: 1.3,
                      marginBottom: '4px',
                    }}
                  >
                    {asset.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#667085' }}>
                    {[asset.manufacturer, asset.model].filter(Boolean).join(' • ')} •{' '}
                    <span style={{ fontWeight: 600, color: '#475467' }}>{asset.asset_type_name}</span>
                  </div>
                </div>

                {/* 2. Specifications Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    borderRadius: '8px',
                    padding: '14px 16px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Serial Number
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                        {asset.serial_number || '—'}
                      </span>
                      {asset.serial_number && (
                        <button
                          onClick={handleCopySerial}
                          title="Copy Serial Number"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedSerial ? '#10B981' : '#98A2B3',
                            padding: '2px',
                          }}
                        >
                          {copiedSerial ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Location
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                      {asset.location || 'HQ Office'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Warranty Status
                    </span>
                    <div style={{ marginTop: '2px' }}>
                      <WarrantyBadge status={asset.warranty_status} endDate={asset.warranty_end_date} />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Purchase Price
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                      {asset.purchase_price ? formatCurrency(Number(asset.purchase_price)) : '—'}
                    </div>
                  </div>

                  {asset.purchase_date && (
                    <div>
                      <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                        Purchase Date
                      </span>
                      <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                        {formatDate(asset.purchase_date)}
                      </div>
                    </div>
                  )}

                  {asset.vendor && (
                    <div>
                      <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                        Vendor / Supplier
                      </span>
                      <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                        {asset.vendor_supplier_name || asset.vendor}
                      </div>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Warranty Arrangement
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', marginTop: '2px' }}>
                      {asset.warranty_provider_type || (asset.vendor ? `Under ${asset.vendor}` : 'Standard Warranty')}
                    </div>
                  </div>
                </div>

                {/* 3. Workstation Accessories Kit Checklist */}
                {asset.accessories_issued && Object.keys(asset.accessories_issued).length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E9F0',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Layers size={15} color="#2563EB" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase' }}>
                        Issued Workstation Accessories Kit
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { key: 'laptop', label: 'Laptop Unit' },
                        { key: 'charger', label: 'Power Adapter' },
                        { key: 'mouse', label: 'Optical Mouse' },
                        { key: 'keyboard', label: 'Keyboard' },
                        { key: 'headphone', label: 'Headphones' },
                        { key: 'hdmi', label: 'HDMI Cable' },
                        { key: 'monitor', label: 'External Monitor' },
                      ].map(item => {
                        const isIssued = !!asset.accessories_issued?.[item.key];
                        return (
                          <div
                            key={item.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              backgroundColor: isIssued ? '#F0FDF4' : '#F8FAFC',
                              border: isIssued ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                              color: isIssued ? '#166534' : '#94A3B8',
                              fontSize: '11px',
                              fontWeight: isIssued ? 600 : 400,
                            }}
                          >
                            <CheckCircle2 size={13} color={isIssued ? '#16A34A' : '#CBD5E1'} />
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Custody & Acknowledgement Status Section */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E9F0',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase' }}>
                      Current Custody & Handover
                    </span>
                    <AssetAcknowledgementBadge
                      status={asset.acknowledgement_status}
                      isAcknowledged={asset.is_acknowledged}
                    />
                  </div>

                  {asset.assigned_to ? (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #E5E9F0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={asset.assigned_to_name || 'User'} size="md" />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#172033' }}>
                              {asset.assigned_to_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085' }}>
                              {asset.assigned_to_code ? `${asset.assigned_to_code} • ` : ''}
                              {asset.assigned_to_department || asset.assigned_to_email || 'Employee'}
                            </div>
                          </div>
                        </div>

                        {onOpenEmployee360 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenEmployee360(asset.assigned_to!)}
                            leftIcon={<ExternalLink size={13} />}
                          >
                            Employee 360
                          </Button>
                        )}
                      </div>

                      {/* Handover Timeline / Details */}
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#667085', lineHeight: 1.6 }}>
                        <div>
                          <strong>Assigned Date:</strong>{' '}
                          {asset.assigned_date ? formatDate(asset.assigned_date) : 'N/A'}
                        </div>
                        {asset.acknowledged_at && (
                          <div>
                            <strong>Acknowledged:</strong> {formatDateTime(asset.acknowledged_at)}
                            {asset.acknowledgement_condition && ` (Condition: ${asset.acknowledgement_condition})`}
                          </div>
                        )}
                        {asset.acknowledgement_notes && (
                          <div
                            style={{
                              marginTop: '6px',
                              padding: '8px 10px',
                              backgroundColor: asset.acknowledgement_status === 'issue_reported' ? '#FEF2F2' : '#F5F7FA',
                              border: asset.acknowledgement_status === 'issue_reported' ? '1px solid #FECDCA' : '1px solid #E5E9F0',
                              borderRadius: '6px',
                              color: asset.acknowledgement_status === 'issue_reported' ? '#B42318' : '#475467',
                            }}
                          >
                            <strong>Feedback:</strong> {asset.acknowledgement_notes}
                          </div>
                        )}
                      </div>

                      {/* Prominent Action Button for Pending Handover */}
                      {canAcknowledge && (
                        <div style={{ marginTop: '14px' }}>
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: '#10B981',
                              borderColor: '#10B981',
                              color: '#FFFFFF',
                              width: '100%',
                            }}
                            onClick={() => setShowAckModal(true)}
                            leftIcon={<CheckCircle2 size={15} />}
                          >
                            Acknowledge Receipt of Equipment
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px dashed #E5E9F0',
                        color: '#667085',
                        fontSize: '13px',
                      }}
                    >
                      <User size={24} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
                      <div>Asset is currently in inventory and available for deployment.</div>
                      {isITStaff && (
                        <Button
                          size="sm"
                          variant="primary"
                          style={{ marginTop: '10px' }}
                          onClick={() => {
                            loadEmployees();
                            setShowAssignModal(true);
                          }}
                          leftIcon={<UserCheck size={14} />}
                        >
                          Assign to Employee
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Notes Section if present */}
                {asset.notes && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E9F0',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Admin Remarks
                    </span>
                    <div style={{ fontSize: '13px', color: '#475467', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                      {asset.notes}
                    </div>
                  </div>
                )}

                {/* 6. Assignment & Custody History Timeline */}
                {asset.assignment_history && asset.assignment_history.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E9F0',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <History size={15} color="#667085" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475467', textTransform: 'uppercase' }}>
                        Custody History &amp; Redistribution Chain ({asset.assignment_history.length})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {asset.assignment_history.map((h, idx) => {
                        const isCurrent = !h.return_date;
                        return (
                          <div
                            key={h.id || idx}
                            style={{
                              padding: '12px 14px',
                              backgroundColor: isCurrent ? '#F0F9FF' : '#F8FAFC',
                              borderRadius: '6px',
                              border: isCurrent ? '1px solid #BAE6FD' : '1px solid #E5E9F0',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    backgroundColor: isCurrent ? '#0284C7' : h.action === 'transferred' ? '#4F46E5' : '#64748B',
                                    color: '#FFFFFF',
                                  }}
                                >
                                  {isCurrent ? 'Current' : h.action === 'transferred' ? 'Redistributed' : 'Past'}
                                </span>
                                <span style={{ fontWeight: 700, color: '#172033' }}>
                                  {h.employee_name} ({h.employee_code})
                                </span>
                              </div>
                              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 500 }}>
                                {formatDate(h.assigned_date || h.created_at)}
                                {h.return_date ? ` → ${formatDate(h.return_date)}` : ' → Present'}
                              </span>
                            </div>

                            {h.reason && (
                              <div style={{ marginTop: '4px', color: '#475467', fontSize: '11px' }}>
                                Transfer Reason: <strong style={{ textTransform: 'capitalize' }}>{h.reason.replace(/_/g, ' ')}</strong>
                              </div>
                            )}

                            {h.notes && (
                              <div style={{ color: '#667085', marginTop: '4px', fontStyle: 'italic', fontSize: '11px', backgroundColor: isCurrent ? '#FFFFFF' : '#F1F5F9', padding: '4px 8px', borderRadius: '4px' }}>
                                &ldquo;{h.notes}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Drawer Footer Actions (IT Staff Controls) */}
          {asset && isITStaff && (
            <div
              style={{
                padding: '14px 18px',
                borderTop: '1px solid #E5E9F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {asset.status === 'assigned' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowReassignModal(true)}
                      leftIcon={<ArrowRightLeft size={14} />}
                    >
                      Reassign
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowReturnModal(true)}
                      leftIcon={<RotateCcw size={14} />}
                    >
                      Return
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      loadEmployees();
                      setShowAssignModal(true);
                    }}
                    leftIcon={<UserCheck size={14} />}
                  >
                    Assign
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewStatus(asset.status);
                    setStatusCondition(asset.condition);
                    setShowStatusModal(true);
                  }}
                >
                  Status
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {asset.status === 'assigned' && !asset.is_acknowledged && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAckModal(true)}
                    leftIcon={<CheckCircle2 size={14} />}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acknowledgement Modal */}
      {asset && (
        <AssetAcknowledgementModal
          asset={asset}
          isOpen={showAckModal}
          onClose={() => setShowAckModal(false)}
          onSuccess={() => {
            setActionMessage('Asset acknowledgement submitted.');
            fetchAsset();
            onUpdated?.();
          }}
        />
      )}

      {/* Reassign Modal */}
      {asset && showReassignModal && (
        <ReassignAssetModal
          asset={asset}
          isOpen={showReassignModal}
          onClose={() => setShowReassignModal(false)}
          onSuccess={() => {
            setActionMessage('Asset successfully reassigned.');
            fetchAsset();
            onUpdated?.();
          }}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#172033' }}>
                Assign Asset to Employee
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Select Employee *
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id}) - {typeof emp.department === 'object' ? emp.department?.name : emp.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Condition on Handover
                </label>
                <select
                  value={assignCondition}
                  onChange={(e) => setAssignCondition(e.target.value as AssetCondition)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="new">New / Mint</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Assignment Remarks
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Handed over with charger, laptop bag and mouse"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={assigning}>
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#172033' }}>
                Return Asset to Inventory
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Returned Condition *
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Destination Status
                </label>
                <select
                  value={returnDestStatus}
                  onChange={(e) => setReturnDestStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="available">Available (In Stock)</option>
                  <option value="in_repair">In Repair</option>
                  <option value="damaged">Damaged</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Return Notes
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Reason for return, check-in inspection notes..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={returning}>
                  Confirm Return
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#172033' }}>
                Change Asset Status
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AssetStatus)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="available">Available</option>
                  <option value="in_repair">In Repair</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                  <option value="retired">Retired</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Condition
                </label>
                <select
                  value={statusCondition}
                  onChange={(e) => setStatusCondition(e.target.value as AssetCondition)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                  }}
                >
                  <option value="new">New / Mint</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                  Status Remarks
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Reason for status change..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={updatingStatus}>
                  Update Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
