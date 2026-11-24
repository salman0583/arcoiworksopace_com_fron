import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  User,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Flame,
  UserCheck,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button, LoadingSpinner, PageHeader, SegmentedControl } from '../../components/ui';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import {
  DataTableHeaderCell,
  ActiveFilterChips,
  ToolbarFilterPopover,
  filterFieldLabelStyle,
  filterFieldSelectStyle,
} from '../../components/common/table';
import {
  ServiceDeskTypeBadge,
  ServiceDeskPriorityBadge,
  ServiceDeskStatusBadge,
} from '../../components/service-desk/ServiceDeskBadges';
import { ServiceDeskDetailDrawer } from '../../components/service-desk/ServiceDeskDetailDrawer';
import { CreateRequestModal } from '../../components/service-desk/CreateRequestModal';
import { getTickets } from '../../api/tickets';
import { serviceRequestsApi } from '../../api/serviceRequests';
import type {
  ServiceDeskItem,
  ServiceDeskType,
  ServiceDeskStats,
} from '../../types/serviceDesk';
import type { TicketListItem } from '../../types/tickets';
import type { ServiceRequest } from '../../types/serviceRequests';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import { formatDate, formatRelativeTime } from '../../utils/formatters';

const PAGE_SIZE = 15;

type TabMode = 'all' | 'unassigned' | 'my_work';

export const ServiceDeskList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isEmployee = user?.role === 'employee';
  const isITSupport = user?.role === 'it_support';
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;
  const isITStaff = isITSupport || isITAdmin;

  // URL state helpers
  const initialType = (searchParams.get('type') as 'all' | 'incident' | 'service_request') || 'all';
  const initialTab = (searchParams.get('tab') as TabMode) || 'all';
  const initialStatus = searchParams.get('status') || '';
  const initialPriority = searchParams.get('priority') || '';
  const initialOverdue = searchParams.get('overdue') === 'true';

  // Component state
  const [typeFilter, setTypeFilter] = useState<'all' | 'incident' | 'service_request'>(initialType);
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [draftPriority, setDraftPriority] = useState(initialPriority);
  const [draftStatus, setDraftStatus] = useState(initialStatus);
  const [overdueFilter, setOverdueFilter] = useState(initialOverdue);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Column / Toolbar Popover Filter State
  const [openPopover, setOpenPopover] = useState<'filters' | null>(null);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data collections
  const [allTickets, setAllTickets] = useState<TicketListItem[]>([]);
  const [allServiceRequests, setAllServiceRequests] = useState<ServiceRequest[]>([]);

  // Drawer and Modal states
  const [selectedItem, setSelectedItem] = useState<ServiceDeskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active KPI card
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Sync URL search parameters on navigation / back-forward
  useEffect(() => {
    const typeParam = searchParams.get('type') as 'all' | 'incident' | 'service_request' | null;
    const tabParam = searchParams.get('tab') as TabMode | null;
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const overdueParam = searchParams.get('overdue');
    const activeOnlyParam = searchParams.get('active_only');
    const resolvedMonthParam = searchParams.get('resolved_month');

    // 1. Tab / Queue
    if (tabParam === 'unassigned') {
      setActiveTab('unassigned');
    } else if (tabParam === 'my_work') {
      setActiveTab('my_work');
    } else {
      setActiveTab('all');
    }

    // 2. Type Filter
    if (typeParam === 'incident') {
      setTypeFilter('incident');
    } else if (typeParam === 'service_request') {
      setTypeFilter('service_request');
    } else {
      setTypeFilter('all');
    }

    // 3. Priority Filter
    if (priorityParam) {
      setPriorityFilter(priorityParam);
    } else {
      setPriorityFilter('');
    }

    // 4. Overdue Filter
    if (overdueParam === 'true') {
      setOverdueFilter(true);
    } else {
      setOverdueFilter(false);
    }

    // 5. Status Filter & Active KPI Card Highlighting
    if (activeOnlyParam === 'true' || statusParam === 'open_active') {
      setStatusFilter('open_active');
      setActiveCard('open');
    } else if (statusParam === 'open') {
      setStatusFilter('open');
      setActiveCard('open');
    } else if (statusParam === 'in_progress') {
      setStatusFilter('in_progress');
      setActiveCard('open');
    } else if (statusParam === 'waiting' || statusParam === 'waiting_for_user' || statusParam === 'pending_approval') {
      setStatusFilter(statusParam);
      setActiveCard('waiting');
    } else if (statusParam === 'resolved' || resolvedMonthParam === 'true') {
      setStatusFilter('resolved');
      setActiveCard('resolved');
    } else if (statusParam) {
      setStatusFilter(statusParam);
      setActiveCard(null);
    } else {
      setStatusFilter('');
      if (overdueParam === 'true') {
        setActiveCard('overdue');
      } else if (typeParam === 'incident') {
        setActiveCard('incidents');
      } else if (typeParam === 'service_request') {
        setActiveCard('service_requests');
      } else if (tabParam === 'unassigned' || tabParam === 'my_work' || priorityParam) {
        setActiveCard(null);
      } else {
        setActiveCard('all');
      }
    }

    setPage(1);
  }, [searchParams]);

  // Handle Search input debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load both tickets and service requests
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, srRes] = await Promise.all([
        getTickets({ page_size: 100, ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) }),
        serviceRequestsApi.list({ page_size: 100, ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) }),
      ]);

      setAllTickets(ticketsRes.data.results || []);
      setAllServiceRequests(srRes.results || []);
    } catch (err: any) {
      setError('Failed to load Service Desk items. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert both records into unified ServiceDeskItem shape
  const unifiedItems: ServiceDeskItem[] = useMemo(() => {
    const list: ServiceDeskItem[] = [];

    // Map Incidents (Tickets)
    allTickets.forEach((t) => {
      list.push({
        id: t.id,
        rawId: t.id,
        request_id: t.ticket_number || `IT-${t.id}`,
        type: 'incident',
        subject: t.subject,
        description: '',
        priority: t.priority,
        status: t.status,
        requester_name: t.requester_name || 'Unknown',
        requester_email: t.requester_email || '',
        department_name: t.department_name || null,
        category_name: t.category_name || 'General',
        assigned_to_name: t.assigned_to_name || null,
        assigned_to_id: t.assigned_to_id || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
        due_date: t.due_date,
        is_overdue: Boolean(t.is_overdue),
        rawTicket: t,
      });
    });

    // Map Service Requests
    allServiceRequests.forEach((sr) => {
      list.push({
        id: sr.id,
        rawId: sr.id,
        request_id: sr.request_id || `SR-${sr.id}`,
        type: 'service_request',
        subject: sr.subject,
        description: sr.description || '',
        priority: sr.priority,
        status: sr.status,
        requester_name: sr.requester_name || (sr.requester ? sr.requester.full_name : 'Unknown'),
        requester_email: sr.requester_email || (sr.requester ? sr.requester.email : ''),
        department_name: sr.department_name || (sr.department ? sr.department.name : null),
        category_name:
          sr.request_type_display ||
          (sr.request_type
            ? sr.request_type
                .split('_')
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ')
            : 'Service Request'),
        assigned_to_name: sr.assigned_to_name || (sr.assigned_to ? sr.assigned_to.full_name : null),
        assigned_to_id: sr.assigned_to ? sr.assigned_to.id : null,
        created_at: sr.created_at,
        updated_at: sr.updated_at,
        due_date: sr.required_by_date || null,
        is_overdue: Boolean(sr.is_overdue),
        rawServiceRequest: sr,
      });
    });

    // Sort descending by created_at
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allTickets, allServiceRequests]);

  // Compute stats across all items
  const stats: ServiceDeskStats = useMemo(() => {
    let incidents = 0;
    let serviceRequests = 0;
    let open = 0;
    let inProgress = 0;
    let waiting = 0;
    let resolved = 0;
    let overdue = 0;

    unifiedItems.forEach((item) => {
      if (item.type === 'incident') incidents++;
      else serviceRequests++;

      const st = item.status.toLowerCase();
      if (['new', 'open', 'submitted'].includes(st)) open++;
      else if (['in_progress', 'under_review'].includes(st)) inProgress++;
      else if (['waiting_for_user', 'waiting_for_vendor', 'pending_approval'].includes(st)) waiting++;
      else if (['resolved', 'closed', 'completed'].includes(st)) resolved++;

      if (item.is_overdue) overdue++;
    });

    return {
      total: unifiedItems.length,
      incidents_count: incidents,
      service_requests_count: serviceRequests,
      open_count: open,
      in_progress_count: inProgress,
      waiting_count: waiting,
      resolved_count: resolved,
      overdue_count: overdue,
    };
  }, [unifiedItems]);

  // Filter items based on user selection
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Type Filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Tab Filter (for IT Staff)
      if (activeTab === 'unassigned') {
        if (item.assigned_to_id !== null && item.assigned_to_id !== undefined) return false;
      } else if (activeTab === 'my_work') {
        if (!user || item.assigned_to_id !== user.id) return false;
      }

      // Status Filter
      if (statusFilter) {
        const st = item.status.toLowerCase();
        if (statusFilter === 'open_active') {
          if (['resolved', 'closed', 'completed', 'cancelled', 'rejected'].includes(st)) {
            return false;
          }
        } else if (statusFilter === 'open') {
          if (!['new', 'open', 'submitted'].includes(st)) {
            return false;
          }
        } else if (statusFilter === 'in_progress') {
          if (!['in_progress', 'under_review'].includes(st)) {
            return false;
          }
        } else if (statusFilter === 'waiting') {
          if (!['waiting_for_user', 'waiting_for_vendor', 'pending_approval'].includes(st)) {
            return false;
          }
        } else if (statusFilter === 'resolved') {
          if (!['resolved', 'closed', 'completed'].includes(st)) {
            return false;
          }
        } else if (st !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Priority Filter
      if (priorityFilter && item.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Overdue Filter
      if (overdueFilter && !item.is_overdue) {
        return false;
      }

      // Date Range Filter
      if (startDate) {
        const itemDate = item.created_at ? item.created_at.slice(0, 10) : '';
        if (itemDate && itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = item.created_at ? item.created_at.slice(0, 10) : '';
        if (itemDate && itemDate > endDate) return false;
      }

      // Search Query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchId = item.request_id.toLowerCase().includes(q);
        const matchSubject = item.subject.toLowerCase().includes(q);
        const matchDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        const matchRequester = item.requester_name.toLowerCase().includes(q);
        const matchEmail = item.requester_email.toLowerCase().includes(q);
        const matchAssignee = item.assigned_to_name ? item.assigned_to_name.toLowerCase().includes(q) : false;
        if (!matchId && !matchSubject && !matchDesc && !matchRequester && !matchEmail && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [
    unifiedItems,
    typeFilter,
    activeTab,
    statusFilter,
    priorityFilter,
    overdueFilter,
    startDate,
    endDate,
    debouncedSearch,
    user,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  // Open drawer for an item
  const handleOpenDetail = (item: ServiceDeskItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  // Reset filters
  const handleResetFilters = () => {
    setTypeFilter('all');
    setActiveTab('all');
    setStatusFilter('');
    setPriorityFilter('');
    setDraftPriority('');
    setDraftStatus('');
    setOverdueFilter(false);
    setSearchQuery('');
    setDebouncedSearch('');
    setStartDate('');
    setEndDate('');
    setActiveCard(null);
    setPage(1);
    setSearchParams({});
  };

  // Card filter click handlers
  const handleCardClick = (cardKey: string) => {
    setPage(1);
    if (activeCard === cardKey) {
      setActiveCard(null);
      setTypeFilter('all');
      setStatusFilter('');
      setOverdueFilter(false);
      return;
    }

    setActiveCard(cardKey);
    switch (cardKey) {
      case 'all':
        setTypeFilter('all');
        setStatusFilter('');
        setOverdueFilter(false);
        break;
      case 'incidents':
        setTypeFilter('incident');
        setStatusFilter('');
        setOverdueFilter(false);
        break;
      case 'service_requests':
        setTypeFilter('service_request');
        setStatusFilter('');
        setOverdueFilter(false);
        break;
      case 'open':
        setTypeFilter('all');
        setStatusFilter('open_active');
        setOverdueFilter(false);
        break;
      case 'waiting':
        setTypeFilter('all');
        setStatusFilter('waiting');
        setOverdueFilter(false);
        break;
      case 'resolved':
        setTypeFilter('all');
        setStatusFilter('resolved');
        setOverdueFilter(false);
        break;
      case 'overdue':
        setTypeFilter('all');
        setStatusFilter('');
        setOverdueFilter(true);
        break;
      default:
        break;
    }
  };

  // Callback when item updated in drawer or modal
  const handleItemUpdated = () => {
    fetchData();
  };

  const handleItemCreated = (newId: string) => {
    fetchData().then(() => {
      setTimeout(() => {
        const found = unifiedItems.find((i) => i.request_id === newId);
        if (found) {
          setSelectedItem(found);
          setIsDrawerOpen(true);
        }
      }, 600);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <PageHeader
        title="IT Service Desk"
        description="Unified incident resolution & workplace service fulfillment"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle size={15} />}
          >
            New Request
          </Button>
        }
      />

      {/* ── KPI SUMMARY CARDS ────────────────────────────────────────────── */}
      <div className="service-desk-summary-grid">
        <SummaryFilterCard
          title="Total Requests"
          count={stats.total}
          icon={<Layers size={16} />}
          accentColor="#475467"
          isActive={activeCard === 'all'}
          onClick={() => handleCardClick('all')}
        />
        <SummaryFilterCard
          title="Incidents"
          count={stats.incidents_count}
          icon={<AlertCircle size={16} />}
          accentColor="#475467"
          isActive={activeCard === 'incidents'}
          onClick={() => handleCardClick('incidents')}
        />
        <SummaryFilterCard
          title="Service Requests"
          count={stats.service_requests_count}
          icon={<FileText size={16} />}
          accentColor="#475467"
          isActive={activeCard === 'service_requests'}
          onClick={() => handleCardClick('service_requests')}
        />
        <SummaryFilterCard
          title="Open / Active"
          count={stats.open_count + stats.in_progress_count}
          icon={<Inbox size={16} />}
          accentColor="#2563EB"
          isActive={activeCard === 'open'}
          onClick={() => handleCardClick('open')}
        />
        <SummaryFilterCard
          title="Waiting / Pending"
          count={stats.waiting_count}
          icon={<Clock size={16} />}
          accentColor="#D97706"
          isActive={activeCard === 'waiting'}
          onClick={() => handleCardClick('waiting')}
        />
        <SummaryFilterCard
          title="Resolved"
          count={stats.resolved_count}
          icon={<CheckCircle2 size={16} />}
          accentColor="#059669"
          isActive={activeCard === 'resolved'}
          onClick={() => handleCardClick('resolved')}
        />
        <SummaryFilterCard
          title="Overdue"
          count={stats.overdue_count}
          icon={<Flame size={16} />}
          accentColor="#DC2626"
          isActive={activeCard === 'overdue'}
          onClick={() => handleCardClick('overdue')}
        />
      </div>

      {/* ── PRIMARY VIEW TABS ────────────────────────────────────────────── */}
      <SegmentedControl
        variant="tabs"
        value={typeFilter}
        onChange={(val) => {
          const nextType = val as typeof typeFilter;
          setTypeFilter(nextType);
          setPage(1);
          if (nextType === 'incident') {
            setActiveCard('incidents');
            setSearchParams({ type: 'incident' });
          } else if (nextType === 'service_request') {
            setActiveCard('service_requests');
            setSearchParams({ type: 'service_request' });
          } else {
            setActiveCard('all');
            setSearchParams({});
          }
        }}
        options={[
          { key: 'all', label: 'All Requests', count: stats.total },
          { key: 'incident', label: 'Incidents', count: stats.incidents_count },
          { key: 'service_request', label: 'Service Requests', count: stats.service_requests_count },
        ]}
      />

      {/* ── FILTER & QUEUE CONTROLS ───────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Controls: Search + Queue View + Filters + Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {/* Search Input (280-320px) */}
            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDebouncedSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by ID, subject, requester..."
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: searchQuery ? '28px' : '10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* IT Staff Queue View Dropdown */}
            {isITStaff && (
              <div style={{ position: 'relative' }}>
                <select
                  value={activeTab}
                  onChange={(e) => { setActiveTab(e.target.value as TabMode); setPage(1); }}
                  aria-label="Filter Queue View"
                  style={{
                    height: '34px',
                    padding: '0 28px 0 10px',
                    borderRadius: '6px',
                    border: activeTab !== 'all' ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                    backgroundColor: activeTab !== 'all' ? '#EFF6FF' : '#FFFFFF',
                    color: activeTab !== 'all' ? '#1D4ED8' : '#334155',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '14px',
                  }}
                >
                  <option value="all">View: Global Queue</option>
                  <option value="unassigned">View: Unassigned</option>
                  <option value="my_work">View: Assigned to Me</option>
                </select>
              </div>
            )}

            {/* Centralized Filters Button with Popover */}
            <ToolbarFilterPopover
              isOpen={openPopover === 'filters'}
              onToggle={() => {
                if (openPopover === 'filters') {
                  setOpenPopover(null);
                } else {
                  setDraftPriority(priorityFilter);
                  setDraftStatus(statusFilter);
                  setOpenPopover('filters');
                }
              }}
              onClose={() => setOpenPopover(null)}
              activeCount={[Boolean(priorityFilter), Boolean(statusFilter)].filter(Boolean).length}
              title="Filter Requests"
              hasFiltersToReset={Boolean(draftPriority || draftStatus || priorityFilter || statusFilter)}
              onReset={() => {
                setDraftPriority('');
                setDraftStatus('');
                setPriorityFilter('');
                setStatusFilter('');
                setPage(1);
                setOpenPopover(null);
              }}
              onApply={() => {
                setPriorityFilter(draftPriority);
                setStatusFilter(draftStatus);
                setPage(1);
                setOpenPopover(null);
              }}
            >
              <div>
                <label style={filterFieldLabelStyle}>Priority</label>
                <select
                  value={draftPriority}
                  onChange={(e) => setDraftPriority(e.target.value)}
                  style={filterFieldSelectStyle}
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical / Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label style={filterFieldLabelStyle}>Status</label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  style={filterFieldSelectStyle}
                >
                  <option value="">All Statuses</option>
                  <option value="open_active">All Open / Active</option>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting">Waiting / Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </ToolbarFilterPopover>

            {/* Reset Filters button if any filters applied */}
            {Boolean(searchQuery || typeFilter !== 'all' || activeTab !== 'all' || statusFilter || priorityFilter || overdueFilter || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw size={12} />}
                style={{ height: '34px', fontSize: '12px', color: '#64748B' }}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Right Controls: Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(Boolean(searchQuery || typeFilter !== 'all' || activeTab !== 'all' || statusFilter || priorityFilter || overdueFilter || startDate || endDate)) && (
          <ActiveFilterChips
            filters={[
              searchQuery.trim() ? { id: 'search', label: 'Search', value: `"${searchQuery.trim()}"`, onRemove: () => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); } } : null,
              typeFilter !== 'all' ? { id: 'type', label: 'Type', value: typeFilter === 'incident' ? 'Incident' : 'Service Request', onRemove: () => { setTypeFilter('all'); setPage(1); } } : null,
              activeTab !== 'all' ? { id: 'queue', label: 'View', value: activeTab === 'unassigned' ? 'Unassigned' : 'Assigned to Me', onRemove: () => { setActiveTab('all'); setPage(1); } } : null,
              priorityFilter ? { id: 'priority', label: 'Priority', value: priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1), onRemove: () => { setPriorityFilter(''); setDraftPriority(''); setPage(1); } } : null,
              statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setDraftStatus(''); setPage(1); } } : null,
              overdueFilter ? { id: 'overdue', label: 'Filter', value: 'Overdue', onRemove: () => { setOverdueFilter(false); setPage(1); } } : null,
              (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
            ].filter(Boolean) as any[]}
            onClearAll={handleResetFilters}
          />
        )}
      </div>

      {/* ── CONSOLIDATED TABLE ────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          overflow: 'visible',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
            <AlertCircle size={32} style={{ marginBottom: '8px' }} />
            <p>{error}</p>
            <Button size="sm" variant="secondary" onClick={fetchData} style={{ marginTop: '12px' }}>
              Retry
            </Button>
          </div>
        ) : paginatedItems.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} color="#2563EB" />}
            title="No Service Desk requests found"
            description={
              searchQuery || statusFilter || priorityFilter || typeFilter !== 'all' || startDate || endDate
                ? 'No requests match your current filters. Try resetting the search filters.'
                : 'No incidents or service requests currently logged in the system.'
            }
            action={
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <PlusCircle size={14} />
                Create your first request
              </button>
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Service Desk Table">
            <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Request ID"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                    isSticky
                    stickyLeft={0}
                    style={{ borderRight: '1px solid #E5E9F0' }}
                  />
                  <DataTableHeaderCell
                    title="Type"
                    width="160px"
                    minWidth="160px"
                    maxWidth="160px"
                  />
                  <DataTableHeaderCell
                    title="Subject / Summary"
                    minWidth="240px"
                    style={{ paddingLeft: '16px' }}
                  />
                  <DataTableHeaderCell
                    title="Requester"
                    width="150px"
                    minWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Category / Type"
                    width="140px"
                    minWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Priority"
                    width="100px"
                    minWidth="100px"
                    maxWidth="100px"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="125px"
                    minWidth="125px"
                    maxWidth="125px"
                  />
                  <DataTableHeaderCell
                    title="Assigned To"
                    width="135px"
                    minWidth="135px"
                    maxWidth="135px"
                  />
                  <DataTableHeaderCell
                    title="Created"
                    width="100px"
                    minWidth="100px"
                    maxWidth="100px"
                  />
                  <DataTableHeaderCell
                    title="Action"
                    width="90px"
                    minWidth="90px"
                    maxWidth="90px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleOpenDetail(item)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      color: '#172033',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* 1. Request ID (Sticky 1) */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: '#0F172A',
                          fontSize: '13px',
                        }}
                      >
                        {item.request_id}
                      </span>
                    </td>

                    {/* 2. Type Badge */}
                    <td style={{ width: '160px', minWidth: '160px', maxWidth: '160px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <ServiceDeskTypeBadge type={item.type} size="sm" />
                    </td>

                    {/* 3. Subject */}
                    <td style={{ minWidth: '240px', padding: '10px 14px 10px 16px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0F172A',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                        className="cell-truncate-2"
                        title={item.subject}
                      >
                        {item.subject}
                      </div>
                      {item.description && item.description.trim() ? (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748B',
                            marginTop: '2px',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                          }}
                          className="cell-truncate-1"
                        >
                          {item.description.trim()}
                        </div>
                      ) : null}
                    </td>

                    {/* 4. Requester */}
                    <td style={{ width: '150px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 500, color: '#172033' }} className="cell-truncate-1" title={item.requester_name}>
                        {item.requester_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#667085' }} className="cell-truncate-1">
                        {item.department_name || item.requester_email}
                      </div>
                    </td>

                    {/* 5. Category */}
                    <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }} className="cell-truncate-1">
                        {item.category_name}
                      </span>
                    </td>

                    {/* 6. Priority */}
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <ServiceDeskPriorityBadge priority={item.priority} size="sm" />
                    </td>

                    {/* 7. Status */}
                    <td style={{ width: '125px', minWidth: '125px', maxWidth: '125px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <ServiceDeskStatusBadge status={item.status} size="sm" />
                    </td>

                    {/* 8. Assignee */}
                    <td style={{ width: '135px', minWidth: '135px', maxWidth: '135px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {item.assigned_to_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#475467' }} className="cell-truncate-1" title={item.assigned_to_name}>
                            {item.assigned_to_name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#98A2B3', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                      )}
                    </td>

                    {/* 9. Created */}
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '12px', color: '#667085', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {formatRelativeTime(item.created_at)}
                    </td>

                    {/* 10. Track Action Button */}
                    <td style={{ width: '90px', minWidth: '90px', maxWidth: '90px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item);
                        }}
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #B2CCFF',
                          color: '#175CD3',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(29,78,216,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#DBEAFE';
                          e.currentTarget.style.borderColor = '#93C5FD';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#B2CCFF';
                        }}
                      >
                        <Eye size={13} />
                        <span>Track</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION BAR ──────────────────────────────────────────────── */}
        {!loading && filteredItems.length > PAGE_SIZE && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #E5E9F0' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              itemName="requests"
            />
          </div>
        )}
      </div>

      {/* ── ENTERPRISE DETAIL DRAWER ──────────────────────────────────────── */}
      <ServiceDeskDetailDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleItemUpdated}
      />

      {/* ── CREATE REQUEST MODAL ──────────────────────────────────────────── */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(createdItem) => handleItemCreated(createdItem.request_id)}
      />
    </div>
  );
};
