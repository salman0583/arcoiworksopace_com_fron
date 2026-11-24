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
  Receipt,
  Wallet,
  PlusCircle,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { coreApi } from '../api/core';
import { assetsApi } from '../api/assets';
import { softwareApi } from '../api/software';
import { vendorsApi } from '../api/vendors';
import { procurementApi } from '../api/procurement';
import { serviceRequestsApi } from '../api/serviceRequests';
import { rewardsApi } from '../api/rewards';
import { expensesApi } from '../api/expenses';
import { getTechnicians, assignTicket } from '../api/tickets';
import { PriorityBadge, StatusBadge } from '../components/tickets/TicketBadges';
import { Button, LoadingSpinner, StatCard, PageHeader } from '../components/ui';
import { formatDate, formatRelativeTime, formatINR } from '../utils/formatters';
import { canAccessOfficeExpenses } from '../utils/auth';
import { LAYOUT_CLASSES } from '../utils/responsive';

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
import type { ExpenseSummaryStats } from '../types/expenses';
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
  const [expenseStats, setExpenseStats] = useState<ExpenseSummaryStats | null>(null);
  const [pendingReimbursementsCount, setPendingReimbursementsCount] = useState<number | null>(null);
  const [approvedReimbursementsCount, setApprovedReimbursementsCount] = useState<number | null>(null);

  // Employee workspace counts
  const [myAssetsCount, setMyAssetsCount] = useState<number | null>(null);
  const [mySoftwareCount, setMySoftwareCount] = useState<number | null>(null);
  const [myReimbursementsCount, setMyReimbursementsCount] = useState<number | null>(null);

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
      if (user) {
        if (user.role !== 'employee') {
          assetsApi.getAssetStats().then(setAssetStats).catch(() => {});
          softwareApi.getSoftwareStats().then(setSoftwareStats).catch(() => {});
          vendorsApi.getStats().then(setVendorStats).catch(() => {});
          procurementApi.getStats().then(setProcurementStats).catch(() => {});
          serviceRequestsApi.getStats().then(setServiceRequestStats).catch(() => {});
          rewardsApi.getStats().then(setRewardStats).catch(() => {});

          if (canAccessOfficeExpenses(user.role)) {
            expensesApi.summary().then(setExpenseStats).catch(() => {});
            expensesApi.listReimbursements({ status: 'submitted' }).then((res) => setPendingReimbursementsCount(res.count)).catch(() => {});
            expensesApi.listReimbursements({ status: 'approved' }).then((res) => setApprovedReimbursementsCount(res.count)).catch(() => {});
          } else if (user.role === 'it_support') {
            expensesApi.listReimbursements({ status: 'submitted' }).then((res) => setPendingReimbursementsCount(res.count)).catch(() => {});
          }
        } else {
          // Employee personal workspace stats
          assetsApi.getMyAssets().then((res) => setMyAssetsCount(Array.isArray(res) ? res.length : 0)).catch(() => {});
          softwareApi.getMySoftware().then((res) => setMySoftwareCount(Array.isArray(res) ? res.length : 0)).catch(() => {});
          expensesApi.listReimbursements({ my_only: true }).then((res) => setMyReimbursementsCount(res.count ?? (Array.isArray(res.results) ? res.results.length : 0))).catch(() => {});
        }
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

  // Calculate total actionable cross-module pending approvals
  const totalPendingApprovals =
    (procurementStats?.pending_approval || 0) +
    (serviceRequestStats?.pending_approval || 0) +
    (pendingReimbursementsCount || 0);

  return (
    <div className={LAYOUT_CLASSES.pageContainer}>
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

      {/* ── SECTION A & B: COMPACT WELCOME HEADER + INTEGRATED QUICK ACTIONS ── */}
      <PageHeader
        title={`Welcome back, ${user.first_name || 'Admin'}`}
        description="Here's what's happening at your workplace today."
        actions={
          isITAdmin ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/tickets/create')}
                leftIcon={<PlusCircle size={14} />}
              >
                Log Ticket
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/reimbursements')}
                leftIcon={<Receipt size={14} />}
              >
                Reimbursements{' '}
                {pendingReimbursementsCount && pendingReimbursementsCount > 0
                  ? `(${pendingReimbursementsCount})`
                  : ''}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/procurement')}
                leftIcon={<ShoppingCart size={14} />}
              >
                Purchasing
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/expenses')}
                leftIcon={<Wallet size={14} />}
              >
                Office Cash
              </Button>
            </div>
          ) : isITSupport ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/service-desk')}
                leftIcon={<Inbox size={14} />}
              >
                Open Service Desk
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/assets')}
                leftIcon={<Laptop size={14} />}
              >
                Asset Catalog
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/tickets/create')}
                leftIcon={<PlusCircle size={14} />}
              >
                New Ticket
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/reimbursements')}
                leftIcon={<Receipt size={14} />}
              >
                Claim Expense
              </Button>
            </div>
          )
        }
      />

      {/* ── 1. EMPLOYEE DASHBOARD ────────────────────────────────────────── */}
      {isEmployee && (
        <>
          {/* Personal Ticket Status Grid */}
          <div className={LAYOUT_CLASSES.statGrid3}>
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

          {/* My Workplace Equipment & Services Overview */}
          <div className={LAYOUT_CLASSES.dashboardCard}>
            <div className={LAYOUT_CLASSES.dashboardCardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Laptop size={16} color="#2563EB" />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  My Assigned Equipment &amp; Services
                </h2>
              </div>
            </div>

            <div className={LAYOUT_CLASSES.dashboardCardBody}>
              <div className={LAYOUT_CLASSES.statGrid3}>
                <div
                  onClick={() => navigate('/my-assets')}
                  className={LAYOUT_CLASSES.dashboardPillMetric}
                  style={{ padding: '12px 14px' }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Devices
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#172033', marginTop: '2px' }}>
                    {myAssetsCount !== null ? myAssetsCount : 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                    Hardware in your custody
                  </div>
                </div>

                <div
                  onClick={() => navigate('/my-software')}
                  className={LAYOUT_CLASSES.dashboardPillMetric}
                  style={{ padding: '12px 14px' }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Software &amp; Licenses
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#172033', marginTop: '2px' }}>
                    {mySoftwareCount !== null ? mySoftwareCount : 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                    Active tools &amp; seats
                  </div>
                </div>

                <div
                  onClick={() => navigate('/reimbursements')}
                  className={LAYOUT_CLASSES.dashboardPillMetric}
                  style={{ padding: '12px 14px' }}
                >
                  <div style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Reimbursements
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#172033', marginTop: '2px' }}>
                    {myReimbursementsCount !== null ? myReimbursementsCount : 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                    My submitted claims
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tickets Table */}
          <div className={LAYOUT_CLASSES.dashboardCard}>
            <div className={LAYOUT_CLASSES.dashboardCardHeader}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                My Recent Tickets
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                View All My Tickets <ArrowRight size={13} style={{ marginLeft: '4px' }} />
              </Button>
            </div>
            {!stats.recent_tickets || stats.recent_tickets.length === 0 ? (
              <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                <Ticket size={28} style={{ opacity: 0.5 }} />
                <span>You have not submitted any IT tickets yet.</span>
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
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Ticket #
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Subject
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Category
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Priority
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Status
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
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
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                          {t.ticket_number}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#172033' }}>
                          {t.subject}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#667085' }}>
                          {t.category_name}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <PriorityBadge priority={t.priority as any} />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <StatusBadge status={t.status as any} />
                        </td>
                        <td style={{ padding: '8px 12px', color: '#667085' }}>
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
          <div className={LAYOUT_CLASSES.statGrid4}>
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
          <div className={LAYOUT_CLASSES.dashboardCard}>
            <div className={LAYOUT_CLASSES.dashboardCardHeader}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                My Active Work Queue
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                Open Tickets Queue <ArrowRight size={13} style={{ marginLeft: '4px' }} />
              </Button>
            </div>
            {!stats.recent_assigned_tickets || stats.recent_assigned_tickets.length === 0 ? (
              <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                <CheckCircle2 size={24} color="#10B981" />
                <span>You have no open tickets currently assigned.</span>
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
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Ticket #
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Subject
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Requester
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Priority
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                        Status
                      </th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
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
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                          {t.ticket_number}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#172033' }}>
                          {t.subject}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475467' }}>
                          {t.requester_name}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <PriorityBadge priority={t.priority as any} />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <StatusBadge status={t.status as any} />
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
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
          {/* SECTION C: 5 PRIMARY OPERATIONAL KPI CARDS */}
          <div className={LAYOUT_CLASSES.statGrid5}>
            <StatCard
              label="Active Incidents"
              value={stats.metrics.open_tickets ?? 0}
              icon={<Inbox size={15} />}
              variant="primary"
              onClick={() => navigate('/tickets?active_only=true')}
              subtext="Total open queue"
            />
            <StatCard
              label="Overdue SLA"
              value={stats.metrics.overdue_tickets ?? 0}
              icon={<AlertTriangle size={15} />}
              variant={(stats.metrics.overdue_tickets ?? 0) > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/tickets?overdue=true')}
              subtext="Breached targets"
            />
            <StatCard
              label="Critical Priority"
              value={stats.metrics.critical_tickets ?? 0}
              icon={<Flame size={15} />}
              variant={(stats.metrics.critical_tickets ?? 0) > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/tickets?priority=critical')}
              subtext="Urgent action required"
            />
            <StatCard
              label="Pending Approvals"
              value={totalPendingApprovals}
              icon={<Clock size={15} />}
              variant={totalPendingApprovals > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/service-desk?type=service_request&status=pending_approval')}
              subtext="Orders, claims & requests"
            />
            <StatCard
              label="Resolved (Month)"
              value={stats.metrics.resolved_this_month ?? 0}
              icon={<CheckCircle2 size={15} />}
              variant="success"
              onClick={() => navigate('/tickets?resolved_month=true')}
              subtext="Closed this month"
            />
          </div>

          {/* SECTION D: URGENT ITEMS & PENDING ACTIONS TRIAGE (BALANCED 2-COL) */}
          <div className={LAYOUT_CLASSES.dashboardGrid2Col}>
            {/* Overdue Tickets Panel (LEFT) */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div
                className={LAYOUT_CLASSES.dashboardCardHeader}
                style={{ backgroundColor: stats.overdue_tickets?.length ? '#FFF5F5' : '#FFFFFF' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={stats.overdue_tickets?.length ? '#DC2626' : '#667085'} />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Requires Attention (Overdue)
                  </h2>
                  {stats.overdue_tickets?.length ? (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#FEE2E2',
                        color: '#B42318',
                        fontWeight: 700,
                      }}
                    >
                      {stats.overdue_tickets.length}
                    </span>
                  ) : null}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tickets?overdue=true')}>
                  View All
                </Button>
              </div>

              {!stats.overdue_tickets || stats.overdue_tickets.length === 0 ? (
                <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                  <CheckCircle2 size={24} color="#10B981" />
                  <span style={{ fontWeight: 600, color: '#15803D' }}>All SLA Targets Met</span>
                  <span style={{ fontSize: '12px', color: '#667085' }}>No active tickets are currently overdue.</span>
                </div>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {stats.overdue_tickets.map((t: RecentOverdueTicket) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="table-row-hover"
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #F2F4F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#2563EB', fontSize: '12.5px', fontFamily: 'monospace' }}>
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

            {/* Unassigned Tickets Panel (RIGHT) */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div
                className={LAYOUT_CLASSES.dashboardCardHeader}
                style={{ backgroundColor: stats.unassigned_tickets?.length ? '#FFFDF7' : '#FFFFFF' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={16} color={stats.unassigned_tickets?.length ? '#EA580C' : '#667085'} />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Unassigned Queue
                  </h2>
                  {stats.unassigned_tickets?.length ? (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#FFEDD5',
                        color: '#9A3412',
                        fontWeight: 700,
                      }}
                    >
                      {stats.unassigned_tickets.length}
                    </span>
                  ) : null}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tickets?tab=unassigned')}>
                  View All
                </Button>
              </div>

              {!stats.unassigned_tickets || stats.unassigned_tickets.length === 0 ? (
                <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                  <CheckCircle2 size={24} color="#10B981" />
                  <span style={{ fontWeight: 600, color: '#15803D' }}>Queue Fully Dispatched</span>
                  <span style={{ fontSize: '12px', color: '#667085' }}>All open tickets are assigned to technicians.</span>
                </div>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {stats.unassigned_tickets.map((t: RecentUnassignedTicket) => (
                    <div
                      key={t.id}
                      className="table-row-hover"
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #F2F4F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#2563EB', fontSize: '12.5px', fontFamily: 'monospace' }}>
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
                      <Button size="sm" onClick={() => handleOpenAssign(t)} style={{ padding: '3px 8px', fontSize: '11.5px' }}>
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION E: CONSOLIDATED OPERATIONAL SUMMARIES ── */}
          {/* Row 1: IT Assets & Software Licensing (LEFT) | Financial & Purchasing Operations (RIGHT) */}
          <div className={LAYOUT_CLASSES.dashboardGrid2Col}>
            {/* Left Card: Hardware Assets & Software Licensing */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Laptop size={16} color="#2563EB" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    IT Assets &amp; Software Licenses
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                    Assets
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/software')}>
                    Licenses
                  </Button>
                </div>
              </div>

              <div className={LAYOUT_CLASSES.dashboardCardBody}>
                {/* Physical Hardware Fleet */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Hardware Inventory
                  </div>
                  <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                    <div onClick={() => navigate('/assets')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Total</span>
                      <strong style={{ fontSize: '16px', color: '#172033' }}>{assetStats?.total_assets ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/assets?status=assigned')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#175CD3', fontWeight: 600, textTransform: 'uppercase' }}>Assigned</span>
                      <strong style={{ fontSize: '16px', color: '#175CD3' }}>{assetStats?.assigned ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/assets?status=available')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>Available</span>
                      <strong style={{ fontSize: '16px', color: '#15803D' }}>{assetStats?.available ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/assets?status=in_repair')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#B54708', fontWeight: 600, textTransform: 'uppercase' }}>In Repair</span>
                      <strong style={{ fontSize: '16px', color: '#B54708' }}>{assetStats?.in_repair ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/assets?warranty=expiring_soon')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (assetStats?.expiring_soon || 0) > 0 ? '#B42318' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Warranty</span>
                      <strong style={{ fontSize: '16px', color: (assetStats?.expiring_soon || 0) > 0 ? '#B42318' : '#172033' }}>
                        {assetStats?.expiring_soon ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Software & Subscriptions */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Software &amp; License Capacity
                  </div>
                  <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                    <div onClick={() => navigate('/software')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Titles</span>
                      <strong style={{ fontSize: '16px', color: '#172033' }}>{softwareStats?.total_software ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/software')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#175CD3', fontWeight: 600, textTransform: 'uppercase' }}>Assigned</span>
                      <strong style={{ fontSize: '16px', color: '#175CD3' }}>{softwareStats?.used_licenses ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/software')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>Available</span>
                      <strong style={{ fontSize: '16px', color: '#15803D' }}>{softwareStats?.available_licenses ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/software?expiring_soon=true')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (softwareStats?.expiring_soon || 0) > 0 ? '#B54708' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Expiring</span>
                      <strong style={{ fontSize: '16px', color: (softwareStats?.expiring_soon || 0) > 0 ? '#B54708' : '#172033' }}>
                        {softwareStats?.expiring_soon ?? 0}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/software?expired=true')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (softwareStats?.expired || 0) > 0 ? '#B42318' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Expired</span>
                      <strong style={{ fontSize: '16px', color: (softwareStats?.expired || 0) > 0 ? '#B42318' : '#172033' }}>
                        {softwareStats?.expired ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Office Cash & Purchasing Operations */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={16} color="#2563EB" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Financial &amp; Purchasing Operations
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
                    Cash Ledger
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/procurement')}>
                    Orders
                  </Button>
                </div>
              </div>

              <div className={LAYOUT_CLASSES.dashboardCardBody}>
                {/* Petty Cash & Reimbursements */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Petty Cash &amp; Reimbursements
                    </span>
                    {expenseStats?.is_low_balance && (
                      <span style={{ fontSize: '11px', color: '#B42318', fontWeight: 600 }}>Low Reserve Warning</span>
                    )}
                  </div>
                  <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                    <div
                      onClick={() => navigate('/expenses')}
                      className={LAYOUT_CLASSES.dashboardPillMetric}
                      style={{
                        backgroundColor: expenseStats?.is_low_balance ? '#FEF2F2' : '#F0FDF4',
                        borderColor: expenseStats?.is_low_balance ? '#FECDCA' : '#BBF7D0',
                      }}
                    >
                      <span style={{ fontSize: '10.5px', color: expenseStats?.is_low_balance ? '#B42318' : '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
                        Reserve
                      </span>
                      <strong style={{ fontSize: '14px', color: expenseStats?.is_low_balance ? '#B42318' : '#15803D' }}>
                        {expenseStats ? formatINR(expenseStats.current_balance) : '—'}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/expenses')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Outflow</span>
                      <strong style={{ fontSize: '14px', color: '#172033' }}>
                        {expenseStats ? formatINR(expenseStats.total_cash_out_month) : '—'}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/reimbursements?status=submitted')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (pendingReimbursementsCount || 0) > 0 ? '#B54708' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                        Claims
                      </span>
                      <strong style={{ fontSize: '16px', color: (pendingReimbursementsCount || 0) > 0 ? '#B54708' : '#172033' }}>
                        {pendingReimbursementsCount ?? 0}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/reimbursements?status=approved')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (approvedReimbursementsCount || 0) > 0 ? '#175CD3' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                        To Pay
                      </span>
                      <strong style={{ fontSize: '16px', color: (approvedReimbursementsCount || 0) > 0 ? '#175CD3' : '#172033' }}>
                        {approvedReimbursementsCount ?? 0}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/expenses')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Vouchers</span>
                      <strong style={{ fontSize: '16px', color: '#172033' }}>
                        {expenseStats?.active_transactions_count ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Purchasing & Orders */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Purchasing &amp; Orders
                  </div>
                  <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                    <div onClick={() => navigate('/procurement?status=submitted')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (procurementStats?.pending_approval || 0) > 0 ? '#175CD3' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Review</span>
                      <strong style={{ fontSize: '16px', color: (procurementStats?.pending_approval || 0) > 0 ? '#175CD3' : '#172033' }}>
                        {procurementStats?.pending_approval ?? 0}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/procurement?status=approved')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>Approved</span>
                      <strong style={{ fontSize: '16px', color: '#15803D' }}>{procurementStats?.approved ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/procurement?status=ordered')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#175CD3', fontWeight: 600, textTransform: 'uppercase' }}>On Order</span>
                      <strong style={{ fontSize: '16px', color: '#175CD3' }}>{procurementStats?.ordered ?? 0}</strong>
                    </div>
                    <div onClick={() => navigate('/procurement?status=partially_received')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: (procurementStats?.partially_received || 0) > 0 ? '#B54708' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Partial</span>
                      <strong style={{ fontSize: '16px', color: (procurementStats?.partially_received || 0) > 0 ? '#B54708' : '#172033' }}>
                        {procurementStats?.partially_received ?? 0}
                      </strong>
                    </div>
                    <div onClick={() => navigate('/procurement?status=completed')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                      <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Done</span>
                      <strong style={{ fontSize: '16px', color: '#172033' }}>{procurementStats?.completed ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: IT Service Requests & Approvals (LEFT) | Vendors & Service Contracts (RIGHT) */}
          <div className={LAYOUT_CLASSES.dashboardGrid2Col}>
            {/* Left Card: IT Service Requests & Approvals */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={16} color="#2563EB" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    IT Service Requests &amp; Approvals
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/service-desk')}>
                  Service Desk
                </Button>
              </div>

              <div className={LAYOUT_CLASSES.dashboardCardBody}>
                <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                  <div onClick={() => navigate('/service-desk?type=service_request')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Total</span>
                    <strong style={{ fontSize: '16px', color: '#172033' }}>{serviceRequestStats?.total ?? 0}</strong>
                  </div>
                  <div onClick={() => navigate('/service-desk?type=service_request&status=pending_approval')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: (serviceRequestStats?.pending_approval || 0) > 0 ? '#B54708' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Pending</span>
                    <strong style={{ fontSize: '16px', color: (serviceRequestStats?.pending_approval || 0) > 0 ? '#B54708' : '#172033' }}>
                      {serviceRequestStats?.pending_approval ?? 0}
                    </strong>
                  </div>
                  <div onClick={() => navigate('/service-desk?type=service_request&status=in_progress')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#175CD3', fontWeight: 600, textTransform: 'uppercase' }}>Active</span>
                    <strong style={{ fontSize: '16px', color: '#175CD3' }}>{serviceRequestStats?.in_progress ?? 0}</strong>
                  </div>
                  <div onClick={() => navigate('/service-desk?type=service_request&status=waiting_for_user')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: (serviceRequestStats?.waiting_for_user || 0) > 0 ? '#B42318' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Waiting</span>
                    <strong style={{ fontSize: '16px', color: (serviceRequestStats?.waiting_for_user || 0) > 0 ? '#B42318' : '#172033' }}>
                      {serviceRequestStats?.waiting_for_user ?? 0}
                    </strong>
                  </div>
                  <div onClick={() => navigate('/service-desk?type=service_request&status=completed')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>Closed</span>
                    <strong style={{ fontSize: '16px', color: '#15803D' }}>{serviceRequestStats?.completed ?? 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Vendors & Contracts */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color="#2563EB" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Vendors &amp; Service Agreements
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
                  Vendors
                </Button>
              </div>

              <div className={LAYOUT_CLASSES.dashboardCardBody}>
                <div className={LAYOUT_CLASSES.summaryMiniGrid}>
                  <div onClick={() => navigate('/vendors')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Vendors</span>
                    <strong style={{ fontSize: '16px', color: '#172033' }}>{vendorStats?.total_vendors ?? 0}</strong>
                  </div>
                  <div onClick={() => navigate('/vendors?status=active')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>Active</span>
                    <strong style={{ fontSize: '16px', color: '#15803D' }}>{vendorStats?.active_vendors ?? 0}</strong>
                  </div>
                  <div onClick={() => navigate('/vendors?tab=contracts&contract_status=active')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: '#175CD3', fontWeight: 600, textTransform: 'uppercase' }}>Contracts</span>
                    <strong style={{ fontSize: '16px', color: '#175CD3' }}>{vendorStats?.active_contracts ?? 0}</strong>
                  </div>
                  <div onClick={() => navigate('/vendors?tab=contracts&contract_status=expiring_soon')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: (vendorStats?.expiring_soon_contracts || 0) > 0 ? '#B54708' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Renewals</span>
                    <strong style={{ fontSize: '16px', color: (vendorStats?.expiring_soon_contracts || 0) > 0 ? '#B54708' : '#172033' }}>
                      {vendorStats?.expiring_soon_contracts ?? 0}
                    </strong>
                  </div>
                  <div onClick={() => navigate('/vendors?tab=contracts&contract_status=expired')} className={LAYOUT_CLASSES.dashboardPillMetric}>
                    <span style={{ fontSize: '10.5px', color: (vendorStats?.expired_contracts || 0) > 0 ? '#B42318' : '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Expired</span>
                    <strong style={{ fontSize: '16px', color: (vendorStats?.expired_contracts || 0) > 0 ? '#B42318' : '#172033' }}>
                      {vendorStats?.expired_contracts ?? 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION F: SUPPORTING INFORMATION (WORKLOAD & AUDIT ACTIVITY) ── */}
          <div className={LAYOUT_CLASSES.dashboardGrid2Col}>
            {/* Technician Workload Summary (LEFT) */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#2563EB" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Technician Queue Allocation
                  </h2>
                </div>
              </div>

              {!stats.technician_workload || stats.technician_workload.length === 0 ? (
                <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                  <span>No active technicians in queue.</span>
                </div>
              ) : (
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '12.5px',
                    }}
                  >
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase' }}>
                          Technician
                        </th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>
                          Open
                        </th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>
                          Progress
                        </th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#667085', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>
                          Overdue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.technician_workload.map((tech) => (
                        <tr key={tech.id} className="table-row-hover" style={{ borderBottom: '1px solid #F2F4F7' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#172033' }}>{tech.name}</div>
                            <div style={{ fontSize: '11px', color: '#98A2B3' }}>{tech.role.replace('_', ' ')}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: tech.open_count > 0 ? '#175CD3' : '#667085' }}>
                              {tech.open_count}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#B54708' }}>
                              {tech.in_progress_count}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: tech.overdue_count > 0 ? '#DC2626' : '#667085' }}>
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

            {/* Recent Activity Feed (RIGHT) */}
            <div className={LAYOUT_CLASSES.dashboardCard}>
              <div className={LAYOUT_CLASSES.dashboardCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} color="#667085" />
                  <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    Recent Audit Feed
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/audit')}>
                  Full Log
                </Button>
              </div>

              {!stats.recent_activity || stats.recent_activity.length === 0 ? (
                <div className={LAYOUT_CLASSES.dashboardEmptyCompact}>
                  <span>No recent activity records.</span>
                </div>
              ) : (
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {stats.recent_activity.map((act) => (
                    <div
                      key={act.id}
                      className="table-row-hover"
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #F2F4F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: '#172033', fontSize: '12.5px' }}>
                          {act.actor_name}
                        </span>
                        <span style={{ color: '#667085', fontSize: '12.5px', marginLeft: '5px' }}>
                          {act.action} on {act.target_type}{' '}
                          <span style={{ color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
                            {act.target_id}
                          </span>
                        </span>
                        {act.description && (
                          <div style={{ fontSize: '11.5px', color: '#667085', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {act.description}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#98A2B3', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(act.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              maxWidth: '460px',
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
                padding: '14px 18px',
                borderBottom: '1px solid #E5E9F0',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Assign Ticket
                </h3>
                <span style={{ fontSize: '12.5px', color: '#2563EB', fontWeight: 600 }}>
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

            <div style={{ padding: '18px' }}>
              {assignError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEE2E2',
                    color: '#B42318',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    marginBottom: '14px',
                  }}
                >
                  <AlertCircle size={15} color="#DC2626" />
                  <span>{assignError}</span>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Subject
                </div>
                <div style={{ fontSize: '13.5px', color: '#172033', fontWeight: 500 }}>
                  {assigningTicket.subject}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#172033', display: 'block', marginBottom: '5px' }}>
                  Select Technician
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
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
                  <option value="">-- Choose technician --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.role.replace('_', ' ').toUpperCase()}) — {tech.open_tickets_count} open
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={() => setAssigningTicket(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmAssign} isLoading={isAssigning} disabled={!selectedTechId}>
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
