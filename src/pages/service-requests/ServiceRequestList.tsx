import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  ArrowRight,
  User,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTableHeaderCell, FilterPopover, ActiveFilterChips, TableTopBar } from '../../components/common/table';
import { formatDate } from '../../utils/formatters';
import { CreateServiceRequestModal } from './CreateServiceRequestModal';
import { serviceRequestsApi } from '../../api/serviceRequests';
import { ServiceRequest, ServiceRequestStats } from '../../types/serviceRequests';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';

const PAGE_SIZE = 20;


export const ServiceRequestList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const isITSupport = user?.role === 'it_support';
  const isITAdmin = user ? ['it_admin', 'super_admin'].includes(user.role) : false;
  const isITStaff = isITSupport || isITAdmin;


  // State initialization derived synchronously from URL search params
  const getInitialStatus = () => searchParams.get('status') || '';
  const getInitialType = () => searchParams.get('request_type') || '';
  const getInitialPriority = () => searchParams.get('priority') || '';
  const getInitialOverdue = () => searchParams.get('overdue') === 'true';
  const getInitialCard = () => {
    const s = searchParams.get('status');
    const o = searchParams.get('overdue') === 'true';
    if (o) return 'overdue';
    if (s === 'pending_approval') return 'pending_approval';
    if (s === 'submitted') return 'submitted';
    if (s === 'in_progress') return 'in_progress';
    if (s === 'waiting_for_user') return 'waiting_for_user';
    if (s === 'completed') return 'completed';
    return 'all';
  };

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<ServiceRequestStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(getInitialStatus);
  const [typeFilter, setTypeFilter] = useState(getInitialType);
  const [priorityFilter, setPriorityFilter] = useState(getInitialPriority);
  const [overdueFilter, setOverdueFilter] = useState(getInitialOverdue);
  const [activeCard, setActiveCard] = useState<string | null>(getInitialCard);

  // Column Filter Popover State
  const [openPopover, setOpenPopover] = useState<'type' | 'priority' | 'status' | null>(null);

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync URL search parameters on navigation
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const overdueParam = searchParams.get('overdue') === 'true';
    const typeParam = searchParams.get('request_type');
    const priorityParam = searchParams.get('priority');

    setStatusFilter(statusParam || '');
    setOverdueFilter(overdueParam);
    setTypeFilter(typeParam || '');
    setPriorityFilter(priorityParam || '');

    if (overdueParam) {
      setActiveCard('overdue');
    } else if (statusParam === 'pending_approval') {
      setActiveCard('pending_approval');
    } else if (statusParam === 'submitted') {
      setActiveCard('submitted');
    } else if (statusParam === 'in_progress') {
      setActiveCard('in_progress');
    } else if (statusParam === 'waiting_for_user') {
      setActiveCard('waiting_for_user');
    } else if (statusParam === 'completed') {
      setActiveCard('completed');
    } else {
      setActiveCard('all');
    }
    setPage(1);
  }, [searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await serviceRequestsApi.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await serviceRequestsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        request_type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        overdue: overdueFilter || undefined,
      });
      setRequests(res.results);
      setTotalCount(res.count);
      setTotalPages(Math.ceil(res.count / PAGE_SIZE) || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, priorityFilter, overdueFilter]);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setOverdueFilter(false);
    setActiveCard('all');
    setSearchParams({});
    setPage(1);
    setOpenPopover(null);
  };

  const handleCardClick = (cardKey: string, statusVal?: string, isOverdue = false) => {
    if (activeCard === cardKey) {
      // Toggle off to all
      setActiveCard('all');
      setStatusFilter('');
      setOverdueFilter(false);
      setSearchParams({});
    } else {
      setActiveCard(cardKey);
      if (isOverdue) {
        setOverdueFilter(true);
        setStatusFilter('');
        setSearchParams({ overdue: 'true' });
      } else {
        setOverdueFilter(false);
        setStatusFilter(statusVal || '');
        setSearchParams(statusVal ? { status: statusVal } : {});
      }
    }
    setPage(1);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'submitted':
        return <Badge variant="primary">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'waiting_for_user':
        return <Badge variant="warning">Waiting for User</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  const getPriorityBadge = (p: string) => {
    const config: Record<string, { bg: string; color: string; border: string; label: string; dot?: boolean }> = {
      urgent: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Urgent', dot: true },
      critical: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Critical', dot: true },
      high: { bg: '#FFF7ED', color: '#9A3412', border: '#FFEDD5', label: 'High' },
      medium: { bg: '#EFF6FF', color: '#1E40AF', border: '#B2CCFF', label: 'Medium' },
      low: { bg: '#F8FAFC', color: '#475569', border: '#E5E9F0', label: 'Low' },
    };
    const c = config[p] || config.low;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1.3,
          backgroundColor: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {c.dot && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#DC2626',
              display: 'inline-block',
            }}
          />
        )}
        {c.label}
      </span>
    );
  };


  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={26} color="#172033" />
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172033', margin: 0 }}>
              {isEmployee
                ? 'My Service Requests'
                : isITSupport
                  ? 'Service Requests'
                  : 'Service Request Management'}
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#667085', margin: '4px 0 0 0' }}>
            {isEmployee
              ? 'Track and manage your IT service and equipment requests'
              : isITSupport
                ? 'Work on, update progress, and fulfill assigned service requests'
                : 'Review, approve, assign, and manage employee service requests across departments'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle size={16} />}
          >
            New Service Request
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <SummaryFilterCard
            title="Total Requests"
            count={stats.total}
            icon={<ClipboardList size={18} />}
            isActive={activeCard === 'all'}
            accentColor="#2563EB"
            onClick={() => handleCardClick('all')}
          />

          <SummaryFilterCard
            title="Pending Approval"
            count={stats.pending_approval}
            icon={<Clock size={18} />}
            isActive={activeCard === 'pending_approval'}
            accentColor="#D97706"
            onClick={() => handleCardClick('pending_approval', 'pending_approval')}
          />

          <SummaryFilterCard
            title="Submitted"
            count={stats.submitted}
            icon={<Inbox size={18} />}
            isActive={activeCard === 'submitted'}
            accentColor="#0284C7"
            onClick={() => handleCardClick('submitted', 'submitted')}
          />

          <SummaryFilterCard
            title="In Progress"
            count={stats.in_progress}
            icon={<Layers size={18} />}
            isActive={activeCard === 'in_progress'}
            accentColor="#2563EB"
            onClick={() => handleCardClick('in_progress', 'in_progress')}
          />

          <SummaryFilterCard
            title="Waiting for User"
            count={stats.waiting_for_user}
            icon={<User size={18} />}
            isActive={activeCard === 'waiting_for_user'}
            accentColor="#E11D48"
            onClick={() => handleCardClick('waiting_for_user', 'waiting_for_user')}
          />

          <SummaryFilterCard
            title="Completed"
            count={stats.completed}
            icon={<CheckCheck size={18} />}
            isActive={activeCard === 'completed'}
            accentColor="#059669"
            onClick={() => handleCardClick('completed', 'completed')}
          />

          <SummaryFilterCard
            title="Overdue"
            count={stats.overdue}
            icon={<AlertTriangle size={18} />}
            isActive={activeCard === 'overdue'}
            accentColor="#DC2626"
            onClick={() => handleCardClick('overdue', undefined, true)}
          />
        </div>
      )}

      {/* Sleek Compact Top Bar */}
      <TableTopBar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by ID, subject, requester..."
        showDateFilter={false}
        hasActiveFilters={Boolean(search || statusFilter || typeFilter || priorityFilter || overdueFilter || activeCard !== 'all')}
        onResetFilters={handleResetFilters}
      />

      {/* Active Filter Chips Bar */}
      <ActiveFilterChips
        filters={[
          search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setPage(1); } } : null,
          activeCard && activeCard !== 'all' ? { id: 'card', label: 'KPI Filter', value: activeCard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setActiveCard('all'); setStatusFilter(''); setOverdueFilter(false); setSearchParams({}); setPage(1); } } : null,
          typeFilter ? { id: 'type', label: 'Type', value: typeFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setTypeFilter(''); setSearchParams({}); setPage(1); } } : null,
          priorityFilter ? { id: 'priority', label: 'Priority', value: priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1), onRemove: () => { setPriorityFilter(''); setPage(1); } } : null,
          statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setSearchParams({}); setPage(1); } } : null,
          overdueFilter ? { id: 'overdue', label: 'Filter', value: 'Overdue Only', onRemove: () => { setOverdueFilter(false); setSearchParams({}); setPage(1); } } : null,
        ].filter(Boolean) as any[]}
        onClearAll={handleResetFilters}
      />

      {/* Table Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} color="#98A2B3" />}
            title="No service requests found"
            description={
              search || statusFilter || typeFilter || priorityFilter || overdueFilter
                ? 'Try adjusting your search criteria or resetting filters.'
                : isEmployee
                  ? 'You have not submitted any service requests yet.'
                  : 'No service requests exist in the system.'
            }
            action={
              (search || statusFilter || typeFilter || priorityFilter || overdueFilter || activeCard !== 'all') ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<PlusCircle size={15} />}
                >
                  Create First Request
                </Button>
              )
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Service Requests Table">
          <table style={{ width: '100%', minWidth: '1060px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr>
                <DataTableHeaderCell
                  title="Request ID"
                  width="120px"
                  minWidth="120px"
                  maxWidth="120px"
                  isSticky
                  stickyLeft={0}
                />
                <DataTableHeaderCell
                  title="Requester"
                  width="150px"
                  minWidth="140px"
                  maxWidth="150px"
                  isSticky
                  stickyLeft="120px"
                  style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                />
                <DataTableHeaderCell
                  title="Type"
                  width="130px"
                  minWidth="120px"
                  filterActive={Boolean(typeFilter)}
                  filterOpen={openPopover === 'type'}
                  onFilterToggle={() => setOpenPopover(openPopover === 'type' ? null : 'type')}
                  filterTitle="Filter by Request Type"
                  filterPopover={
                    <FilterPopover
                      isOpen={openPopover === 'type'}
                      onClose={() => setOpenPopover(null)}
                      title="Filter: Request Type"
                      icon={<ClipboardList size={13} color="#2563EB" />}
                      options={[
                        { key: '', label: 'All Request Types' },
                        { key: 'software_access', label: 'Software Access' },
                        { key: 'hardware_request', label: 'Hardware Request' },
                        { key: 'access_request', label: 'Access Request' },
                        { key: 'vpn_request', label: 'VPN Request' },
                        { key: 'account_permission', label: 'Account / Permission' },
                        { key: 'equipment_replacement', label: 'Equipment Replacement' },
                        { key: 'new_equipment', label: 'New Equipment' },
                        { key: 'peripheral_request', label: 'Peripheral Request' },
                        { key: 'it_service', label: 'IT Service' },
                        { key: 'other', label: 'Other' },
                      ]}
                      selectedKey={typeFilter}
                      onSelect={(val) => {
                        const str = String(val);
                        setTypeFilter(str);
                        setSearchParams(str ? { request_type: str } : {});
                        setPage(1);
                      }}
                    />
                  }
                />
                <DataTableHeaderCell
                  title="Subject"
                  width="220px"
                  minWidth="180px"
                />
                <DataTableHeaderCell
                  title="Priority"
                  width="95px"
                  minWidth="90px"
                  filterActive={Boolean(priorityFilter)}
                  filterOpen={openPopover === 'priority'}
                  onFilterToggle={() => setOpenPopover(openPopover === 'priority' ? null : 'priority')}
                  filterTitle="Filter by Priority"
                  filterPopover={
                    <FilterPopover
                      isOpen={openPopover === 'priority'}
                      onClose={() => setOpenPopover(null)}
                      title="Filter: Priority"
                      icon={<AlertTriangle size={13} color="#2563EB" />}
                      options={[
                        { key: '', label: 'All Priorities' },
                        { key: 'urgent', label: 'Urgent' },
                        { key: 'high', label: 'High' },
                        { key: 'medium', label: 'Medium' },
                        { key: 'low', label: 'Low' },
                      ]}
                      selectedKey={priorityFilter}
                      onSelect={(val) => {
                        setPriorityFilter(String(val));
                        setPage(1);
                      }}
                    />
                  }
                />
                <DataTableHeaderCell
                  title="Status"
                  width="120px"
                  minWidth="110px"
                  filterActive={Boolean(statusFilter)}
                  filterOpen={openPopover === 'status'}
                  onFilterToggle={() => setOpenPopover(openPopover === 'status' ? null : 'status')}
                  filterTitle="Filter by Status"
                  filterPopover={
                    <FilterPopover
                      isOpen={openPopover === 'status'}
                      onClose={() => setOpenPopover(null)}
                      title="Filter: Status"
                      icon={<CheckCircle2 size={13} color="#2563EB" />}
                      options={[
                        { key: '', label: 'All Statuses' },
                        { key: 'submitted', label: 'Submitted' },
                        { key: 'pending_approval', label: 'Pending Approval' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'waiting_for_user', label: 'Waiting for User' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'cancelled', label: 'Cancelled' },
                        { key: 'rejected', label: 'Rejected' },
                      ]}
                      selectedKey={statusFilter}
                      onSelect={(val) => {
                        const str = String(val);
                        setStatusFilter(str);
                        setActiveCard(str || 'all');
                        if (str) setSearchParams({ status: str });
                        else setSearchParams({});
                        setPage(1);
                      }}
                    />
                  }
                />
                <DataTableHeaderCell
                  title="Assigned To"
                  width="130px"
                  minWidth="120px"
                />
                <DataTableHeaderCell
                  title="Required By"
                  width="100px"
                  minWidth="90px"
                />
                <DataTableHeaderCell
                  title="Created"
                  width="100px"
                  minWidth="90px"
                />
                <DataTableHeaderCell
                  title="Action"
                  width="80px"
                  minWidth="75px"
                  align="right"
                />
              </tr>
            </thead>
              <tbody>
                {requests.map(sr => (
                  <tr
                    key={sr.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    onClick={() => navigate(`/service-requests/${sr.request_id || sr.id}`)}
                  >
                    {/* Request ID */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      <Link
                        to={`/service-requests/${sr.request_id || sr.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ color: '#2563EB', textDecoration: 'none', fontFamily: 'monospace' }}
                      >
                        {sr.request_id}
                      </Link>
                    </td>

                    {/* Requester */}
                    <td style={{ position: 'sticky', left: '120px', zIndex: 4, backgroundColor: 'inherit', width: '150px', minWidth: '140px', maxWidth: '150px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                      <div className="cell-truncate-1" style={{ fontWeight: 600, color: '#172033' }}>{sr.requester_name || sr.requester.email}</div>
                      <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#667085' }}>{sr.department_name || 'No Dept'}</div>
                    </td>

                    {/* Type */}
                    <td style={{ width: '130px', minWidth: '120px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      <span
                        style={{
                          backgroundColor: '#F5F7FA',
                          color: '#475467',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          display: 'inline-block',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span className="cell-truncate-1" style={{ display: 'inline-block', maxWidth: '100%' }}>{sr.request_type_display}</span>
                      </span>
                    </td>

                    {/* Subject */}
                    <td style={{ width: '220px', minWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-2" style={{ fontWeight: 500, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {sr.subject}
                      </div>
                      {sr.business_justification && (
                        <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                          {sr.business_justification}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ width: '95px', minWidth: '90px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      {getPriorityBadge(sr.priority)}
                    </td>

                    {/* Status */}
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      {getStatusBadge(sr.status)}
                    </td>

                    {/* Assigned To */}
                    <td style={{ width: '130px', minWidth: '120px', padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569', borderBottom: '1px solid #E5E9F0' }}>
                      {sr.assigned_to_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', maxWidth: '100%' }}>
                          <User size={13} color="#667085" style={{ flexShrink: 0 }} />
                          <span className="cell-truncate-1">{sr.assigned_to_name}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#98A2B3', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Required By */}
                    <td style={{ width: '100px', minWidth: '90px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      {sr.required_by_date ? (
                        <span style={{ color: sr.is_overdue ? '#DC2626' : '#475569', fontWeight: sr.is_overdue ? 600 : 400 }}>
                          {formatDate(sr.required_by_date)}
                          {sr.is_overdue && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#DC2626', fontWeight: 700 }}>
                              OVERDUE
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: '#98A2B3' }}>—</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td style={{ width: '100px', minWidth: '90px', padding: '10px 14px', whiteSpace: 'nowrap', color: '#667085', fontSize: '12px', borderBottom: '1px solid #E5E9F0' }}>
                      {formatDate(sr.created_at)}
                    </td>

                    {/* Action */}
                    <td style={{ width: '80px', minWidth: '75px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/service-requests/${sr.request_id || sr.id}`);
                        }}
                        style={{ padding: '4px 8px' }}
                      >
                        View <ArrowRight size={14} />
                      </Button>
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
          itemName="requests"
        />
      </div>


      {/* Modal */}
      <CreateServiceRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />
    </div>
  );
};
