// frontend/src/pages/rewards/RewardProgramList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Gift,
  PlusCircle,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  Send,
  PackageCheck,
  ChevronRight,
  BarChart2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { rewardsApi } from '../../api/rewards';
import { useAuth } from '../../context/AuthContext';
import { isHROrAbove } from '../../utils/auth';
import type {
  EngagementProgramListItem,
  RewardStats,
  ProgramType,
  ProgramStatus,
} from '../../types/rewards';
import {
  ProgramStatusBadge,
  ProgramTypeBadge,
} from '../../components/rewards/RewardBadges';
import { Button, Input, LoadingSpinner, PageHeader } from '../../components/ui';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { DataTableHeaderCell, FilterPopover, ActiveFilterChips, TableTopBar } from '../../components/common/table';
import { formatDate } from '../../utils/formatters';
import { CreateProgramModal } from './CreateProgramModal';

const PAGE_SIZE = 10;

export const RewardProgramList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const canManage = user ? isHROrAbove(user.role) : false;

  const [programs, setPrograms] = useState<EngagementProgramListItem[]>([]);
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Column Filter Popover State
  const [openPopover, setOpenPopover] = useState<'type' | 'status' | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync URL query params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const filterParam = searchParams.get('filter');
    const typeParam = searchParams.get('type');
    if (filterParam) {
      setActiveCard(filterParam);
      setStatusFilter('');
    } else if (statusParam) {
      setStatusFilter(statusParam);
      setActiveCard(null);
    } else {
      setStatusFilter('');
      setActiveCard(null);
    }
    if (typeParam) setTypeFilter(typeParam);
  }, [searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await rewardsApi.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rewardsApi.listPrograms({
        page,
        search: search.trim() || undefined,
        program_type: typeFilter || undefined,
        status: statusFilter || undefined,
        filter_card: activeCard || undefined,
      });
      setPrograms(res.results || []);
      setTotalCount(res.count);
    } catch (err) {
      setError('Failed to load engagement programs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, activeCard]);

  useEffect(() => {
    fetchPrograms();
    fetchStats();
  }, [fetchPrograms, fetchStats]);

  const handleCardClick = (cardKey: string) => {
    if (activeCard === cardKey) {
      // Toggle off -> show all
      setActiveCard(null);
      setStatusFilter('');
      setSearchParams({});
    } else {
      setActiveCard(cardKey);
      setStatusFilter('');
      setSearchParams({ filter: cardKey });
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setActiveCard(null);
    setSearchParams({});
    setPage(1);
    setOpenPopover(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toast */}
      {successToast && (
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
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{successToast}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Rewards & Recognition"
        description="Track employee engagement programs, rewards, distribution and remaining stock"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/rewards/reports')}
              leftIcon={<BarChart2 size={15} />}
            >
              Reports
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<PlusCircle size={15} />}
              >
                New Program
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Interactive KPI Summary Cards */}
      <div className="rewards-summary-grid">
        <SummaryFilterCard
          title="Active Programs"
          count={stats?.active_programs ?? (loading ? '—' : 0)}
          icon={<Sparkles size={16} />}
          accentColor="#2563EB"
          subtext="In progress or partial"
          isActive={activeCard === 'active'}
          onClick={() => handleCardClick('active')}
        />

        <SummaryFilterCard
          title="Total Reward Items"
          count={stats?.total_items ?? (loading ? '—' : 0)}
          icon={<Layers size={16} />}
          accentColor="#7C3AED"
          subtext={`${stats?.total_units_received ?? 0} total units`}
          isActive={activeCard === 'items'}
          onClick={() => handleCardClick('items')}
        />

        <SummaryFilterCard
          title="Distributed Units"
          count={stats?.total_units_distributed ?? (loading ? '—' : 0)}
          icon={<Send size={16} />}
          accentColor="#D97706"
          subtext="Awarded to employees"
          isActive={activeCard === 'distributed'}
          onClick={() => handleCardClick('distributed')}
        />

        <SummaryFilterCard
          title="Remaining in Stock"
          count={stats?.total_units_remaining ?? (loading ? '—' : 0)}
          icon={<PackageCheck size={16} />}
          accentColor="#059669"
          subtext="Available stock"
          isActive={activeCard === 'stock'}
          onClick={() => handleCardClick('stock')}
        />
      </div>

      {/* Sleek Compact Top Bar */}
      <TableTopBar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search programs by name, description..."
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setPage(1);
        }}
        hasActiveFilters={Boolean(search || typeFilter || statusFilter || startDate || endDate || activeCard)}
        onResetFilters={handleResetFilters}
      />

      {/* Active Filter Chips Bar */}
      <ActiveFilterChips
        filters={[
          search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setPage(1); } } : null,
          activeCard ? { id: 'card', label: 'KPI Filter', value: activeCard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setActiveCard(null); setSearchParams({}); setPage(1); } } : null,
          typeFilter ? { id: 'type', label: 'Type', value: typeFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setTypeFilter(''); setPage(1); } } : null,
          statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setSearchParams({}); setPage(1); } } : null,
          (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
        ].filter(Boolean) as any[]}
        onClearAll={handleResetFilters}
      />

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
        <div className="rewards-table-viewport" tabIndex={0} role="region" aria-label="Rewards Table">
          <table className="rewards-table" style={{ width: '100%', minWidth: '1010px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr>
                <DataTableHeaderCell
                  title="Program"
                  width="220px"
                  minWidth="220px"
                  maxWidth="220px"
                  isSticky
                  stickyLeft={0}
                />
                <DataTableHeaderCell
                  title="Type"
                  width="150px"
                  minWidth="150px"
                  maxWidth="150px"
                  isSticky
                  stickyLeft="220px"
                  style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  filterActive={Boolean(typeFilter)}
                  filterOpen={openPopover === 'type'}
                  onFilterToggle={() => setOpenPopover(openPopover === 'type' ? null : 'type')}
                  filterTitle="Filter by Type"
                  filterPopover={
                    <FilterPopover
                      isOpen={openPopover === 'type'}
                      onClose={() => setOpenPopover(null)}
                      title="Filter: Program Type"
                      icon={<Gift size={13} color="#2563EB" />}
                      options={[
                        { key: '', label: 'All Program Types' },
                        { key: 'appreciation', label: 'Appreciation Day' },
                        { key: 'recognition', label: 'Recognition' },
                        { key: 'performance', label: 'Performance Award' },
                        { key: 'festival', label: 'Festival & Holiday' },
                        { key: 'company_event', label: 'Company Event' },
                        { key: 'engagement', label: 'Engagement' },
                        { key: 'other', label: 'Other' },
                      ]}
                      selectedKey={typeFilter}
                      onSelect={(val) => {
                        setTypeFilter(String(val));
                        setPage(1);
                      }}
                    />
                  }
                />
                <DataTableHeaderCell
                  title="Date"
                  width="110px"
                  minWidth="110px"
                  maxWidth="110px"
                />
                <DataTableHeaderCell
                  title="Items"
                  width="90px"
                  minWidth="90px"
                  maxWidth="90px"
                  align="center"
                />
                <DataTableHeaderCell
                  title="Distributed"
                  width="100px"
                  minWidth="100px"
                  maxWidth="100px"
                  align="right"
                />
                <DataTableHeaderCell
                  title="Remaining"
                  width="100px"
                  minWidth="100px"
                  maxWidth="100px"
                  align="right"
                />
                <DataTableHeaderCell
                  title="Status"
                  width="140px"
                  minWidth="140px"
                  maxWidth="140px"
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
                        { key: 'planned', label: 'Planned' },
                        { key: 'active', label: 'Active' },
                        { key: 'partially_distributed', label: 'Partially Distributed' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'cancelled', label: 'Cancelled' },
                      ]}
                      selectedKey={statusFilter}
                      onSelect={(val) => {
                        const str = String(val);
                        setStatusFilter(str);
                        setActiveCard(str || null);
                        if (str) setSearchParams({ status: str });
                        else setSearchParams({});
                        setPage(1);
                      }}
                    />
                  }
                />
                <DataTableHeaderCell
                  title="Actions"
                  width="100px"
                  minWidth="100px"
                  maxWidth="100px"
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px', textAlign: 'center' }}>
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#EF4444' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{error}</div>
                    <Button variant="secondary" size="sm" onClick={fetchPrograms} style={{ marginTop: '12px' }}>
                      Try Again
                    </Button>
                  </td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px' }}>
                    <EmptyState
                      title="No Engagement Programs Found"
                      description={
                        search || typeFilter || statusFilter
                          ? 'No programs match the selected filter criteria.'
                          : 'Plan your first employee engagement program, appreciation event, or recognition reward.'
                      }
                      action={
                        canManage && !search && !typeFilter && !statusFilter ? (
                          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                            Create Program
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                programs.map((program) => (
                  <tr
                    key={program.id}
                    onClick={() => navigate(`/rewards/${program.id}`)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Program ID & Name */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-2" style={{ fontSize: '13px', fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {program.program_name}
                      </div>
                      <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#667085', marginTop: '2px', fontFamily: 'monospace' }}>
                        {program.program_id}
                      </div>
                    </td>

                    {/* Program Type */}
                    <td style={{ position: 'sticky', left: '220px', zIndex: 4, backgroundColor: 'inherit', width: '150px', minWidth: '150px', maxWidth: '150px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                      <ProgramTypeBadge type={program.program_type} />
                    </td>

                    {/* Date */}
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', fontSize: '13px', color: '#475467', borderBottom: '1px solid #E5E9F0' }}>
                      {formatDate(program.program_date)}
                    </td>

                    {/* Items Count */}
                    <td style={{ width: '90px', minWidth: '90px', maxWidth: '90px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#172033', textAlign: 'center', borderBottom: '1px solid #E5E9F0' }}>
                      {program.total_items_count}
                    </td>

                    {/* Distributed Units */}
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#D97706', textAlign: 'right', borderBottom: '1px solid #E5E9F0' }}>
                      {program.total_quantity_distributed}
                      <span style={{ fontSize: '11px', color: '#667085', fontWeight: 400, marginLeft: '4px' }}>
                        / {program.total_quantity_received}
                      </span>
                    </td>

                    {/* Remaining Units */}
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: program.total_quantity_remaining > 0 ? '#059669' : '#667085',
                        }}
                      >
                        {program.total_quantity_remaining}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      <ProgramStatusBadge status={program.status} />
                    </td>

                    {/* Actions */}
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rewards/${program.id}`);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        View Details
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div style={{ borderTop: '1px solid #E5E9F0' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              itemName="programs"
            />
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      <CreateProgramModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newPrg) => {
          showToast(`Created program "${newPrg.program_name}".`);
          fetchPrograms();
          fetchStats();
          navigate(`/rewards/${newPrg.id}`);
        }}
      />
    </div>
  );
};
