import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Ban,
  Eye,
  Receipt,
  RotateCw,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import type {
  ReimbursementListItem,
  ReimbursementStatus,
  ReimbursementFilters,
} from '../../types/expenses';
import { Button, PageHeader, SegmentedControl, LoadingSpinner } from '../../components/ui';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTableHeaderCell, ActiveFilterChips } from '../../components/common/table';
import { DigitalReimbursementModal } from './DigitalReimbursementModal';
import { ReimbursementDetailDrawer } from './ReimbursementDetailDrawer';

type ReimbursementTab = 'all' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';

export const ReimbursementsTab: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'it_support';

  const [items, setItems] = useState<ReimbursementListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<ReimbursementTab>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [myOnly, setMyOnly] = useState<boolean>(!isAdmin);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedReimbursementId, setSelectedReimbursementId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const fetchReimbursements = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: ReimbursementFilters = {
        page,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        my_only: myOnly ? true : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const res = await expensesApi.listReimbursements(params);
      setItems(res.results || []);
      setTotalCount(res.count || 0);
    } catch {
      setErrorMsg('Failed to fetch reimbursement forms.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, myOnly, startDate, endDate]);

  useEffect(() => {
    fetchReimbursements();
  }, [fetchReimbursements]);

  const handleTabChange = (tab: ReimbursementTab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'all') {
      setStatusFilter('');
    } else {
      setStatusFilter(tab);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setActiveTab('all');
    setStartDate('');
    setEndDate('');
    if (isAdmin) setMyOnly(false);
    setPage(1);
  };

  const handleOpenDetail = (id: number) => {
    setSelectedReimbursementId(id);
    setIsDrawerOpen(true);
  };

  const handleDownloadPdf = async (e: React.MouseEvent, id: number, num: string) => {
    e.stopPropagation();
    try {
      await expensesApi.downloadReimbursementPdf(id, num);
    } catch {
      alert('Failed to download PDF.');
    }
  };

  const getStatusPill = (status: ReimbursementStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'PAID':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={12} /> Paid
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Ban size={12} /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasAnyFilters = Boolean(
    search.trim() ||
    statusFilter ||
    (isAdmin && myOnly) ||
    startDate ||
    endDate ||
    activeTab !== 'all'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header */}
      <PageHeader
        title="Employee Reimbursements"
        description="Submit, approve, and track digital reimbursement forms matching company financial policies"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReimbursements()}
              leftIcon={<RotateCw size={14} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus size={15} />}
            >
              Fill Reimbursement Form
            </Button>
          </div>
        }
      />

      {/* Primary View Tabs */}
      <SegmentedControl
        variant="tabs"
        value={activeTab}
        onChange={(val) => handleTabChange(val as ReimbursementTab)}
        options={[
          { key: 'all', label: 'All Claims', count: activeTab === 'all' ? totalCount : undefined },
          { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'PAID', label: 'Paid' },
          { key: 'REJECTED', label: 'Rejected' },
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
        {/* Left Controls: Global Search + Scope View */}
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
              placeholder="Search by Employee, Voucher #, Purpose..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

          {/* Scope Selector for Admins */}
          {isAdmin && (
            <select
              value={myOnly ? 'my' : 'all'}
              onChange={(e) => {
                setMyOnly(e.target.value === 'my');
                setPage(1);
              }}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '12.5px',
                fontWeight: 500,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">View: All Claims</option>
              <option value="my">View: My Claims Only</option>
            </select>
          )}
        </div>

        {/* Right side controls: Date Filter & Reset */}
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
            statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setActiveTab('all'); setPage(1); } } : null,
            (isAdmin && myOnly) ? { id: 'scope', label: 'Scope', value: 'My Claims Only', onRemove: () => { setMyOnly(false); setPage(1); } } : null,
            (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
          ].filter(Boolean) as any[]}
          onClearAll={handleResetFilters}
        />
      )}

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#B42318' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{errorMsg}</p>
            <Button variant="secondary" size="sm" onClick={fetchReimbursements} style={{ marginTop: '12px' }}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileText size={36} color="#98A2B3" />}
            title="No Reimbursement Claims Found"
            description={
              hasAnyFilters
                ? 'No claims matched the selected search or filter criteria.'
                : 'You haven’t submitted any reimbursement claims yet.'
            }
            action={
              hasAnyFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                  Fill New Reimbursement Form
                </Button>
              )
            }
          />
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Reimbursements Table">
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Voucher #"
                    width="130px"
                    minWidth="120px"
                    isSticky
                    stickyLeft={0}
                  />
                  <DataTableHeaderCell
                    title="Employee"
                    width="160px"
                    minWidth="150px"
                    isSticky
                    stickyLeft="130px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Department"
                    width="150px"
                    minWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Date"
                    width="105px"
                    minWidth="95px"
                  />
                  <DataTableHeaderCell
                    title="Purpose"
                    minWidth="180px"
                  />
                  <DataTableHeaderCell
                    title="Total Claim"
                    width="120px"
                    minWidth="110px"
                    align="right"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="140px"
                    minWidth="130px"
                    align="center"
                  />
                  <DataTableHeaderCell
                    title="Receipt"
                    width="75px"
                    minWidth="65px"
                    align="center"
                  />
                  <DataTableHeaderCell
                    title="Actions"
                    width="85px"
                    minWidth="80px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => handleOpenDetail(it.id)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Voucher # (Sticky 1) */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '130px', minWidth: '120px', padding: '10px 14px', fontWeight: 600, color: '#3A7BE0', fontFamily: 'monospace', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {it.reimbursement_number}
                    </td>

                    {/* Employee (Sticky 2) */}
                    <td style={{ position: 'sticky', left: '130px', zIndex: 4, backgroundColor: 'inherit', width: '160px', minWidth: '150px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }} className="cell-truncate-1">{it.employee_name}</div>
                      {it.employee_id_code && (
                        <div style={{ fontSize: '11px', color: '#64748B' }} className="cell-truncate-1">{it.employee_id_code}</div>
                      )}
                    </td>

                    {/* Department */}
                    <td style={{ width: '150px', minWidth: '130px', padding: '10px 14px', color: '#334155', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="cell-truncate-1" style={{ display: 'block' }}>{it.department_name || '—'}</span>
                    </td>

                    {/* Date */}
                    <td style={{ width: '105px', minWidth: '95px', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {it.application_date}
                    </td>

                    {/* Purpose */}
                    <td style={{ minWidth: '180px', padding: '10px 14px', color: '#334155', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div className="cell-truncate-2" title={it.purpose} style={{ lineHeight: 1.35 }}>
                        {it.purpose}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{it.items_count} line item{it.items_count !== 1 ? 's' : ''}</div>
                    </td>

                    {/* Total Claim */}
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      ₹{parseFloat(it.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {getStatusPill(it.status)}
                    </td>

                    {/* Receipt */}
                    <td style={{ width: '75px', minWidth: '65px', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {it.has_receipt ? (
                        <span title="Receipt attached" style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center' }}>
                          <Receipt size={16} />
                        </span>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ width: '85px', minWidth: '80px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(e, it.id, it.reimbursement_number)}
                          title="Download PDF"
                          style={{
                            padding: '4px 7px',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            color: '#3A7BE0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Download size={13} />
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(it.id)}
                          leftIcon={<Eye size={13} />}
                          style={{ padding: '3px 8px', height: '28px', fontSize: '12px' }}
                        >
                          View
                        </Button>
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
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          isLoading={isLoading}
          itemName="claims"
        />
      </div>

      {/* CREATE DIGITAL REIMBURSEMENT FORM MODAL */}
      <DigitalReimbursementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          fetchReimbursements();
          setSelectedReimbursementId(created.id);
          setIsDrawerOpen(true);
        }}
      />

      {/* REIMBURSEMENT DETAIL DRAWER */}
      <ReimbursementDetailDrawer
        reimbursementId={selectedReimbursementId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedReimbursementId(null);
        }}
        onUpdated={() => {
          fetchReimbursements();
        }}
      />
    </div>
  );
};
