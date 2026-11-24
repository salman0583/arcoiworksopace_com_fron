import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, History, Filter } from 'lucide-react';
import { coreApi, AuditLogFilters } from '../../api/core';
import type { AuditLog } from '../../types';
import { Button, Input, LoadingSpinner, Card, PageHeader } from '../../components/ui';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTableHeaderCell, FilterPopover, ActiveFilterChips, TableTopBar } from '../../components/common/table';
import { formatDateTime } from '../../utils/formatters';
import { logger } from '../../utils/logger';

const PAGE_SIZE = 15;


function formatAuditTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function getActionBadgeStyle(action: string): React.CSSProperties {
  const lower = action.toLowerCase();
  if (lower.includes('created')) {
    return { backgroundColor: '#ECFDF3', color: '#065F46', border: '1px solid #D1FADF' };
  }
  if (lower.includes('assigned') || lower.includes('reassigned')) {
    return { backgroundColor: '#EFF6FF', color: '#175CD3', border: '1px solid #B2CCFF' };
  }
  if (lower.includes('unassigned') || lower.includes('deleted')) {
    return { backgroundColor: '#FEF2F2', color: '#B42318', border: '1px solid #FECDCA' };
  }
  if (lower.includes('resolved') || lower.includes('closed')) {
    return { backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #D1FADF' };
  }
  return { backgroundColor: '#F5F7FA', color: '#475467', border: '1px solid #E5E9F0' };
}

export const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Column Popover State
  const [openPopover, setOpenPopover] = useState<'action' | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AuditLogFilters = {
        page,
        page_size: PAGE_SIZE,
      };
      if (search) filters.search = search;
      if (filterAction) filters.action = filterAction;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;

      const data = await coreApi.getAuditLogs(filters);
      const results = Array.isArray(data?.results) ? data.results : [];
      setLogs(results);
      setTotalCount(data?.count ?? results.length);
    } catch (err: unknown) {
      logger.error('AuditLog', 'Failed to fetch audit logs', err);
      setError('Failed to fetch audit logs. You may not have administrative privileges.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterAction, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setOpenPopover(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="Append-only record of administrative actions, employee updates, and ticket lifecycle events."
      />

      {/* Sleek Compact Top Bar */}
      <TableTopBar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by actor, ticket, employee..."
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setPage(1);
        }}
        hasActiveFilters={Boolean(search || filterAction || startDate || endDate)}
        onResetFilters={handleResetFilters}
      />

      {/* Active Filter Chips Bar */}
      <ActiveFilterChips
        filters={[
          search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setPage(1); } } : null,
          filterAction ? { id: 'action', label: 'Action', value: filterAction, onRemove: () => { setFilterAction(''); setPage(1); } } : null,
          (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
        ].filter(Boolean) as any[]}
        onClearAll={handleResetFilters}
      />

      {/* Table Container */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
      >
        {error ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#FEE2E2' }}>
            <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>
              {error}
            </div>
            <Button variant="primary" size="sm" onClick={() => fetchLogs()} leftIcon={<RotateCcw size={14} />}>
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History size={28} color="#98A2B3" />}
            title="No audit records found"
            description={
              search || filterAction || startDate || endDate
                ? 'Try clearing your filters.'
                : 'Actions will appear here as team members manage tickets, assets, and operations.'
            }
            action={
              (search || filterAction || startDate || endDate) ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Audit Logs Table">
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Timestamp"
                    width="170px"
                    minWidth="170px"
                    maxWidth="170px"
                    isSticky
                    stickyLeft={0}
                  />
                  <DataTableHeaderCell
                    title="Actor"
                    width="200px"
                    minWidth="200px"
                    maxWidth="200px"
                    isSticky
                    stickyLeft="170px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Action"
                    width="170px"
                    minWidth="170px"
                    maxWidth="170px"
                    filterActive={Boolean(filterAction)}
                    filterOpen={openPopover === 'action'}
                    onFilterToggle={() => setOpenPopover(openPopover === 'action' ? null : 'action')}
                    filterTitle="Filter by Action"
                    filterPopover={
                      <FilterPopover
                        isOpen={openPopover === 'action'}
                        onClose={() => setOpenPopover(null)}
                        title="Filter: Action"
                        icon={<History size={13} color="#2563EB" />}
                        options={[
                          { key: '', label: 'All Actions' },
                          { key: 'Ticket Assigned', label: 'Ticket Assigned' },
                          { key: 'Ticket Reassigned', label: 'Ticket Reassigned' },
                          { key: 'Ticket Unassigned', label: 'Ticket Unassigned' },
                          { key: 'Ticket Status Changed', label: 'Ticket Status Changed' },
                          { key: 'Ticket Resolved', label: 'Ticket Resolved' },
                          { key: 'Ticket Closed', label: 'Ticket Closed' },
                          { key: 'Employee Created', label: 'Employee Created' },
                          { key: 'Employee Updated', label: 'Employee Updated' },
                        ]}
                        selectedKey={filterAction}
                        onSelect={(val) => {
                          setFilterAction(String(val));
                          setPage(1);
                        }}
                      />
                    }
                  />
                  <DataTableHeaderCell
                    title="Target"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                  />
                  <DataTableHeaderCell
                    title="Description"
                    width="300px"
                    minWidth="300px"
                    maxWidth="300px"
                  />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ backgroundColor: '#FFFFFF', transition: 'background-color 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '170px', minWidth: '170px', maxWidth: '170px', padding: '10px 14px', color: '#667085', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td style={{ position: 'sticky', left: '170px', zIndex: 4, backgroundColor: 'inherit', width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                      <div className="cell-truncate-1" style={{ fontWeight: 500, color: '#172033' }}>{log.actor_name || 'System'}</div>
                      {log.actor_email && <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#98A2B3' }}>{log.actor_email}</div>}
                    </td>
                    <td style={{ width: '170px', minWidth: '170px', maxWidth: '170px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          ...getActionBadgeStyle(log.action),
                        }}
                      >
                        <span className="cell-truncate-1" style={{ display: 'inline-block', maxWidth: '100%' }}>{log.action}</span>
                      </span>
                    </td>
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                      <span style={{ fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>{log.target_id || '—'}</span>
                      <span style={{ fontSize: '11px', color: '#98A2B3', display: 'block' }}>{log.target_type}</span>
                    </td>
                    <td style={{ width: '300px', minWidth: '300px', maxWidth: '300px', padding: '10px 14px', color: '#475467', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-2" title={log.description || undefined}>
                        {log.description || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / PAGE_SIZE) || 1}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={loading}
          itemName="events"
        />
      </div>
    </div>
  );

};
