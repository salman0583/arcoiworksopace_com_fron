import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Search, ChevronLeft, ChevronRight, RefreshCw,
  RotateCcw, UserCheck, Inbox, CheckCircle2, AlertCircle, X, Users,
  Flame, Clock, AlertTriangle,
} from 'lucide-react';
import { getTickets, getCategories, getTechnicians, assignTicket } from '../../api/tickets';
import { coreApi } from '../../api/core';
import { PriorityBadge, StatusBadge, OverdueBadge } from '../../components/tickets/TicketBadges';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTableHeaderCell, FilterPopover, ActiveFilterChips, TableTopBar } from '../../components/common/table';
import { Button, PageHeader } from '../../components/ui';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import type {
  TicketListItem, TicketCategory, TicketStatus, Priority, Technician
} from '../../types/tickets';
import type { DashboardStats } from '../../types';
import { logger } from '../../utils/logger';


const PAGE_SIZE = 20;

const ALL_STATUSES: TicketStatus[] = [
  'new', 'open', 'in_progress', 'waiting_for_user',
  'waiting_for_vendor', 'resolved', 'closed', 'cancelled',
];
const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New', open: 'Open', in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User', waiting_for_vendor: 'Waiting for Vendor',
  resolved: 'Resolved', closed: 'Closed', cancelled: 'Cancelled',
};

type TabMode = 'all' | 'unassigned' | 'my_work';

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isITAdmin = user && isAdminOrAbove(user.role);

  // Initial values derived synchronously from searchParams
  const getInitialTab = (): TabMode => {
    const t = searchParams.get('tab');
    if (t === 'unassigned' || t === 'my_work') return t;
    return 'all';
  };
  const getInitialStatus = () => searchParams.get('status') || '';
  const getInitialPriority = () => searchParams.get('priority') || '';
  const getInitialOverdue = () => searchParams.get('overdue') === 'true';
  const getInitialResolvedMonth = () => searchParams.get('resolved_month') === 'true';
  const getInitialActiveOnly = () => searchParams.get('active_only') === 'true';
  const getInitialCard = () => {
    if (searchParams.get('active_only') === 'true' || searchParams.get('status') === 'open') return 'open';
    if (searchParams.get('tab') === 'unassigned') return 'unassigned';
    if (searchParams.get('overdue') === 'true') return 'overdue';
    if (searchParams.get('priority') === 'critical') return 'critical';
    if (searchParams.get('resolved_month') === 'true') return 'resolved_month';
    return null;
  };

  const [activeTab, setActiveTab] = useState<TabMode>(getInitialTab);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState(getInitialStatus);
  const [filterPriority, setFilterPriority] = useState(getInitialPriority);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  // Column Popover State
  const [openPopover, setOpenPopover] = useState<'category' | 'priority' | 'status' | 'assignee' | null>(null);

  // Card filter states & stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(getInitialOverdue);
  const [filterResolvedMonth, setFilterResolvedMonth] = useState(getInitialResolvedMonth);
  const [filterActiveOnly, setFilterActiveOnly] = useState(getInitialActiveOnly);
  const [activeCard, setActiveCard] = useState<string | null>(getInitialCard);

  // Quick Assign Modal state
  const [assigningTicket, setAssigningTicket] = useState<TicketListItem | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync URL search parameters on navigation
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const tabParam = searchParams.get('tab');
    const overdueParam = searchParams.get('overdue');
    const resolvedMonthParam = searchParams.get('resolved_month');
    const activeOnlyParam = searchParams.get('active_only');

    setFilterStatus(statusParam || '');
    setFilterPriority(priorityParam || '');

    if (tabParam === 'unassigned') {
      setActiveTab('unassigned');
      setActiveCard('unassigned');
    } else if (tabParam === 'my_work') {
      setActiveTab('my_work');
      setActiveCard(null);
    } else {
      setActiveTab('all');
    }

    setFilterOverdue(overdueParam === 'true');
    setFilterResolvedMonth(resolvedMonthParam === 'true');
    setFilterActiveOnly(activeOnlyParam === 'true');

    if (activeOnlyParam === 'true' || statusParam === 'open') {
      setActiveCard('open');
    } else if (tabParam === 'unassigned') {
      setActiveCard('unassigned');
    } else if (overdueParam === 'true') {
      setActiveCard('overdue');
    } else if (priorityParam === 'critical') {
      setActiveCard('critical');
    } else if (resolvedMonthParam === 'true') {
      setActiveCard('resolved_month');
    } else {
      setActiveCard(null);
    }
  }, [searchParams]);


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = { page, page_size: PAGE_SIZE };
      if (search)         params.search = search;
      if (filterStatus)   params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;

      if (filterOverdue) {
        params.overdue = true;
      }
      if (filterResolvedMonth) {
        params.resolved_month = true;
      }
      if (filterActiveOnly) {
        params.active_only = true;
      }

      if (activeTab === 'unassigned') {
        params.unassigned = true;
      } else if (activeTab === 'my_work') {
        params.my_work = true;
      } else if (filterAssignee) {
        params.assigned_to = filterAssignee;
      }

      const [ticketsResp, unassignedResp, statsResp] = await Promise.all([
        getTickets(params),
        getTickets({ unassigned: true, page_size: 1 }),
        coreApi.getDashboardStats().catch(() => null),
      ]);

      const rawTickets = ticketsResp.data?.results;
      const list = Array.isArray(rawTickets) ? rawTickets : (Array.isArray(ticketsResp.data) ? ticketsResp.data : []);
      setTickets(list);
      setTotalCount(ticketsResp.data?.count ?? list.length);
      setUnassignedCount(unassignedResp.data?.count ?? 0);
      if (statsResp) setDashboardStats(statsResp);
    } catch (err: unknown) {
      logger.error('Tickets', 'Failed to load tickets in TicketList', err);
      setError('Failed to load tickets. Please check your connection or try again.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPriority, filterCategory, activeTab, filterAssignee, filterOverdue, filterResolvedMonth, filterActiveOnly]);

  useEffect(() => { load(); }, [load]);

  const loadMetadata = async () => {
    try {
      const [catsResp, techsResp] = await Promise.all([
        getCategories(),
        getTechnicians(),
      ]);
      const rawCats = catsResp.data;
      const catList = Array.isArray(rawCats) ? rawCats : ((rawCats as unknown as { results?: TicketCategory[] })?.results || []);
      setCategories(catList);
      setTechnicians(Array.isArray(techsResp.data) ? techsResp.data : []);
    } catch (err: unknown) {
      logger.error('Tickets', 'Failed to load categories or technicians', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(''); setSearchInput('');
    setFilterStatus(''); setFilterPriority(''); setFilterCategory(''); setFilterAssignee('');
    setActiveTab('all');
    setFilterOverdue(false);
    setFilterResolvedMonth(false);
    setFilterActiveOnly(false);
    setActiveCard(null);
    setSearchParams({});
    setPage(1);
  };


  const handleOpenAssignModal = (t: TicketListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningTicket(t);
    setSelectedTechId(t.assigned_to_id || '');
    setAssignError(null);
  };

  const handleConfirmAssign = async () => {
    if (!assigningTicket) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignTicket(assigningTicket.id, selectedTechId ? Number(selectedTechId) : null);
      const techObj = technicians.find(tc => tc.id === Number(selectedTechId));
      const msg = selectedTechId
        ? `Ticket ${assigningTicket.ticket_number} assigned to ${techObj?.full_name || 'technician'}.`
        : `Ticket ${assigningTicket.ticket_number} marked as unassigned.`;
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
      setAssigningTicket(null);
      load();
      loadMetadata();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setAssignError(errorMsg || 'Failed to update assignment. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  const selectStyle: React.CSSProperties = {
    height: '38px',
    padding: '0 12px',
    borderRadius: '6px',
    border: '1px solid #E5E9F0',
    fontSize: '13px',
    color: '#475467',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '16px',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Tickets & Help Desk"
        description="Manage support requests, technician dispatching, and resolution workflows"
      />

      {/* Interactive KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <SummaryFilterCard
          title="Open Tickets"
          count={dashboardStats?.metrics?.open_tickets ?? totalCount}
          icon={<Inbox size={18} />}
          isActive={activeCard === 'open'}
          accentColor="#175CD3"
          onClick={() => {
            if (activeCard === 'open') {
              setActiveCard(null);
              setFilterActiveOnly(false);
            } else {
              setActiveCard('open');
              setFilterActiveOnly(true);
              setFilterStatus('');
              setFilterPriority('');
              setActiveTab('all');
              setFilterOverdue(false);
              setFilterResolvedMonth(false);
            }
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Unassigned"
          count={unassignedCount || dashboardStats?.metrics?.unassigned_tickets || 0}
          icon={<UserCheck size={18} />}
          isActive={activeCard === 'unassigned' || activeTab === 'unassigned'}
          accentColor="#EA580C"
          onClick={() => {
            if (activeCard === 'unassigned' || activeTab === 'unassigned') {
              setActiveCard(null);
              setActiveTab('all');
            } else {
              setActiveCard('unassigned');
              setActiveTab('unassigned');
              setFilterActiveOnly(false);
              setFilterStatus('');
              setFilterPriority('');
              setFilterOverdue(false);
              setFilterResolvedMonth(false);
            }
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Overdue"
          count={dashboardStats?.metrics?.overdue_tickets ?? 0}
          icon={<AlertTriangle size={18} />}
          isActive={activeCard === 'overdue' || filterOverdue}
          accentColor="#DC2626"
          onClick={() => {
            if (activeCard === 'overdue' || filterOverdue) {
              setActiveCard(null);
              setFilterOverdue(false);
            } else {
              setActiveCard('overdue');
              setFilterOverdue(true);
              setFilterActiveOnly(false);
              setActiveTab('all');
              setFilterStatus('');
              setFilterPriority('');
              setFilterResolvedMonth(false);
            }
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Critical"
          count={dashboardStats?.metrics?.critical_tickets ?? 0}
          icon={<Flame size={18} />}
          isActive={activeCard === 'critical' || filterPriority === 'critical'}
          accentColor="#E11D48"
          onClick={() => {
            if (activeCard === 'critical' || filterPriority === 'critical') {
              setActiveCard(null);
              setFilterPriority('');
            } else {
              setActiveCard('critical');
              setFilterPriority('critical');
              setFilterActiveOnly(false);
              setActiveTab('all');
              setFilterStatus('');
              setFilterOverdue(false);
              setFilterResolvedMonth(false);
            }
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Resolved Month"
          count={dashboardStats?.metrics?.resolved_this_month ?? 0}
          icon={<CheckCircle2 size={18} />}
          isActive={activeCard === 'resolved_month' || filterResolvedMonth}
          accentColor="#059669"
          onClick={() => {
            if (activeCard === 'resolved_month' || filterResolvedMonth) {
              setActiveCard(null);
              setFilterResolvedMonth(false);
            } else {
              setActiveCard('resolved_month');
              setFilterResolvedMonth(true);
              setFilterActiveOnly(false);
              setActiveTab('all');
              setFilterStatus('');
              setFilterPriority('');
              setFilterOverdue(false);
            }
            setPage(1);
          }}
        />
      </div>

      {/* Technician Workload Summary (IT Admin & Super Admin) */}

      {isITAdmin && technicians.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E9F0',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Users size={16} color="#2563EB" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Technician Workload
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {technicians.map(tech => {
              const isSelected = filterAssignee === String(tech.id);
              return (
                <div
                  key={tech.id}
                  onClick={() => {
                    if (isSelected) {
                      setFilterAssignee('');
                    } else {
                      setFilterAssignee(String(tech.id));
                      setActiveTab('all');
                    }
                    setPage(1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#2563EB' : '#E5E9F0'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#175CD3' : '#172033' }}>{tech.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#667085', textTransform: 'capitalize' }}>{tech.role.replace('_', ' ')}</div>
                  </div>
                  <span
                    style={{
                      backgroundColor: tech.open_tickets_count > 0 ? '#2563EB' : '#E5E9F0',
                      color: tech.open_tickets_count > 0 ? '#FFFFFF' : '#667085',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {tech.open_tickets_count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E5E9F0', paddingBottom: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('all'); setFilterAssignee(''); setPage(1); }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'all' && !filterAssignee ? 600 : 400,
            backgroundColor: activeTab === 'all' && !filterAssignee ? '#2563EB' : 'transparent',
            color: activeTab === 'all' && !filterAssignee ? '#FFFFFF' : '#667085',
            cursor: 'pointer',
          }}
        >
          All Tickets
        </button>

        {isITAdmin && (
          <button
            onClick={() => { setActiveTab('unassigned'); setFilterAssignee(''); setPage(1); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'unassigned' ? 600 : 400,
              backgroundColor: activeTab === 'unassigned' ? '#EA580C' : 'transparent',
              color: activeTab === 'unassigned' ? '#FFFFFF' : '#667085',
              cursor: 'pointer',
            }}
          >
            <Inbox size={15} />
            <span>Unassigned Queue</span>
            {unassignedCount > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'unassigned' ? '#FFFFFF' : '#FEE2E2',
                  color: activeTab === 'unassigned' ? '#EA580C' : '#DC2626',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {unassignedCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => { setActiveTab('my_work'); setFilterAssignee(''); setPage(1); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'my_work' ? 600 : 400,
            backgroundColor: activeTab === 'my_work' ? '#2563EB' : 'transparent',
            color: activeTab === 'my_work' ? '#FFFFFF' : '#667085',
            cursor: 'pointer',
          }}
        >
          <UserCheck size={15} />
          <span>Assigned to Me</span>
        </button>
      </div>

      {/* Sleek Compact Top Bar */}
      <TableTopBar
        search={searchInput}
        onSearchChange={(val) => {
          setSearchInput(val);
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search tickets, subject, requester..."
        showDateFilter={false}
        hasActiveFilters={Boolean(search || filterStatus || filterPriority || filterCategory || filterAssignee || activeCard || filterOverdue || filterResolvedMonth || filterActiveOnly)}
        onResetFilters={clearFilters}
      />

      {/* Active Filter Chips Bar */}
      <ActiveFilterChips
        filters={[
          search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setSearchInput(''); setPage(1); } } : null,
          filterCategory && safeCategories.find(c => String(c.id) === filterCategory) ? { id: 'category', label: 'Category', value: safeCategories.find(c => String(c.id) === filterCategory)!.name, onRemove: () => { setFilterCategory(''); setPage(1); } } : null,
          filterPriority ? { id: 'priority', label: 'Priority', value: filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1), onRemove: () => { setFilterPriority(''); setActiveCard(null); setPage(1); } } : null,
          filterStatus ? { id: 'status', label: 'Status', value: STATUS_LABELS[filterStatus as TicketStatus] || filterStatus, onRemove: () => { setFilterStatus(''); setActiveCard(null); setPage(1); } } : null,
          filterAssignee && technicians.find(t => String(t.id) === filterAssignee) ? { id: 'assignee', label: 'Assignee', value: technicians.find(t => String(t.id) === filterAssignee)!.full_name, onRemove: () => { setFilterAssignee(''); setPage(1); } } : null,
          filterOverdue ? { id: 'overdue', label: 'Filter', value: 'Overdue', onRemove: () => { setFilterOverdue(false); setActiveCard(null); setPage(1); } } : null,
          filterResolvedMonth ? { id: 'resolved_month', label: 'Filter', value: 'Resolved This Month', onRemove: () => { setFilterResolvedMonth(false); setActiveCard(null); setPage(1); } } : null,
        ].filter(Boolean) as any[]}
        onClearAll={clearFilters}
      />

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E9F0', overflow: 'visible', boxShadow: 'var(--shadow-sm)' }}>
        {error ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#FEE2E2' }}>
            <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>{error}</div>
            <button
              onClick={() => load()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', backgroundColor: '#2563EB', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#98A2B3' }}>Loading tickets...</div>
        ) : safeTickets.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} color="#98A2B3" />}
            title={activeTab === 'unassigned' ? 'No unassigned tickets' : (activeTab === 'my_work' ? 'No tickets assigned to you' : 'No tickets found')}
            description="Try adjusting your search criteria or clear your active card filters."
            action={
              (search || activeCard || filterPriority || filterStatus || filterCategory || filterAssignee || filterOverdue || filterResolvedMonth) ? (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#175CD3',
                    border: '1px solid #B2CCFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Tickets Table">
            <table style={{ width: '100%', minWidth: '1290px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Ticket #"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    isSticky
                    stickyLeft={0}
                  />
                  <DataTableHeaderCell
                    title="Subject"
                    width="260px"
                    minWidth="260px"
                    maxWidth="260px"
                    isSticky
                    stickyLeft="120px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Requester"
                    width="160px"
                    minWidth="160px"
                    maxWidth="160px"
                  />
                  <DataTableHeaderCell
                    title="Category"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                    filterActive={Boolean(filterCategory)}
                    filterOpen={openPopover === 'category'}
                    onFilterToggle={() => setOpenPopover(openPopover === 'category' ? null : 'category')}
                    filterTitle="Filter by Category"
                    filterPopover={
                      <FilterPopover
                        isOpen={openPopover === 'category'}
                        onClose={() => setOpenPopover(null)}
                        title="Filter: Category"
                        icon={<Inbox size={13} color="#2563EB" />}
                        align="left"
                        options={[
                          { key: '', label: 'All Categories' },
                          ...safeCategories.map(c => ({ key: String(c.id), label: c.name })),
                        ]}
                        selectedValue={filterCategory}
                        onSelect={(key) => {
                          setFilterCategory(String(key));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilterCategory('');
                          setPage(1);
                        }}
                        onApply={() => setOpenPopover(null)}
                      />
                    }
                  />
                  <DataTableHeaderCell
                    title="Priority"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                    filterActive={Boolean(filterPriority)}
                    filterOpen={openPopover === 'priority'}
                    onFilterToggle={() => setOpenPopover(openPopover === 'priority' ? null : 'priority')}
                    filterTitle="Filter by Priority"
                    filterPopover={
                      <FilterPopover
                        isOpen={openPopover === 'priority'}
                        onClose={() => setOpenPopover(null)}
                        title="Filter: Priority"
                        icon={<Flame size={13} color="#2563EB" />}
                        align="left"
                        options={[
                          { key: '', label: 'All Priorities' },
                          { key: 'critical', label: 'Critical', badge: <PriorityBadge priority="critical" /> },
                          { key: 'high', label: 'High', badge: <PriorityBadge priority="high" /> },
                          { key: 'medium', label: 'Medium', badge: <PriorityBadge priority="medium" /> },
                          { key: 'low', label: 'Low', badge: <PriorityBadge priority="low" /> },
                        ]}
                        selectedValue={filterPriority}
                        onSelect={(key) => {
                          setFilterPriority(String(key));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilterPriority('');
                          setPage(1);
                        }}
                        onApply={() => setOpenPopover(null)}
                      />
                    }
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                    filterActive={Boolean(filterStatus)}
                    filterOpen={openPopover === 'status'}
                    onFilterToggle={() => setOpenPopover(openPopover === 'status' ? null : 'status')}
                    filterTitle="Filter by Status"
                    filterPopover={
                      <FilterPopover
                        isOpen={openPopover === 'status'}
                        onClose={() => setOpenPopover(null)}
                        title="Filter: Status"
                        icon={<CheckCircle2 size={13} color="#2563EB" />}
                        align="left"
                        options={[
                          { key: '', label: 'All Statuses' },
                          ...ALL_STATUSES.map(s => ({
                            key: s,
                            label: STATUS_LABELS[s],
                            badge: <StatusBadge status={s} />,
                          })),
                        ]}
                        selectedValue={filterStatus}
                        onSelect={(key) => {
                          setFilterStatus(String(key));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilterStatus('');
                          setPage(1);
                        }}
                        onApply={() => setOpenPopover(null)}
                      />
                    }
                  />
                  <DataTableHeaderCell
                    title="Assigned To"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                    filterActive={Boolean(filterAssignee)}
                    filterOpen={openPopover === 'assignee'}
                    onFilterToggle={() => setOpenPopover(openPopover === 'assignee' ? null : 'assignee')}
                    filterTitle="Filter by Assignee"
                    filterPopover={
                      <FilterPopover
                        isOpen={openPopover === 'assignee'}
                        onClose={() => setOpenPopover(null)}
                        title="Filter: Assigned To"
                        icon={<Users size={13} color="#2563EB" />}
                        align="left"
                        options={[
                          { key: '', label: 'All Technicians' },
                          ...technicians.map(t => ({
                            key: String(t.id),
                            label: t.full_name,
                            count: t.open_tickets_count,
                          })),
                        ]}
                        selectedValue={filterAssignee}
                        onSelect={(key) => {
                          setFilterAssignee(String(key));
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilterAssignee('');
                          setPage(1);
                        }}
                        onApply={() => setOpenPopover(null)}
                      />
                    }
                  />
                  <DataTableHeaderCell
                    title="Created"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                  />
                  <DataTableHeaderCell
                    title="Action"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {safeTickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    style={{ backgroundColor: '#FFFFFF', cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontWeight: 600, color: '#2563EB', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontFamily: 'monospace' }}>{t.ticket_number}</td>
                    <td style={{ position: 'sticky', left: '120px', zIndex: 4, backgroundColor: 'inherit', width: '260px', minWidth: '260px', maxWidth: '260px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 500, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={t.subject}>{t.subject}</div>
                    </td>
                    <td style={{ width: '160px', minWidth: '160px', maxWidth: '160px', padding: '10px 14px', color: '#475467', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div className="cell-truncate-1" title={t.requester_name || '—'}>{t.requester_name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#98A2B3' }} className="cell-truncate-1">{t.department_name || ''}</div>
                    </td>
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', color: '#667085', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="cell-truncate-1" style={{ display: 'block' }}>{t.category_name || '—'}</span>
                    </td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <StatusBadge status={t.status} />
                        {t.is_overdue && <OverdueBadge />}
                      </div>
                    </td>
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {t.assigned_to_name ? (
                        <span style={{ color: '#172033', fontWeight: 500, display: 'block' }} className="cell-truncate-1" title={t.assigned_to_name}>{t.assigned_to_name}</span>
                      ) : (
                        <span style={{ color: '#EA580C', backgroundColor: '#FFEDD5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, border: '1px solid #FED7AA' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', color: '#667085', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontSize: '12px' }}>{formatDate(t.created_at)}</td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {isITAdmin ? (
                        <button
                          onClick={(e) => handleOpenAssignModal(t, e)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: t.assigned_to_name ? '#F5F7FA' : '#2563EB',
                            color: t.assigned_to_name ? '#475467' : '#FFFFFF',
                            border: '1px solid #E5E9F0',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {t.assigned_to_name ? 'Reassign' : 'Assign'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${t.id}`); }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#F5F7FA',
                            color: '#475467',
                            border: '1px solid #E5E9F0',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={loading}
          itemName="tickets"
        />

      </div>

      {/* ── Assign / Dispatch Modal ─────────────────────────────────────── */}
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
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E9F0' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>Assign Ticket</h3>
                <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>{assigningTicket.ticket_number}</span>
              </div>
              <button
                onClick={() => setAssigningTicket(null)}
                style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {assignError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEE2E2', color: '#B42318', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{assignError}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</div>
                <div style={{ fontSize: '14px', color: '#172033', fontWeight: 500 }}>{assigningTicket.subject}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#667085', display: 'block' }}>Requester</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>{assigningTicket.requester_name}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#667085', display: 'block' }}>Priority</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize', color: assigningTicket.priority === 'critical' ? '#DC2626' : '#172033' }}>
                    {assigningTicket.priority}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#172033', display: 'block', marginBottom: '6px' }}>
                  Assign To Technician
                </label>
                <select
                  value={selectedTechId}
                  onChange={e => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#172033' }}
                >
                  <option value="">-- Unassigned --</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.role.replace('_', ' ').toUpperCase()}) — {tech.open_tickets_count} open
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssigningTicket(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#F5F7FA', border: '1px solid #E5E9F0', borderRadius: '6px', fontSize: '13px', color: '#667085', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssign}
                  disabled={isAssigning}
                  style={{ padding: '8px 18px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#fff', fontWeight: 600, cursor: isAssigning ? 'not-allowed' : 'pointer' }}
                >
                  {isAssigning ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
