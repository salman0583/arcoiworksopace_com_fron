import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, PlusCircle, Search, RotateCcw,
  Clock, CheckCircle2, Truck, AlertTriangle, CheckCheck,
  FileText, Award, Eye, X,
} from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import { useAuth } from '../../context/AuthContext';
import type {
  ProcurementRequestListItem,
  ProcurementStats,
} from '../../types/procurement';
import {
  ProcurementStatusBadge,
  RequestTypeBadge,
  ProcurementPriorityBadge,
} from '../../components/procurement/ProcurementBadges';
import { Button, LoadingSpinner, PageHeader, SegmentedControl } from '../../components/ui';
import { CreateProcurementModal } from './CreateProcurementModal';
import { QuotationComparisonModal } from '../../components/procurement/QuotationComparisonModal';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import {
  DataTableHeaderCell,
  ActiveFilterChips,
  ToolbarFilterPopover,
  filterFieldLabelStyle,
  filterFieldSelectStyle,
} from '../../components/common/table';
import { ProcurementDetailDrawer } from '../../components/procurement/ProcurementDetailDrawer';
import { formatCurrency, formatDate } from '../../utils/formatters';

type ProcurementViewTab = 'all' | 'pending_approval' | 'ordered' | 'completed';

export const ProcurementList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isITAdmin = user && ['it_admin', 'super_admin'].includes(user.role);

  const [requests, setRequests] = useState<ProcurementRequestListItem[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Primary View Tab
  const [viewTab, setViewTab] = useState<ProcurementViewTab>('all');

  // Applied Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Centralized Popover & Draft State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftType, setDraftType] = useState<string>('');
  const [draftPriority, setDraftPriority] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<string>('');

  // Modals / Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedProcurementId, setSelectedProcurementId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync URL query params on mount / back-forward navigation
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'submitted' || statusParam === 'pending_approval') {
      setViewTab('pending_approval');
      setStatusFilter(statusParam);
    } else if (statusParam === 'ordered') {
      setViewTab('ordered');
      setStatusFilter('ordered');
    } else if (statusParam === 'completed') {
      setViewTab('completed');
      setStatusFilter('completed');
    } else {
      setViewTab('all');
      setStatusFilter(statusParam || '');
    }
    setPage(1);
  }, [searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await procurementApi.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementApi.list({
        page,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        request_type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        date_from: startDate || undefined,
        date_to: endDate || undefined,
      });
      setRequests(res.results);
      setTotalCount(res.count);
      setTotalPages(Math.ceil(res.count / 20) || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, priorityFilter, startDate, endDate]);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests, fetchStats]);

  const handleTabChange = (tab: ProcurementViewTab) => {
    setViewTab(tab);
    setPage(1);
    if (tab === 'all') {
      setStatusFilter('');
      setSearchParams({});
    } else if (tab === 'pending_approval') {
      setStatusFilter('submitted');
      setSearchParams({ status: 'submitted' });
    } else if (tab === 'ordered') {
      setStatusFilter('ordered');
      setSearchParams({ status: 'ordered' });
    } else if (tab === 'completed') {
      setStatusFilter('completed');
      setSearchParams({ status: 'completed' });
    }
  };

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftType(typeFilter);
      setDraftPriority(priorityFilter);
      setDraftStatus(statusFilter);
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleApplyFilters = () => {
    setTypeFilter(draftType);
    setPriorityFilter(draftPriority);
    setStatusFilter(draftStatus);
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetPopoverFilters = () => {
    setDraftType('');
    setDraftPriority('');
    setDraftStatus('');
    setTypeFilter('');
    setPriorityFilter('');
    setStatusFilter('');
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setDraftType('');
    setDraftPriority('');
    setDraftStatus('');
    setStartDate('');
    setEndDate('');
    setViewTab('all');
    setSearchParams({});
    setPage(1);
  };

  const handleRowClick = (req: ProcurementRequestListItem) => {
    setSelectedProcurementId(req.id);
    setIsDrawerOpen(true);
  };

  const hasAdvancedFilters = Boolean(typeFilter || priorityFilter || statusFilter);
  const hasAnyFilters = Boolean(
    search.trim() ||
    hasAdvancedFilters ||
    startDate ||
    endDate ||
    viewTab !== 'all'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header */}
      <PageHeader
        title="Purchasing"
        description="Manage purchase requests, multi-vendor quotations, vendor selection, orders, and delivery tracking"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isITAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/procurement/quotation-comparison')}
                leftIcon={<Award size={15} />}
              >
                Compare Quotations
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<PlusCircle size={15} />}
            >
              Create Purchase Request
            </Button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
          }}
        >
          <SummaryFilterCard
            title="Pending Approval"
            count={stats.pending_approval}
            icon={<Clock size={16} />}
            isActive={statusFilter === 'submitted'}
            accentColor="#2563EB"
            onClick={() => {
              if (statusFilter === 'submitted') {
                setStatusFilter('');
                setViewTab('all');
              } else {
                setStatusFilter('submitted');
                setViewTab('pending_approval');
              }
              setPage(1);
            }}
          />

          <SummaryFilterCard
            title="Quotations Stage"
            count={stats.quotations_pending || 0}
            icon={<Award size={16} />}
            isActive={statusFilter === 'quotations_received'}
            accentColor="#7C3AED"
            onClick={() => {
              setStatusFilter(statusFilter === 'quotations_received' ? '' : 'quotations_received');
              setPage(1);
            }}
          />

          <SummaryFilterCard
            title="Approved"
            count={stats.approved}
            icon={<CheckCircle2 size={16} />}
            isActive={statusFilter === 'approved'}
            accentColor="#059669"
            onClick={() => {
              setStatusFilter(statusFilter === 'approved' ? '' : 'approved');
              setPage(1);
            }}
          />

          <SummaryFilterCard
            title="On Order"
            count={stats.ordered}
            icon={<Truck size={16} />}
            isActive={statusFilter === 'ordered'}
            accentColor="#0284C7"
            onClick={() => {
              if (statusFilter === 'ordered') {
                setStatusFilter('');
                setViewTab('all');
              } else {
                setStatusFilter('ordered');
                setViewTab('ordered');
              }
              setPage(1);
            }}
          />

          <SummaryFilterCard
            title="Partially Received"
            count={stats.partially_received}
            icon={<AlertTriangle size={16} />}
            isActive={statusFilter === 'partially_received'}
            accentColor="#EA580C"
            onClick={() => {
              setStatusFilter(statusFilter === 'partially_received' ? '' : 'partially_received');
              setPage(1);
            }}
          />

          <SummaryFilterCard
            title="Completed"
            count={stats.completed}
            icon={<CheckCheck size={16} />}
            isActive={statusFilter === 'completed'}
            accentColor="#047857"
            onClick={() => {
              if (statusFilter === 'completed') {
                setStatusFilter('');
                setViewTab('all');
              } else {
                setStatusFilter('completed');
                setViewTab('completed');
              }
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Primary View Tabs */}
      <SegmentedControl
        variant="tabs"
        value={viewTab}
        onChange={(val) => handleTabChange(val as ProcurementViewTab)}
        options={[
          { key: 'all', label: 'All Requests', count: totalCount },
          { key: 'pending_approval', label: 'Pending Approval', count: stats?.pending_approval },
          { key: 'ordered', label: 'On Order', count: stats?.ordered },
          { key: 'completed', label: 'Completed', count: stats?.completed },
        ]}
      />

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
        }}
      >
        {/* Left Controls: Global Search + Centralized Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 340px', maxWidth: '620px' }}>
          {/* Global Search Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#98A2B3',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search request ID, item, requester, PO #..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '32px',
                paddingRight: search ? '28px' : '10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: '#98A2B3',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Centralized Filters Popover */}
          <ToolbarFilterPopover
            isOpen={isFilterOpen}
            onToggle={handleToggleFilter}
            onClose={() => setIsFilterOpen(false)}
            activeCount={[Boolean(typeFilter), Boolean(priorityFilter), Boolean(statusFilter)].filter(Boolean).length}
            title="Filter Purchasing"
            hasFiltersToReset={Boolean(draftType || draftPriority || draftStatus || typeFilter || priorityFilter || statusFilter)}
            onReset={handleResetPopoverFilters}
            onApply={handleApplyFilters}
          >
            <div>
              <label style={filterFieldLabelStyle}>Request Type</label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Types</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="license">License</option>
                <option value="it_service">IT Service</option>
                <option value="network">Network</option>
                <option value="accessories">Accessories</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={filterFieldLabelStyle}>Priority</label>
              <select
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
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
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="quotations_received">Quotations Received</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="ordered">Order Placed</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </ToolbarFilterPopover>
        </div>

        {/* Right side: Date Filter & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setPage(1);
            }}
          />
          {hasAnyFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              style={{ fontSize: '12px', color: '#667085', height: '34px', padding: '0 8px' }}
            >
              Reset All
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasAnyFilters && (
        <ActiveFilterChips
          filters={[
            search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setPage(1); } } : null,
            statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setDraftStatus(''); setPage(1); } } : null,
            typeFilter ? { id: 'type', label: 'Type', value: typeFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setTypeFilter(''); setDraftType(''); setPage(1); } } : null,
            priorityFilter ? { id: 'priority', label: 'Priority', value: priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1), onRemove: () => { setPriorityFilter(''); setDraftPriority(''); setPage(1); } } : null,
            viewTab !== 'all' ? { id: 'tab', label: 'View', value: viewTab === 'pending_approval' ? 'Pending Approval' : viewTab === 'ordered' ? 'On Order' : 'Completed', onRemove: () => handleTabChange('all') } : null,
            (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
          ].filter(Boolean) as any[]}
          onClearAll={handleResetFilters}
        />
      )}

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={28} color="#98A2B3" />}
            title="No purchasing requests found"
            description={
              hasAnyFilters
                ? 'Try adjusting your search criteria or clearing your active filters.'
                : 'Get started by creating the first purchase request.'
            }
            action={
              hasAnyFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                  Create Request
                </Button>
              )
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Procurement Table">
            <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
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
                    title="Item & Type"
                    width="220px"
                    minWidth="200px"
                    isSticky
                    stickyLeft="120px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Requester"
                    width="140px"
                    minWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Quantity & Delivery"
                    width="130px"
                    minWidth="120px"
                  />
                  <DataTableHeaderCell
                    title="Supplier / Quotes"
                    width="140px"
                    minWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Budget / Cost"
                    width="120px"
                    minWidth="110px"
                    align="right"
                  />
                  <DataTableHeaderCell
                    title="Priority"
                    width="100px"
                    minWidth="90px"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="120px"
                    minWidth="110px"
                  />
                  <DataTableHeaderCell
                    title="Actions"
                    width="90px"
                    minWidth="80px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const estTotal = parseFloat(req.estimated_total_cost) || 0;
                  const actTotal = req.actual_total_cost ? parseFloat(req.actual_total_cost) : null;

                  return (
                    <tr
                      key={req.id}
                      onClick={() => handleRowClick(req)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Request ID (Sticky 1) */}
                      <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
                          {req.request_id}
                        </span>
                        {req.order_number && (
                          <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px', fontFamily: 'monospace' }} className="cell-truncate-1">
                            PO: {req.order_number}
                          </div>
                        )}
                      </td>

                      {/* Item & Type (Sticky 2) */}
                      <td style={{ position: 'sticky', left: '120px', zIndex: 4, backgroundColor: 'inherit', width: '220px', minWidth: '200px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={req.item_name}>
                          {req.item_name}
                        </div>
                        <div style={{ marginTop: '3px' }}>
                          <RequestTypeBadge type={req.request_type} />
                        </div>
                      </td>

                      {/* Requester & Dept */}
                      <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 500, color: '#475467' }} className="cell-truncate-1" title={req.requester_name}>{req.requester_name}</div>
                        <div style={{ fontSize: '11px', color: '#667085' }} className="cell-truncate-1">
                          {req.department_name || 'General IT'}
                        </div>
                      </td>

                      {/* Quantity & Delivery */}
                      <td style={{ width: '130px', minWidth: '120px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#172033' }}>
                            {req.received_quantity} / {req.quantity}
                          </span>
                          <span style={{ fontSize: '11px', color: '#667085' }}>rcvd</span>
                        </div>
                        {/* Mini progress bar */}
                        <div
                          style={{
                            width: '80px',
                            height: '4px',
                            backgroundColor: '#E5E9F0',
                            borderRadius: '2px',
                            marginTop: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.round((req.received_quantity / req.quantity) * 100))}%`,
                              height: '100%',
                              backgroundColor: req.received_quantity >= req.quantity ? '#10B981' : '#2563EB',
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                      </td>

                      {/* Supplier / Quotations */}
                      <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        {req.vendor_name ? (
                          <div style={{ fontWeight: 600, color: '#172033', maxWidth: '100%' }} className="cell-truncate-1" title={req.vendor_name}>
                            {req.vendor_name}
                          </div>
                        ) : (
                          <span style={{ color: '#98A2B3', fontSize: '12px' }}>TBD</span>
                        )}
                        <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                          {req.quotations_count > 0 ? (
                            <span style={{ color: '#0284C7', fontWeight: 600 }}>
                              {req.quotations_count} Quote{req.quotations_count > 1 ? 's' : ''}
                            </span>
                          ) : (
                            '0 Quotes'
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#172033' }}>
                          {formatCurrency(actTotal !== null ? actTotal : estTotal)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>
                          {actTotal !== null ? 'Actual' : 'Estimated'}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ width: '100px', minWidth: '90px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <ProcurementPriorityBadge priority={req.priority} />
                      </td>

                      {/* Status */}
                      <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <ProcurementStatusBadge status={req.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ width: '90px', minWidth: '80px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye size={13} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(req);
                          }}
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#175CD3',
                            border: '1px solid #B2CCFF',
                            fontWeight: 600,
                            padding: '3px 8px',
                            height: '28px',
                          }}
                        >
                          Track
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={20}
          onPageChange={setPage}
          isLoading={loading}
          itemName="requests"
        />
      </div>

      {/* Quotation Comparison Workspace (Main Page Entry & Multi-Request Comparison) */}
      <QuotationComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onSelectQuotationSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />

      {/* Create Modal */}
      <CreateProcurementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
          fetchStats();
        }}
      />

      {/* Detail Slide-Over Drawer */}
      <ProcurementDetailDrawer
        procurementId={selectedProcurementId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProcurementId(null);
        }}
        onUpdated={() => {
          fetchRequests();
          fetchStats();
        }}
      />
    </div>
  );
};
