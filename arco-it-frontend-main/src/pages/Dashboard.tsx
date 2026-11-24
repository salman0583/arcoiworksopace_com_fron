import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
  Inbox,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  X,
  Flame,
  History,
  Laptop,
  Layers,
  Building2,
  ShoppingCart,
  ClipboardList,
  Users,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { coreApi } from '../api/core';
import { assetsApi } from '../api/assets';
import { softwareApi } from '../api/software';
import { vendorsApi } from '../api/vendors';
import { procurementApi } from '../api/procurement';
import { serviceRequestsApi } from '../api/serviceRequests';
import { rewardsApi } from '../api/rewards';
import { getTechnicians, assignTicket } from '../api/tickets';
import { PriorityBadge, StatusBadge } from '../components/tickets/TicketBadges';
import { Button, LoadingSpinner, StatCard, PageHeader } from '../components/ui';
import { formatDate, formatRelativeTime } from '../utils/formatters';

import type {
  DashboardStats,
  Technician,
  RecentUnassignedTicket,
  RecentOverdueTicket,
  RecentAssignedTicket,
  RecentEmployeeTicket,
  AssetStats,
  SoftwareStats,
} from '../types';
import type { VendorStats } from '../types/vendors';
import type { ProcurementStats } from '../types/procurement';
import type { ServiceRequestStats } from '../types/serviceRequests';
import type { RewardStats } from '../types/rewards';
import { logger } from '../utils/logger';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [softwareStats, setSoftwareStats] = useState<SoftwareStats | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [procurementStats, setProcurementStats] = useState<ProcurementStats | null>(null);
  const [serviceRequestStats, setServiceRequestStats] = useState<ServiceRequestStats | null>(null);
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Assign Modal state (for IT Admin)
  const [assigningTicket, setAssigningTicket] = useState<RecentUnassignedTicket | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coreApi.getDashboardStats();
      setStats(data);
      if (user && user.role !== 'employee') {
        assetsApi.getAssetStats().then(setAssetStats).catch(() => {});
        softwareApi.getSoftwareStats().then(setSoftwareStats).catch(() => {});
        vendorsApi.getStats().then(setVendorStats).catch(() => {});
        procurementApi.getStats().then(setProcurementStats).catch(() => {});
        serviceRequestsApi.getStats().then(setServiceRequestStats).catch(() => {});
        rewardsApi.getStats().then(setRewardStats).catch(() => {});
      }
    } catch (err) {
      logger.error('Dashboard', 'Failed to fetch dashboard stats', err);
      setError('Unable to load dashboard metrics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleOpenAssign = async (t: RecentUnassignedTicket) => {
    setAssigningTicket(t);
    setSelectedTechId('');
    setAssignError(null);
    try {
      const res = await getTechnicians();
      setTechnicians(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      logger.error('Dashboard', 'Failed to load technicians', err);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assigningTicket || !selectedTechId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignTicket(assigningTicket.id, Number(selectedTechId));
      const tech = technicians.find((tc) => tc.id === Number(selectedTechId));
      setSuccessBanner(
        `Assigned ticket ${assigningTicket.ticket_number} to ${tech?.full_name || 'technician'}.`
      );
      setTimeout(() => setSuccessBanner(null), 4000);
      setAssigningTicket(null);
      fetchStats();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setAssignError(msg || 'Failed to assign ticket.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <LoadingSpinner />
        <p style={{ marginTop: '12px', color: '#667085', fontSize: '14px' }}>
          Loading workspace dashboard...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        style={{
          padding: '48px 20px',
          textAlign: 'center',
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #E5E9F0',
          maxWidth: '600px',
          margin: '40px auto',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        }}
      >
        <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', margin: '0 0 8px' }}>
          Dashboard Unavailable
        </h3>
        <p style={{ color: '#667085', fontSize: '14px', marginBottom: '16px' }}>
          {error || 'Unable to retrieve statistics.'}
        </p>
        <Button onClick={fetchStats} leftIcon={<RotateCcw size={15} />}>
          Try Again
        </Button>
      </div>
    );
  }

  const isITAdmin = ['it_admin', 'super_admin', 'hr'].includes(user.role);
  const isITSupport = user.role === 'it_support';
  const isEmployee = user.role === 'employee';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Success Notification Banner */}
      {successBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#ECFDF3',
            color: '#065F46',
            border: '1px solid #D1FADF',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Standardized Page Header */}
      <PageHeader
        title={`Welcome back, ${user.first_name}!`}
        description={
          isITAdmin
            ? "Here's the current IT operational status and technician dispatch overview."
            : isITSupport
            ? 'Here are your assigned support tickets and active work items.'
            : 'Manage your IT support requests and track resolution status.'
        }
      />

      {/* ── 1. EMPLOYEE DASHBOARD ────────────────────────────────────────── */}
      {isEmployee && (
        <>
          {/* Metric Cards Grid */}
          <div className="stat-card-grid">
            <StatCard
              label="My Open Tickets"
              value={stats.metrics.my_open_tickets ?? 0}
              icon={<Inbox size={15} />}
              variant="primary"
              onClick={() => navigate('/tickets?status=open')}
              subtext="Awaiting response"
            />
            <StatCard
              label="In Progress"
              value={stats.metrics.my_in_progress_tickets ?? 0}
              icon={<Clock size={15} />}
              variant="warning"
              onClick={() => navigate('/tickets?status=in_progress')}
              subtext="Under technician review"
            />
            <StatCard
              label="Resolved Tickets"
              value={stats.metrics.my_resolved_tickets ?? 0}
              icon={<CheckCircle2 size={15} />}
              variant="success"
              onClick={() => navigate('/tickets?status=resolved')}
              subtext="Completed requests"
            />
          </div>

          {/* Recent Tickets Table */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                My Recent Tickets
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                View All My Tickets <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </Button>
            </div>
            {!stats.recent_tickets || stats.recent_tickets.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#98A2B3' }}>
                <Ticket size={36} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  You haven't submitted any IT tickets yet.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                    <tr>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Ticket #
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Subject
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Priority
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Assigned To
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.recent_tickets.map((t: RecentEmployeeTicket) => (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        className="table-row-hover"
                        style={{ borderBottom: '1px solid #F2F4F7', cursor: 'pointer' }}
                      >
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 600,
                            color: '#2563EB',
                            fontFamily: 'monospace',
                          }}
                        >
                          {t.ticket_number}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#172033' }}>
                          {t.subject}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#667085' }}>
                          {t.category_name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <PriorityBadge priority={t.priority as any} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <StatusBadge status={t.status as any} />
                        </td>
                        <td style={{ padding: '10px 14px', color: '#667085' }}>
                          {t.assigned_to_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 2. IT SUPPORT DASHBOARD ──────────────────────────────────────── */}
      {isITSupport && (
        <>
          {/* 4 Metric Cards */}
          <div className="stat-card-grid">
            <StatCard
              label="Assigned to Me"
              value={stats.metrics.assigned_to_me ?? 0}
              icon={<UserCheck size={15} />}
              variant="primary"
              onClick={() => navigate('/tickets?tab=my_work')}
              subtext="My active queue"
            />
            <StatCard
              label="In Progress"
              value={stats.metrics.in_progress ?? 0}
              icon={<Clock size={15} />}
              variant="warning"
              onClick={() => navigate('/tickets?status=in_progress&tab=my_work')}
              subtext="Currently investigating"
            />
            <StatCard
              label="Overdue Tickets"
              value={stats.metrics.overdue ?? 0}
              icon={<AlertTriangle size={15} />}
              variant={(stats.metrics.overdue ?? 0) > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/tickets?overdue=true')}
              subtext="SLA exceeded"
            />
            <StatCard
              label="Resolved Month"
              value={stats.metrics.resolved_this_month ?? 0}
              icon={<CheckCircle2 size={15} />}
              variant="success"
              onClick={() => navigate('/tickets?status=resolved')}
              subtext="Successfully closed"
            />
          </div>

          {/* Recent Assigned Tickets */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                My Active Work
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                Open Tickets Queue <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </Button>
            </div>
            {!stats.recent_assigned_tickets || stats.recent_assigned_tickets.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#98A2B3' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  You have no open tickets currently assigned.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                    <tr>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Ticket #
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Subject
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Requester
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Priority
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        SLA Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_assigned_tickets.map((t: RecentAssignedTicket) => (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        className="table-row-hover"
                        style={{ borderBottom: '1px solid #F2F4F7', cursor: 'pointer' }}
                      >
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 600,
                            color: '#2563EB',
                            fontFamily: 'monospace',
                          }}
                        >
                          {t.ticket_number}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#172033' }}>
                          {t.subject}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475467' }}>
                          {t.requester_name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <PriorityBadge priority={t.priority as any} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <StatusBadge status={t.status as any} />
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            color: t.is_overdue ? '#DC2626' : '#667085',
                            fontWeight: t.is_overdue ? 600 : 400,
                          }}
                        >
                          {t.due_date ? formatDate(t.due_date) : '—'}
                          {t.is_overdue && ' (Overdue)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 3. IT ADMIN & SUPER ADMIN DASHBOARD ───────────────────────────── */}
      {isITAdmin && (
        <>
          {/* 5 Operational KPI Cards */}
          <div className="stat-card-grid-5">
            <StatCard
              label="Open Tickets"
              value={stats.metrics.open_tickets ?? 0}
              icon={<Inbox size={15} />}
              variant="primary"
              onClick={() => navigate('/tickets?active_only=true')}
              subtext="Total active queue"
            />
            <StatCard
              label="Unassigned"
              value={stats.metrics.unassigned_tickets ?? 0}
              icon={<UserCheck size={15} />}
              variant={(stats.metrics.unassigned_tickets ?? 0) > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/tickets?tab=unassigned')}
              subtext="Requires technician"
            />
            <StatCard
              label="Overdue"
              value={stats.metrics.overdue_tickets ?? 0}
              icon={<AlertTriangle size={15} />}
              variant={(stats.metrics.overdue_tickets ?? 0) > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/tickets?overdue=true')}
              subtext="SLA exceeded"
            />
            <StatCard
              label="Critical"
              value={stats.metrics.critical_tickets ?? 0}
              icon={<Flame size={15} />}
              variant={(stats.metrics.critical_tickets ?? 0) > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/tickets?priority=critical')}
              subtext="Urgent priority"
            />
            <StatCard
              label="Resolved Month"
              value={stats.metrics.resolved_this_month ?? 0}
              icon={<CheckCircle2 size={15} />}
              variant="success"
              onClick={() => navigate('/tickets?resolved_month=true')}
              subtext="Closed this month"
            />
          </div>

          {/* 2-Column Operational Panels: Overdue (LEFT) & Unassigned (RIGHT) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '12px',
            }}
          >
            {/* Overdue / Attention Panel (LEFT) */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E5E9F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFF5F5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={17} color="#DC2626" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Requires Attention (Overdue)
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/tickets?overdue=true')}
                >
                  View All
                </Button>
              </div>

              {!stats.overdue_tickets || stats.overdue_tickets.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    color: '#98A2B3',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={28} style={{ margin: '0 auto 6px', color: '#10B981' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    No overdue tickets. SLA targets are met.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {stats.overdue_tickets.map((t: RecentOverdueTicket) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="table-row-hover"
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #F2F4F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#2563EB',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {t.ticket_number}
                          </span>
                          <PriorityBadge priority={t.priority as any} />
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                            {t.overdue_duration}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#172033',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {t.subject}
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>
                          Tech: {t.assigned_to_name} · Requester: {t.requester_name}
                        </div>
                      </div>
                      <ArrowRight size={14} color="#98A2B3" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned Ticket Panel (RIGHT) */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E5E9F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFDF7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={17} color="#EA580C" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Unassigned Tickets
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/tickets?tab=unassigned')}
                >
                  View All Unassigned
                </Button>
              </div>

              {!stats.unassigned_tickets || stats.unassigned_tickets.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    color: '#98A2B3',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={28} style={{ margin: '0 auto 6px', color: '#10B981' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    All active tickets are assigned to technicians.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {stats.unassigned_tickets.map((t: RecentUnassignedTicket) => (
                    <div
                      key={t.id}
                      className="table-row-hover"
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #F2F4F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#2563EB',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {t.ticket_number}
                          </span>
                          <PriorityBadge priority={t.priority as any} />
                          <span style={{ fontSize: '11px', color: '#667085' }}>
                            {t.category_name}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#172033',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {t.subject}
                        </div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                          Requester: {t.requester_name}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenAssign(t)}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technician Workload Summary */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={17} color="#2563EB" />
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Technician Workload
              </h2>
            </div>
            {!stats.technician_workload || stats.technician_workload.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#98A2B3' }}>
                No active IT technicians found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                    <tr>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Technician
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Role
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          textAlign: 'center',
                        }}
                      >
                        Open
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          textAlign: 'center',
                        }}
                      >
                        In Progress
                      </th>
                      <th
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          color: '#667085',
                          fontSize: '11.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          textAlign: 'center',
                        }}
                      >
                        Overdue
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.technician_workload.map((tech) => (
                      <tr
                        key={tech.id}
                        className="table-row-hover"
                        style={{ borderBottom: '1px solid #F2F4F7' }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#172033' }}>{tech.name}</div>
                          <div style={{ fontSize: '11px', color: '#98A2B3' }}>{tech.email}</div>
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            color: '#667085',
                            textTransform: 'capitalize',
                          }}
                        >
                          {tech.role.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: tech.open_count > 0 ? '#175CD3' : '#667085',
                            }}
                          >
                            {tech.open_count}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#B54708' }}>
                            {tech.in_progress_count}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: tech.overdue_count > 0 ? '#DC2626' : '#667085',
                            }}
                          >
                            {tech.overdue_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Asset Inventory Overview */}
          {assetStats && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Laptop size={17} color="#2563EB" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Asset Inventory Overview
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                  Manage Assets <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              </div>
              <div className="summary-cards-mini-grid">
                <div
                  onClick={() => navigate('/assets')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#98A2B3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Devices
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {assetStats.total_assets}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/assets?status=assigned')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#B2CCFF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Assigned
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {assetStats.assigned}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/assets?status=available')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D1FADF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#15803D',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Available
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#15803D',
                      marginTop: '2px',
                    }}
                  >
                    {assetStats.available}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/assets?status=in_repair')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFAEB',
                    border: '1px solid #FEDF89',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B54708';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#FEDF89';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#B54708',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    In Repair
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#B54708',
                      marginTop: '2px',
                    }}
                  >
                    {assetStats.in_repair}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/assets?warranty=expiring_soon')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: assetStats.expiring_soon > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${assetStats.expiring_soon > 0 ? '#FECDCA' : '#E5E9F0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B42318';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      assetStats.expiring_soon > 0 ? '#FECDCA' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: assetStats.expiring_soon > 0 ? '#B42318' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Warranty Expiring
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: assetStats.expiring_soon > 0 ? '#B42318' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {assetStats.expiring_soon}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Software & Licenses Overview */}
          {softwareStats && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={17} color="#2563EB" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Software & Licenses Overview
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/software')}>
                  Manage Software <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              </div>
              <div className="summary-cards-mini-grid">
                <div
                  onClick={() => navigate('/software')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#98A2B3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Software Titles
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {softwareStats.total_software}
                  </div>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                  }}
                  title="License seat count across all titles (Informational)"
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Assigned Seats
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {softwareStats.used_licenses}
                  </div>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                  }}
                  title="Available seat capacity (Informational)"
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#15803D',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Available Seats
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#15803D',
                      marginTop: '2px',
                    }}
                  >
                    {softwareStats.available_licenses}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/software?expiring_soon=true')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: softwareStats.expiring_soon > 0 ? '#FFFAEB' : '#F8FAFC',
                    border: `1px solid ${
                      softwareStats.expiring_soon > 0 ? '#FEDF89' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B54708';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      softwareStats.expiring_soon > 0 ? '#FEDF89' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: softwareStats.expiring_soon > 0 ? '#B54708' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Expiring Soon
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: softwareStats.expiring_soon > 0 ? '#B54708' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {softwareStats.expiring_soon}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/software?expired=true')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: softwareStats.expired > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${softwareStats.expired > 0 ? '#FECDCA' : '#E5E9F0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B42318';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      softwareStats.expired > 0 ? '#FECDCA' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: softwareStats.expired > 0 ? '#B42318' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Expired
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: softwareStats.expired > 0 ? '#B42318' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {softwareStats.expired}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendors & Contracts Overview */}
          {vendorStats && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={17} color="#2563EB" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Vendor & Service Agreements Overview
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
                  Manage Vendors <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              </div>
              <div className="summary-cards-mini-grid">
                <div
                  onClick={() => navigate('/vendors')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#98A2B3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Vendors
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {vendorStats.total_vendors}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/vendors?status=active')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D1FADF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#15803D',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Active Partners
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#15803D',
                      marginTop: '2px',
                    }}
                  >
                    {vendorStats.active_vendors}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/vendors?tab=contracts&contract_status=active')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#B2CCFF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Active Contracts
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {vendorStats.active_contracts}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/vendors?tab=contracts&contract_status=expiring_soon')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      vendorStats.expiring_soon_contracts > 0 ? '#FFFAEB' : '#F8FAFC',
                    border: `1px solid ${
                      vendorStats.expiring_soon_contracts > 0 ? '#FEDF89' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B54708';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      vendorStats.expiring_soon_contracts > 0 ? '#FEDF89' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: vendorStats.expiring_soon_contracts > 0 ? '#B54708' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Renewals (≤30d)
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: vendorStats.expiring_soon_contracts > 0 ? '#B54708' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {vendorStats.expiring_soon_contracts}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/vendors?tab=contracts&contract_status=expired')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: vendorStats.expired_contracts > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${
                      vendorStats.expired_contracts > 0 ? '#FECDCA' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B42318';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      vendorStats.expired_contracts > 0 ? '#FECDCA' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: vendorStats.expired_contracts > 0 ? '#B42318' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Expired Contracts
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: vendorStats.expired_contracts > 0 ? '#B42318' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {vendorStats.expired_contracts}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchasing Overview */}
          {procurementStats && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={17} color="#2563EB" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Purchasing & Orders Overview
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/procurement')}>
                  Manage Purchasing <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              </div>
              <div className="summary-cards-mini-grid">
                <div
                  onClick={() => navigate('/procurement?status=submitted')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#B2CCFF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Pending Review
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {procurementStats.pending_approval}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/procurement?status=approved')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D1FADF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#15803D',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Approved
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#15803D',
                      marginTop: '2px',
                    }}
                  >
                    {procurementStats.approved}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/procurement?status=ordered')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#B2CCFF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    On Order
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {procurementStats.ordered}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/procurement?status=partially_received')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      procurementStats.partially_received > 0 ? '#FFF7ED' : '#F8FAFC',
                    border: `1px solid ${
                      procurementStats.partially_received > 0 ? '#FED7AA' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B54708';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      procurementStats.partially_received > 0 ? '#FED7AA' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color:
                        procurementStats.partially_received > 0 ? '#B54708' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Partially Received
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color:
                        procurementStats.partially_received > 0 ? '#B54708' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {procurementStats.partially_received}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/procurement?status=completed')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Completed
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {procurementStats.completed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Requests & Approvals Overview */}
          {serviceRequestStats && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #E5E9F0',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={17} color="#2563EB" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    IT Service Requests & Approvals Overview
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/service-desk')}>
                  Manage Requests <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              </div>
              <div className="summary-cards-mini-grid">
                <div
                  onClick={() => navigate('/service-desk?type=service_request')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Total Requests
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {serviceRequestStats.total}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/service-desk?type=service_request&status=pending_approval')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      serviceRequestStats.pending_approval > 0 ? '#FFFAEB' : '#F8FAFC',
                    border: `1px solid ${
                      serviceRequestStats.pending_approval > 0 ? '#FEDF89' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B54708';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      serviceRequestStats.pending_approval > 0 ? '#FEDF89' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color:
                        serviceRequestStats.pending_approval > 0 ? '#B54708' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Pending Approval
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color:
                        serviceRequestStats.pending_approval > 0 ? '#B54708' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {serviceRequestStats.pending_approval}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/service-desk?type=service_request&status=in_progress')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #B2CCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#B2CCFF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#175CD3',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    In Progress
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#175CD3',
                      marginTop: '2px',
                    }}
                  >
                    {serviceRequestStats.in_progress}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/service-desk?type=service_request&status=waiting_for_user')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      serviceRequestStats.waiting_for_user > 0 ? '#FFF1F2' : '#F8FAFC',
                    border: `1px solid ${
                      serviceRequestStats.waiting_for_user > 0 ? '#FECDD3' : '#E5E9F0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B42318';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      serviceRequestStats.waiting_for_user > 0 ? '#FECDD3' : '#E5E9F0';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color:
                        serviceRequestStats.waiting_for_user > 0 ? '#B42318' : '#667085',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Waiting for User
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color:
                        serviceRequestStats.waiting_for_user > 0 ? '#B42318' : '#172033',
                      marginTop: '2px',
                    }}
                  >
                    {serviceRequestStats.waiting_for_user}
                  </div>
                </div>
                <div
                  onClick={() => navigate('/service-desk?type=service_request&status=completed')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D1FADF';
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#15803D',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Completed
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#15803D',
                      marginTop: '2px',
                    }}
                  >
                    {serviceRequestStats.completed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity Feed */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={17} color="#667085" />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Recent System Activity
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/audit')}>
                View Full Audit Log <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </Button>
            </div>
            {!stats.recent_activity || stats.recent_activity.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#98A2B3' }}>
                No recent activity records.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {stats.recent_activity.map((act) => (
                  <div
                    key={act.id}
                    className="table-row-hover"
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid #F2F4F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{ fontWeight: 600, color: '#172033', fontSize: '13px' }}
                      >
                        {act.actor_name}
                      </span>
                      <span
                        style={{ color: '#667085', fontSize: '13px', marginLeft: '6px' }}
                      >
                        performed{' '}
                        <strong style={{ color: '#475467' }}>{act.action}</strong> on{' '}
                        {act.target_type}{' '}
                        <span
                          style={{
                            color: '#2563EB',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                          }}
                        >
                          {act.target_id}
                        </span>
                      </span>
                      {act.description && (
                        <div
                          style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}
                        >
                          {act.description}
                        </div>
                      )}
                    </div>
                    <span
                      style={{ fontSize: '11px', color: '#98A2B3', whiteSpace: 'nowrap' }}
                    >
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Quick Assign Modal (IT Admin) ─────────────────────────────────── */}
      {assigningTicket && (
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #E5E9F0',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Assign Ticket
                </h3>
                <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>
                  {assigningTicket.ticket_number}
                </span>
              </div>
              <button
                onClick={() => setAssigningTicket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667085',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {assignError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEE2E2',
                    color: '#B42318',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{assignError}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#98A2B3',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Subject
                </div>
                <div style={{ fontSize: '14px', color: '#172033', fontWeight: 500 }}>
                  {assigningTicket.subject}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#172033',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Select Technician
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) =>
                    setSelectedTechId(e.target.value ? Number(e.target.value) : '')
                  }
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    color: '#172033',
                  }}
                >
                  <option value="">-- Choose technician --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.role.replace('_', ' ').toUpperCase()}) —{' '}
                      {tech.open_tickets_count} open
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setAssigningTicket(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssign}
                  isLoading={isAssigning}
                  disabled={!selectedTechId}
                >
                  Confirm Assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
