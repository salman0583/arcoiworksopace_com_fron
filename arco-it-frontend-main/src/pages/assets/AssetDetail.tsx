import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Laptop,
  ArrowLeft,
  UserCheck,
  RotateCcw,
  Activity,
  Edit3,
  Calendar,
  DollarSign,
  Shield,
  MapPin,
  History,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  QrCode,
  Printer,
  Download,
  AlertTriangle,
  Building2,
  LifeBuoy,
  ArrowRightLeft,
  Layers,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

import { assetsApi } from '../../api/assets';
import { assetsReportsApi } from '../../api/assetsReports';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove, isITStaff } from '../../utils/auth';
import { formatDate, formatDateTime } from '../../utils/formatters';

import { Button, Card } from '../../components/ui';
import { AssetStatusBadge, AssetConditionBadge, WarrantyBadge } from '../../components/assets/AssetBadges';
import { AssetLabelModal } from '../../components/assets/AssetLabelModal';
import { ScanAssetQRModal } from '../../components/assets/ScanAssetQRModal';
import { EditAssetModal } from './EditAssetModal';
import { AssignAssetModal } from './AssignAssetModal';
import { ReturnAssetModal } from './ReturnAssetModal';
import { ReassignAssetModal } from './ReassignAssetModal';
import { ChangeAssetStatusModal } from './ChangeAssetStatusModal';
import type { Asset } from '../../types';
import { logger } from '../../utils/logger';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;
  const isStaff = user ? isITStaff(user.role) : false;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadingSlip, setDownloadingSlip] = useState<boolean>(false);
  const [downloadingLabelPdf, setDownloadingLabelPdf] = useState<boolean>(false);

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  const fetchAsset = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await assetsApi.getAsset(id);
      setAsset(data);
    } catch (err: unknown) {
      logger.error('Assets', 'Failed to load asset details', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError('You do not have permission to view this asset.');
      } else if (status === 404) {
        setError(`Asset "${id}" not found or has been removed.`);
      } else {
        setError('Failed to load asset details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  // Render barcode when asset loads
  useEffect(() => {
    if (!asset || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, asset.asset_tag, {
        format: 'CODE128',
        width: 1.2,
        height: 28,
        displayValue: true,
        fontSize: 11,
        font: 'monospace',
        margin: 0,
        background: 'transparent',
        lineColor: '#0f172a',
      });
    } catch (e) {
      console.warn('Barcode render error:', e);
    }
  }, [asset]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadHandoverSlip = async () => {
    if (!asset) return;
    setDownloadingSlip(true);
    try {
      await assetsReportsApi.downloadHandoverDoc(asset.id, asset.asset_tag);
      showToast('Handover slip (.docx) downloaded successfully!');
    } catch (err) {
      console.error('Failed downloading handover slip:', err);
      showToast('Failed downloading handover slip.');
    } finally {
      setDownloadingSlip(false);
    }
  };

  const handleDownloadLabelPdf = async () => {
    if (!asset) return;
    setDownloadingLabelPdf(true);
    try {
      const blob = await assetsApi.downloadLabelsPdf({ id: asset.id, single: true });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${asset.asset_tag}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Vector label PDF downloaded!');
    } catch (err) {
      console.error('Failed downloading label PDF:', err);
      showToast('Failed generating label PDF.');
    } finally {
      setDownloadingLabelPdf(false);
    }
  };

  const handleReportIssue = () => {
    if (!asset) return;
    const params = new URLSearchParams({
      asset_id: String(asset.id),
      asset_tag: asset.asset_tag,
      asset_name: asset.name,
      asset_type: asset.asset_type_name || '',
    });
    navigate(`/tickets/create?${params.toString()}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#667085' }}>
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Loading asset details...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={{ maxWidth: '540px', margin: '48px auto', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', padding: '36px 28px', backgroundColor: '#FEF2F2', border: '1px solid #FECDCA', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <AlertCircle size={28} color="#DC2626" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', margin: '0 0 6px 0' }}>
            Asset not found in ARCO Workplace
          </h2>
          <div style={{ margin: '10px 0 16px 0', padding: '6px 12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #FCA5A5', display: 'inline-block' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Scanned / Requested Tag: </span>
            <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: '#991B1B' }}>{id || 'Unknown'}</strong>
          </div>
          <p style={{ fontSize: '13px', color: '#7F1D1D', margin: '0 0 22px 0', lineHeight: 1.5 }}>
            The physical sticker or QR identifier does not map to an existing asset record. Please verify the asset tag or use the scanner below.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={() => setIsScanModalOpen(true)} leftIcon={<QrCode size={15} />}>
              Scan Again
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/assets')} leftIcon={<ArrowLeft size={15} />}>
              Back to Asset Directory
            </Button>
          </div>
        </div>

        {isScanModalOpen && (
          <ScanAssetQRModal
            isOpen={isScanModalOpen}
            onClose={() => setIsScanModalOpen(false)}
          />
        )}
      </div>
    );
  }

  const isRetiredOrDisposed = asset.status === 'retired' || asset.status === 'disposed';
  const qrFullUrl = `${window.location.origin}/assets/${asset.asset_tag}`;
  const isIT = asset.category === 'it' || !asset.category;

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '3px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#101828',
    lineHeight: 1.4,
    wordBreak: 'break-word',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px', maxWidth: '1140px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#065F46',
            padding: '10px 16px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Back Navigation & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate(isStaff ? '/assets' : '/my-assets')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#2563EB',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to {isStaff ? 'Asset Directory' : 'My Assets'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Prominent Report Issue Button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleReportIssue}
            leftIcon={<LifeBuoy size={15} />}
            style={{ backgroundColor: '#D97706', borderColor: '#D97706' }}
          >
            Report Issue with this Asset
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsLabelModalOpen(true)}
            leftIcon={<Printer size={15} color="#475467" />}
          >
            Print 60×25mm Sticker
          </Button>

          {isStaff && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadHandoverSlip}
              disabled={downloadingSlip}
              leftIcon={<FileText size={15} color="#2563EB" />}
            >
              {downloadingSlip ? 'Generating...' : 'Handover (.docx)'}
            </Button>
          )}

          {isITAdmin && asset.status === 'assigned' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsReassignModalOpen(true)}
              leftIcon={<ArrowRightLeft size={15} />}
              style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
            >
              Reassign / Transfer
            </Button>
          )}

          {isITAdmin && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Edit3 size={15} color="#475467" />}
            >
              Edit Asset
            </Button>
          )}
        </div>
      </div>

      {/* Retired / Disposed Warning Banner */}
      {isRetiredOrDisposed && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#92400E',
            padding: '14px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 700, display: 'block', marginBottom: '2px' }}>
              Historical Record — Asset is {asset.status.toUpperCase()}
            </span>
            <span>
              This asset has been decommissioned from active operations. QR codes and serial tag references are permanently retained for audit compliance and provenance tracking.
            </span>
          </div>
        </div>
      )}

      {/* Asset Header Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '18px 20px',
          borderRadius: '10px',
          border: '1px solid #E5E9F0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
              flexShrink: 0,
            }}
          >
            {isIT ? <Laptop size={24} /> : <Building2 size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', color: '#101828' }}>
                {asset.asset_tag}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: asset.category === 'admin_facilities' ? '#F3F4F6' : '#EFF6FF',
                  color: asset.category === 'admin_facilities' ? '#4B5563' : '#2563EB',
                  border: `1px solid ${asset.category === 'admin_facilities' ? '#E5E7EB' : '#BFDBFE'}`,
                }}
              >
                {asset.category === 'admin_facilities' ? 'Admin & Facilities' : 'IT Asset'}
              </span>
              <AssetStatusBadge status={asset.status} />
              <AssetConditionBadge condition={asset.condition} />
            </div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: '0 0 2px 0' }}>
              {asset.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              {[asset.manufacturer, asset.model].filter(Boolean).join(' · ')} {asset.location ? `· ${asset.location}` : ''}
            </p>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#F8FAFC',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #E5E9F0',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
              Warranty
            </span>
            <div style={{ marginTop: '2px' }}>
              <WarrantyBadge status={asset.warranty_status} endDate={asset.warranty_end_date} />
            </div>
          </div>
          <div style={{ width: '1px', height: '28px', backgroundColor: '#E2E8F0' }} />
          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
              Assigned To
            </span>
            <span style={{ fontWeight: 600, color: '#1E293B', display: 'block', marginTop: '2px' }}>
              {asset.assigned_to_name || 'In Storage Pool'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: 2 Columns on Large Screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Left Column: Specifications, Procurement & Custody */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Equipment Specifications */}
          <Card title="Equipment Specifications" icon={<Laptop size={16} color="#2563EB" />}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px 20px',
              }}
            >
              <div>
                <span style={labelStyle}>Device / Item Name</span>
                <span style={valueStyle}>{asset.name || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Asset Category</span>
                <span style={valueStyle}>{isIT ? 'IT Equipment' : 'Admin & Facilities'}</span>
              </div>

              <div>
                <span style={labelStyle}>Asset Type</span>
                <span style={valueStyle}>{asset.asset_type_name || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Manufacturer</span>
                <span style={valueStyle}>{asset.manufacturer || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Model</span>
                <span style={valueStyle}>{asset.model || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Serial Number</span>
                <span style={{ ...valueStyle, fontFamily: 'monospace', fontWeight: 700 }}>
                  {asset.serial_number || '—'}
                </span>
              </div>

              <div>
                <span style={labelStyle}>Physical Location</span>
                <span style={valueStyle}>{asset.location || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Current Condition</span>
                <div style={{ marginTop: '2px' }}>
                  <AssetConditionBadge condition={asset.condition} />
                </div>
              </div>
            </div>

            {asset.notes && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <span style={labelStyle}>Notes &amp; Configuration Specs</span>
                <p
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#334155',
                    border: '1px solid #E2E8F0',
                    margin: 0,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {asset.notes}
                </p>
              </div>
            )}
          </Card>

          {/* 2. Procurement & Warranty Details */}
          <Card title="Procurement & Warranty Details" icon={<Shield size={16} color="#059669" />}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px 20px',
              }}
            >
              <div>
                <span style={labelStyle}>Purchase Date</span>
                <span style={valueStyle}>{formatDate(asset.purchase_date)}</span>
              </div>

              <div>
                <span style={labelStyle}>Purchase Cost</span>
                <span style={valueStyle}>
                  {asset.purchase_price
                    ? `AED ${Number(asset.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </span>
              </div>

              <div>
                <span style={labelStyle}>Vendor / Supplier</span>
                <span style={valueStyle}>{asset.vendor_supplier_name || asset.vendor || '—'}</span>
              </div>

              <div>
                <span style={labelStyle}>Warranty Arrangement</span>
                <span style={{ ...valueStyle, color: '#1E40AF', fontWeight: 700 }}>
                  {asset.warranty_provider_type || (asset.vendor ? `Under ${asset.vendor}` : 'Standard Warranty')}
                </span>
              </div>

              <div>
                <span style={labelStyle}>Warranty Start</span>
                <span style={valueStyle}>{formatDate(asset.warranty_start_date)}</span>
              </div>

              <div>
                <span style={labelStyle}>Warranty End</span>
                <span style={valueStyle}>{formatDate(asset.warranty_end_date)}</span>
              </div>

              <div>
                <span style={labelStyle}>Warranty Status</span>
                <div style={{ marginTop: '2px' }}>
                  <WarrantyBadge status={asset.warranty_status} endDate={asset.warranty_end_date} />
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Workstation Accessories Kit Checklist */}
          {asset.accessories_issued && Object.keys(asset.accessories_issued).length > 0 && (
            <Card title="Issued Workstation Accessories Kit" icon={<Layers size={16} color="#2563EB" />}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                {[
                  { key: 'laptop', label: 'Laptop Unit' },
                  { key: 'charger', label: 'Power Adapter' },
                  { key: 'mouse', label: 'Optical Mouse' },
                  { key: 'keyboard', label: 'Keyboard' },
                  { key: 'headphone', label: 'Headset / Headphones' },
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
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: isIssued ? '#F0FDF4' : '#F8FAFC',
                        border: isIssued ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                        color: isIssued ? '#166534' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: isIssued ? 600 : 400,
                      }}
                    >
                      <CheckCircle2 size={15} color={isIssued ? '#16A34A' : '#CBD5E1'} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 4. Assignment & Custody History Timeline */}
          <Card title="Custody History & Redistribution Chain" icon={<History size={16} color="#2563EB" />}>
            {!asset.assignment_history || asset.assignment_history.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', margin: '4px 0' }}>
                No historical assignment records logged for this asset.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {asset.assignment_history.map((item, idx) => {
                  const isCurrent = !item.return_date;
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: isCurrent ? '#F0F9FF' : '#F8FAFC',
                        borderRadius: '8px',
                        border: isCurrent ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                        fontSize: '12px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: isCurrent ? '#0284C7' : item.action === 'transferred' ? '#4F46E5' : '#64748B',
                              color: '#FFFFFF',
                            }}
                          >
                            {isCurrent ? 'Current Custodian' : item.action === 'transferred' ? 'Redistributed' : 'Past Custody'}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                            {item.employee_name} ({item.employee_code})
                          </span>
                        </div>
                        <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 500 }}>
                          {formatDate(item.assigned_date)}
                          {item.return_date ? ` → ${formatDate(item.return_date)}` : ' → Present'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', color: '#475467', flexWrap: 'wrap', marginTop: '6px', fontSize: '12px' }}>
                        {item.reason && (
                          <span>Reason: <strong style={{ color: '#1E293B', textTransform: 'capitalize' }}>{item.reason.replace(/_/g, ' ')}</strong></span>
                        )}
                        {item.condition_on_assignment && (
                          <span>Issued: <strong>{item.condition_on_assignment}</strong></span>
                        )}
                        {item.condition_on_return && (
                          <span>Returned Condition: <strong>{item.condition_on_return}</strong></span>
                        )}
                        {item.performed_by_name && (
                          <span>Authorized by: <strong>{item.performed_by_name}</strong></span>
                        )}
                      </div>

                      {item.notes && (
                        <p style={{ margin: '8px 0 0 0', color: '#64748B', fontStyle: 'italic', fontSize: '12px', backgroundColor: isCurrent ? '#FFFFFF' : '#F1F5F9', padding: '6px 10px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 4. Linked Support Tickets */}
          <Card title="Linked Support Tickets" icon={<Ticket size={16} color="#D97706" />}>
            {!asset.linked_tickets || asset.linked_tickets.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                  No tickets currently linked to this asset.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReportIssue}
                  leftIcon={<LifeBuoy size={14} color="#D97706" />}
                >
                  Create Ticket
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {asset.linked_tickets.map((tk) => (
                  <div
                    key={tk.id}
                    onClick={() => navigate(`/tickets/${tk.id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#2563EB', marginRight: '8px' }}>
                        {tk.ticket_number}
                      </span>
                      <span style={{ fontWeight: 500, color: '#101828' }}>{tk.subject}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E2E8F0', color: '#334155' }}>
                        {tk.status}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {formatDate(tk.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Physical QR & Custody Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Physical QR & Barcode Card */}
          <Card title="Physical Identification" icon={<QrCode size={16} color="#2563EB" />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
              {/* Mini Label Preview (60x25mm Sticker Preview) */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: '4px',
                    marginBottom: '8px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  <span>ARCOFINTECH</span>
                  <span style={{ color: '#64748B' }}>PROPERTY OF ARCOFINTECH</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>
                      {asset.asset_tag}
                    </span>
                    <svg ref={barcodeRef} style={{ maxHeight: '26px', maxWidth: '115px' }} />
                  </div>
                  <div style={{ padding: '4px', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                    <QRCodeSVG value={qrFullUrl} size={50} level="M" />
                  </div>
                </div>

                <div
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: '4px',
                    marginTop: '8px',
                  }}
                >
                  SCAN FOR ASSET DETAILS
                </div>
              </div>

              {/* QR Metadata */}
              <div
                style={{
                  textAlign: 'left',
                  fontSize: '12px',
                  backgroundColor: '#EFF6FF',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#60A5FA' }}>QR Target URL:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1D4ED8' }}>
                    {asset.qr_code_url}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#60A5FA' }}>Barcode Format:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>Code128</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsLabelModalOpen(true)}
                  leftIcon={<Printer size={15} />}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Print 60×25mm Sticker
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadLabelPdf}
                  disabled={downloadingLabelPdf}
                  leftIcon={<Download size={14} />}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {downloadingLabelPdf ? 'Generating...' : 'Download Vector PDF'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Current Custody Card */}
          <Card title="Current Assignee" icon={<UserCheck size={16} color="#2563EB" />}>
            {asset.assigned_to ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    {asset.assigned_to_name?.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, color: '#101828', fontSize: '14px', margin: 0 }}>
                      {asset.assigned_to_name}
                    </h4>
                    <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0' }}>
                      {asset.assigned_to_code} · {asset.assigned_to_department}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#475467' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8' }}>Email:</span>
                    <span style={{ fontWeight: 500, color: '#1E293B' }}>{asset.assigned_to_email || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8' }}>Assigned On:</span>
                    <span style={{ fontWeight: 500, color: '#1E293B' }}>{formatDate(asset.assigned_date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94A3B8' }}>Acknowledgement:</span>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: asset.is_acknowledged ? '#059669' : '#D97706' }}>
                      {asset.is_acknowledged ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      {asset.is_acknowledged ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8' }}>
                <Laptop size={32} color="#CBD5E1" style={{ margin: '0 auto 6px auto' }} />
                <p style={{ fontWeight: 600, color: '#334155', fontSize: '13px', margin: '0 0 2px 0' }}>
                  In Storage Pool
                </p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  This asset is available for assignment.
                </p>
              </div>
            )}
          </Card>

          {/* Operational Actions (IT Staff Only) */}
          {isITAdmin && !isRetiredOrDisposed && (
            <Card title="Asset Operations" icon={<Activity size={16} color="#475467" />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {asset.status === 'available' && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsAssignModalOpen(true)}
                    leftIcon={<UserCheck size={14} />}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Assign to Employee
                  </Button>
                )}

                {asset.status === 'assigned' && (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setIsReassignModalOpen(true)}
                      leftIcon={<ArrowRightLeft size={14} />}
                      style={{ width: '100%', justifyContent: 'center', backgroundColor: '#2563EB' }}
                    >
                      Reassign / Transfer Asset
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsReturnModalOpen(true)}
                      leftIcon={<RotateCcw size={14} color="#2563EB" />}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Return Asset to Pool
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsStatusModalOpen(true)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Change Lifecycle Status / Retire
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Label Modal */}
      {isLabelModalOpen && (
        <AssetLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          assets={[asset]}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditAssetModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          asset={asset}
          onSuccess={() => {
            fetchAsset();
            showToast('Asset updated successfully!');
          }}
        />
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <AssignAssetModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          asset={asset}
          onSuccess={() => {
            fetchAsset();
            showToast(`Asset ${asset.asset_tag} assigned!`);
          }}
        />
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <ReturnAssetModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          asset={asset}
          onSuccess={() => {
            fetchAsset();
            showToast(`Asset ${asset.asset_tag} returned to inventory!`);
          }}
        />
      )}

      {/* Reassign Modal */}
      {isReassignModalOpen && (
        <ReassignAssetModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          asset={asset}
          onSuccess={() => {
            fetchAsset();
            showToast(`Asset ${asset.asset_tag} successfully reassigned!`);
          }}
        />
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && (
        <ChangeAssetStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          asset={asset}
          onSuccess={() => {
            fetchAsset();
            showToast(`Status updated for ${asset.asset_tag}`);
          }}
        />
      )}

      {/* QR Scanner Modal */}
      {isScanModalOpen && (
        <ScanAssetQRModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
        />
      )}
    </div>
  );
};
