import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Mail,
  MapPin,
  Calendar,
  Laptop,
  Layers,
  FileText,
  ShoppingCart,
  Activity as ActivityIcon,
  Shield,
  Building2,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  AssetStatusBadge,
  AssetConditionBadge,
  AssetAcknowledgementBadge,
} from '../assets/AssetBadges';
import { AssetAcknowledgementModal } from '../assets/AssetAcknowledgementModal';
import { employeesApi } from '../../api/employees';
import type {
  Employee,
  Employee360Data,
  Employee360Asset,
  Employee360Software,
  Employee360ServiceRequest,
  Employee360Ticket,
  Employee360Procurement,
  Employee360Activity,
} from '../../types';
import type { ServiceDeskItem } from '../../types/serviceDesk';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export interface Employee360DrawerProps {
  employeeId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAsset?: (assetId: number) => void;
  onOpenServiceDesk?: (item: ServiceDeskItem) => void;
  onOpenProcurement?: (prId: number) => void;
  onUpdated?: () => void;
}

type TabKey = 'overview' | 'assets' | 'software' | 'service_requests' | 'purchasing' | 'activity';

export const Employee360Drawer: React.FC<Employee360DrawerProps> = ({
  employeeId,
  isOpen,
  onClose,
  onOpenAsset,
  onOpenServiceDesk,
  onOpenProcurement,
  onUpdated,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<Employee360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Acknowledging modal state
  const [selectedAckAsset, setSelectedAckAsset] = useState<Employee360Asset | null>(null);

  const fetch360 = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await employeesApi.getOverview360(employeeId);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load employee 360 overview.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen && employeeId) {
      setActiveTab('overview');
      fetch360();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, employeeId, fetch360]);

  if (!isOpen) return null;

  const emp = data?.employee;
  const isSelf = user?.email === emp?.email;

  const totalRequestsCount = (data?.tickets?.length || 0) + (data?.service_requests?.length || 0);

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
          {/* Drawer Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              {emp && <Avatar name={emp.full_name} size="md" />}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#172033',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {emp?.full_name || 'Employee 360'}
                  </h2>
                  {emp && (
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#172033',
                        backgroundColor: '#E5E9F0',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {emp.employee_id}
                    </span>
                  )}
                  {emp && (
                    <Badge variant={emp.status} size="sm">
                      {emp.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#667085',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {emp?.job_title} •{' '}
                  <span style={{ fontWeight: 600, color: '#475467' }}>
                    {typeof emp?.department === 'object' ? emp?.department?.name : emp?.department_name}
                  </span>
                </div>
              </div>
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
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#FFFFFF',
              overflowX: 'auto',
              padding: '0 12px',
            }}
          >
            {[
              { key: 'overview', label: 'Overview', icon: <User size={13} />, count: null },
              {
                key: 'assets',
                label: 'Assets',
                icon: <Laptop size={13} />,
                count: data?.assets?.length || 0,
              },
              {
                key: 'software',
                label: 'Software',
                icon: <Layers size={13} />,
                count: data?.software?.length || 0,
              },
              {
                key: 'service_requests',
                label: 'Requests',
                icon: <FileText size={13} />,
                count: totalRequestsCount,
              },
              {
                key: 'purchasing',
                label: 'Purchasing',
                icon: <ShoppingCart size={13} />,
                count: data?.procurement_requests?.length || 0,
              },
              {
                key: 'activity',
                label: 'Activity',
                icon: <ActivityIcon size={13} />,
                count: data?.activity?.length || 0,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px 12px',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: isActive ? '#175CD3' : '#667085',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? '#DBEAFE' : '#F5F7FA',
                        color: isActive ? '#175CD3' : '#667085',
                        fontWeight: 700,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Drawer Body Area */}
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
                <Button size="sm" variant="secondary" onClick={fetch360} style={{ marginTop: '12px' }}>
                  Retry
                </Button>
              </div>
            ) : data && emp ? (
              <>
                {/* ─────────────────────────────────────────────────────────────
                    TAB 1: OVERVIEW
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Employee Profile Grid */}
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E5E9F0',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                          Email Address
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px', wordBreak: 'break-all' }}>
                          {emp.email}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                          Location
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                          {emp.location || 'Hyderabad, Telangana, India'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                          Joining Date
                        </span>
                        <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                          {emp.joining_date ? formatDate(emp.joining_date) : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                          Reports To
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                          {emp.manager_name || 'None (Direct Report / Executive)'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'Assigned Assets', val: data.assets.length, color: '#175CD3', bg: '#EFF6FF' },
                        { label: 'Software Licenses', val: data.software.length, color: '#059669', bg: '#ECFDF3' },
                        { label: 'Total Tickets', val: totalRequestsCount, color: '#D97706', bg: '#FFFAEB' },
                        { label: 'Procurements', val: data.procurement_requests.length, color: '#7C3AED', bg: '#F5F3FF' },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 8px',
                            backgroundColor: s.bg,
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: '1px solid #E5E9F0',
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: '10px', color: '#667085', fontWeight: 600, marginTop: '2px' }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pending Handover Alert if any */}
                    {data.assets.some((a) => a.acknowledgement_status === 'pending') && (
                      <div
                        style={{
                          padding: '12px 14px',
                          backgroundColor: '#FFFAEB',
                          border: '1px solid #FEDF89',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={16} color="#B54708" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400E' }}>
                            Pending asset receipt acknowledgement
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setActiveTab('assets')}
                        >
                          Review Assets
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 2: HARDWARE ASSETS
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'assets' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.assets.length === 0 ? (
                      <div
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #E5E9F0',
                          color: '#667085',
                          fontSize: '13px',
                        }}
                      >
                        <Laptop size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                        <div>No hardware assets currently assigned to this employee.</div>
                      </div>
                    ) : (
                      data.assets.map((ast) => (
                        <div
                          key={ast.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E9F0',
                            borderRadius: '8px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#172033',
                                    backgroundColor: '#E5E9F0',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {ast.asset_tag}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                  {ast.name}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                                {[ast.manufacturer, ast.model].filter(Boolean).join(' • ')}
                                {ast.serial_number ? ` (S/N: ${ast.serial_number})` : ''}
                              </div>
                            </div>
                            <AssetStatusBadge status={ast.status as any} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F5F7FA', paddingTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AssetAcknowledgementBadge
                                status={ast.acknowledgement_status as any}
                                isAcknowledged={ast.is_acknowledged}
                              />
                              <AssetConditionBadge condition={ast.condition as any} />
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              {ast.acknowledgement_status === 'pending' && (isSelf || user?.role !== 'employee') && (
                                <Button
                                  size="sm"
                                  style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#fff' }}
                                  onClick={() => setSelectedAckAsset(ast)}
                                  leftIcon={<CheckCircle2 size={13} />}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              {onOpenAsset && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => onOpenAsset(ast.id)}
                                  leftIcon={<ExternalLink size={13} />}
                                >
                                  View Asset
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 3: SOFTWARE & LICENSES
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'software' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.software.length === 0 ? (
                      <div
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #E5E9F0',
                          color: '#667085',
                          fontSize: '13px',
                        }}
                      >
                        <Layers size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                        <div>No software licenses assigned to this employee.</div>
                      </div>
                    ) : (
                      data.software.map((sw) => (
                        <div
                          key={sw.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E9F0',
                            borderRadius: '8px',
                            padding: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                              {sw.name} <span style={{ fontSize: '12px', color: '#667085' }}>v{sw.version}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                              {sw.publisher} • {sw.category} • License: {sw.license_type}
                            </div>
                            {sw.device_tag && (
                              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '3px' }}>
                                Installed on: {sw.device_tag}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: sw.status === 'active' ? '#ECFDF3' : '#F5F7FA',
                              color: sw.status === 'active' ? '#065F46' : '#667085',
                              border: sw.status === 'active' ? '1px solid #D1FADF' : '1px solid #E5E9F0',
                            }}
                          >
                            {sw.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 4: SERVICE REQUESTS & TICKETS
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'service_requests' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {totalRequestsCount === 0 ? (
                      <div
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #E5E9F0',
                          color: '#667085',
                          fontSize: '13px',
                        }}
                      >
                        <FileText size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                        <div>No service desk requests or tickets logged for this employee.</div>
                      </div>
                    ) : (
                      <>
                        {/* Incidents / Tickets */}
                        {data.tickets.map((t) => (
                          <div
                            key={`ticket-${t.id}`}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5E9F0',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
                                  {t.request_id}
                                </span>
                                <span style={{ fontSize: '11px', backgroundColor: '#FEF2F2', color: '#B42318', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  Incident
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                  {t.subject}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#667085', marginTop: '3px' }}>
                                Created {formatDate(t.created_at)} • Priority: {t.priority}
                              </div>
                            </div>

                            {onOpenServiceDesk && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  onOpenServiceDesk({
                                    id: t.request_id,
                                    rawId: t.rawId || t.id,
                                    type: 'incident',
                                    request_id: t.request_id,
                                    subject: t.subject,
                                    category_name: t.category_name,
                                    priority: t.priority as any,
                                    status: t.status as any,
                                    created_at: t.created_at,
                                  } as unknown as ServiceDeskItem)
                                }
                                leftIcon={<ExternalLink size={12} />}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        ))}

                        {/* Service Requests */}
                        {data.service_requests.map((sr) => (
                          <div
                            key={`sr-${sr.id}`}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5E9F0',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                                  {sr.request_id}
                                </span>
                                <span style={{ fontSize: '11px', backgroundColor: '#ECFDF3', color: '#065F46', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  Request
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                  {sr.subject}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#667085', marginTop: '3px' }}>
                                Created {formatDate(sr.created_at)} • Status: {sr.status}
                              </div>
                            </div>

                            {onOpenServiceDesk && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  onOpenServiceDesk({
                                    id: sr.request_id,
                                    rawId: sr.rawId || sr.id,
                                    type: 'service_request',
                                    request_id: sr.request_id,
                                    subject: sr.subject,
                                    category_name: sr.request_type,
                                    priority: sr.priority as any,
                                    status: sr.status as any,
                                    created_at: sr.created_at,
                                  } as unknown as ServiceDeskItem)
                                }
                                leftIcon={<ExternalLink size={12} />}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 5: PURCHASING (PROCUREMENT)
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'purchasing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.procurement_requests.length === 0 ? (
                      <div
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #E5E9F0',
                          color: '#667085',
                          fontSize: '13px',
                        }}
                      >
                        <ShoppingCart size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                        <div>No purchase requests linked to this employee.</div>
                      </div>
                    ) : (
                      data.procurement_requests.map((pr) => (
                        <div
                          key={pr.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E9F0',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#7C3AED' }}>
                                {pr.request_id}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                {pr.item_name} (Qty: {pr.quantity})
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#667085', marginTop: '3px' }}>
                              Estimated: {formatCurrency(pr.estimated_total_cost)} • {formatDate(pr.created_at)}
                            </div>
                          </div>

                          {onOpenProcurement && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onOpenProcurement(pr.id)}
                              leftIcon={<ExternalLink size={12} />}
                            >
                              View PR
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 6: ACTIVITY TIMELINE
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'activity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.activity.length === 0 ? (
                      <div
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #E5E9F0',
                          color: '#667085',
                          fontSize: '13px',
                        }}
                      >
                        <ActivityIcon size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                        <div>No recent activity recorded for this employee.</div>
                      </div>
                    ) : (
                      data.activity.map((act) => (
                        <div
                          key={act.id}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '6px',
                            border: '1px solid #E5E9F0',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#172033' }}>{act.action}</span>
                            <span style={{ color: '#98A2B3', fontSize: '11px' }}>
                              {formatDateTime(act.timestamp)}
                            </span>
                          </div>
                          <div style={{ color: '#475467', marginTop: '2px' }}>{act.details}</div>
                          {act.actor_name && (
                            <div style={{ color: '#667085', fontSize: '11px', marginTop: '2px' }}>
                              By: {act.actor_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal for Acknowledging from 360 */}
      {selectedAckAsset && (
        <AssetAcknowledgementModal
          asset={selectedAckAsset}
          isOpen={!!selectedAckAsset}
          onClose={() => setSelectedAckAsset(null)}
          onSuccess={() => {
            fetch360();
            onUpdated?.();
          }}
        />
      )}
    </>
  );
};
