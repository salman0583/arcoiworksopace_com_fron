import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/employees';
import { Employee, Department } from '../../types';
import { Button, Badge, LoadingSpinner, Avatar, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { canManageEmployees } from '../../utils/auth';
import {
  Search, PlusCircle, Users, RotateCcw,
  CheckCircle2, Building2, Calendar, X, ShieldCheck
} from 'lucide-react';
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
import { AddEmployeeModal } from '../../components/employees/AddEmployeeModal';
import { CreatedCredentialsModal, CreatedCredentials } from '../../components/employees/CreatedCredentialsModal';
import { Employee360Drawer } from '../../components/employees/Employee360Drawer';
import { AssetDetailDrawer } from '../../components/assets/AssetDetailDrawer';
import { ServiceDeskDetailDrawer } from '../../components/service-desk/ServiceDeskDetailDrawer';
import { ProcurementDetailDrawer } from '../../components/procurement/ProcurementDetailDrawer';
import type { ServiceDeskItem } from '../../types/serviceDesk';
import { logger } from '../../utils/logger';

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allManagers, setAllManagers] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    total: number;
    active: number;
    on_leave: number;
    departments: number;
  }>({ total: 0, active: 0, on_leave: 0, departments: 0 });

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const PAGE_SIZE = 10;
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Centralized Popover & Draft State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftDepartment, setDraftDepartment] = useState<number | ''>('');
  const [draftStatus, setDraftStatus] = useState<string>('');

  // Add Employee Modal & Credentials
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Drawers
  const [selected360EmployeeId, setSelected360EmployeeId] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [selectedServiceDeskItem, setSelectedServiceDeskItem] = useState<ServiceDeskItem | null>(null);
  const [selectedProcurementId, setSelectedProcurementId] = useState<number | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const [allRes, activeRes, onLeaveRes, deptsRes] = await Promise.all([
        employeesApi.list({ page_size: 1 }),
        employeesApi.list({ status: 'active', page_size: 1 }),
        employeesApi.list({ status: 'on_leave', page_size: 1 }),
        employeesApi.departments(),
      ]);
      setStats({
        total: allRes.count,
        active: activeRes.count,
        on_leave: onLeaveRes.count,
        departments: Array.isArray(deptsRes) ? deptsRes.length : 0,
      });
    } catch {
      // ignore
    }
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeesApi.list({
        search: search.trim() || undefined,
        department: department ? Number(department) : undefined,
        status: status || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      const results = Array.isArray(data?.results) ? data.results : [];
      setEmployees(results);
      const count = data?.count ?? results.length;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: unknown) {
      logger.error('Employees', 'Failed to fetch employees list', err);
      setError('Failed to fetch employees. Please check your connection or permissions.');
    } finally {
      setLoading(false);
    }
  }, [search, department, status, startDate, endDate, page]);

  const fetchDepartmentsAndManagers = async () => {
    try {
      const [deptsData, managersData] = await Promise.all([
        employeesApi.departments(),
        employeesApi.list({ page: 1 }),
      ]);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setAllManagers(Array.isArray(managersData?.results) ? managersData.results : []);
    } catch (err: unknown) {
      logger.error('Employees', 'Failed to load initial metadata', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDepartmentsAndManagers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftDepartment(department);
      setDraftStatus(status);
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleApplyFilters = () => {
    setDepartment(draftDepartment);
    setStatus(draftStatus);
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetPopoverFilters = () => {
    setDraftDepartment('');
    setDraftStatus('');
    setDepartment('');
    setStatus('');
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('');
    setStatus('');
    setDraftDepartment('');
    setDraftStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasAnyFilters = Boolean(search.trim() || department || status || startDate || endDate);

  const getRoleDisplayName = (role?: string | null) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'it_admin': return 'IT Admin';
      case 'it_support': return 'IT Support';
      case 'hr': return 'HR';
      default: return 'Employee';
    }
  };

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
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            animation: 'addEmpFadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Employee Directory"
        description="Enterprise workplace directory, department assignments, and portal access accounts"
        actions={
          user && canManageEmployees(user.role) ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle size={15} />}
              onClick={() => setShowAddModal(true)}
            >
              Add Employee
            </Button>
          ) : undefined
        }
      />

      {/* KPI Stats Cards — Responsive 4-Column Grid */}
      <div className="employee-summary-grid">
        <SummaryFilterCard
          title="Total Directory"
          count={stats.total}
          icon={<Users size={16} />}
          isActive={status === ''}
          accentColor="#2563EB"
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Active Employees"
          count={stats.active}
          icon={<CheckCircle2 size={16} />}
          isActive={status === 'active'}
          accentColor="#059669"
          onClick={() => {
            setStatus(status === 'active' ? '' : 'active');
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="On Leave"
          count={stats.on_leave}
          icon={<Calendar size={16} />}
          isActive={status === 'on_leave'}
          accentColor="#D97706"
          onClick={() => {
            setStatus(status === 'on_leave' ? '' : 'on_leave');
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Departments"
          count={stats.departments}
          icon={<Building2 size={16} />}
          accentColor="#4F46E5"
          isClickable={false}
        />
      </div>

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
              placeholder="Search by name, email, employee ID, job title..."
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
            activeCount={[Boolean(department), Boolean(status)].filter(Boolean).length}
            title="Filter Employees"
            hasFiltersToReset={Boolean(draftDepartment || draftStatus || department || status)}
            onReset={handleResetPopoverFilters}
            onApply={handleApplyFilters}
          >
            <div>
              <label style={filterFieldLabelStyle}>Department</label>
              <select
                value={draftDepartment}
                onChange={(e) => setDraftDepartment(e.target.value === '' ? '' : Number(e.target.value))}
                style={filterFieldSelectStyle}
              >
                <option value="">All Departments</option>
                {safeDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
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
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
                <option value="exited">Exited</option>
              </select>
            </div>
          </ToolbarFilterPopover>
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
            department && safeDepartments.find(d => d.id === department)?.name ? { id: 'dept', label: 'Department', value: safeDepartments.find(d => d.id === department)!.name, onRemove: () => { setDepartment(''); setDraftDepartment(''); setPage(1); } } : null,
            status ? { id: 'status', label: 'Status', value: status === 'on_leave' ? 'On Leave' : status.charAt(0).toUpperCase() + status.slice(1), onRemove: () => { setStatus(''); setDraftStatus(''); setPage(1); } } : null,
            (startDate || endDate) ? { id: 'date', label: 'Joining Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
          ].filter(Boolean) as any[]}
          onClearAll={handleResetFilters}
        />
      )}

      {/* Content Area: Table / Error / Loading / Empty */}
      {error ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#FEE2E2', borderRadius: '8px', border: '1px solid #FECDCA' }}>
          <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>
            {error}
          </div>
          <Button variant="primary" size="sm" onClick={() => fetchEmployees()} leftIcon={<RotateCcw size={14} />}>
            Try Again
          </Button>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : safeEmployees.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color="#98A2B3" />}
          title="No employees found"
          description="Try adjusting your keyword search or clearing active status and department filters."
          action={
            hasAnyFilters ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div className="employee-table-viewport" tabIndex={0} role="region" aria-label="Employees Table">
            <table className="employee-table">
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Employee"
                    width="240px"
                    minWidth="240px"
                    maxWidth="240px"
                    isSticky
                    stickyLeft={0}
                  />
                  <DataTableHeaderCell
                    title="ID"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                    isSticky
                    stickyLeft="240px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.04)' }}
                  />
                  <DataTableHeaderCell
                    title="Title & Dept"
                    width="220px"
                    minWidth="180px"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="110px"
                    minWidth="100px"
                  />
                  <DataTableHeaderCell
                    title="Portal Access"
                    width="180px"
                    minWidth="160px"
                  />
                  <DataTableHeaderCell
                    title="Action"
                    width="100px"
                    minWidth="90px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {safeEmployees.map((emp) => {
                  const statusLabel = emp.status ? emp.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelected360EmployeeId(emp.id)}
                    >
                      {/* Sticky Col 1: Avatar & Full Name */}
                      <td className="emp-col-sticky-1">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={emp.full_name || 'Employee'} size="sm" />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="cell-truncate-1" style={{ fontWeight: 600, color: '#172033', fontSize: '13px' }}>
                              {emp.full_name || 'Unnamed Employee'}
                            </div>
                            <div className="cell-truncate-1" style={{ fontSize: '12px', color: '#667085' }}>
                              {emp.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sticky Col 2: Employee ID */}
                      <td className="emp-col-sticky-2" style={{ color: '#475569', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {emp.employee_id || '—'}
                      </td>

                      {/* Col 3: Job Title & Department */}
                      <td style={{ width: '220px', minWidth: '180px' }}>
                        <div className="cell-truncate-2" style={{ color: '#172033', fontSize: '13px', fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word' }}>
                          {emp.job_title || '—'}
                        </div>
                        <div className="cell-truncate-1" style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                          {emp.department_name || '—'}
                        </div>
                      </td>

                      {/* Col 4: Employment Status Badge */}
                      <td style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                        <Badge variant={emp.status}>{statusLabel}</Badge>
                      </td>

                      {/* Col 5: Portal Access Badge */}
                      <td style={{ width: '190px', minWidth: '190px', maxWidth: '190px' }}>
                        {emp.has_user_account ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#ECFDF3',
                              color: '#059669',
                              border: '1px solid #D1FADF',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                            <span className="cell-truncate-1">
                              Active ({getRoleDisplayName(emp.user_role)})
                            </span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <span>No Login Account</span>
                          </span>
                        )}
                      </td>

                      {/* Col 6: Action Button */}
                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected360EmployeeId(emp.id);
                          }}
                        >
                          View 360
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            isLoading={loading}
            itemName="employees"
          />
        </div>
      )}

      {/* ── Dedicated Add Employee Modal ────────────────────────────────────── */}
      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(created, creds) => {
          if (creds) {
            setCreatedCredentials(creds);
          } else {
            setSuccessBanner(`Employee ${created.full_name} (${created.employee_id}) created successfully!`);
            setTimeout(() => setSuccessBanner(null), 5000);
          }
          fetchEmployees();
          fetchDepartmentsAndManagers();
          fetchStats();
        }}
        departments={safeDepartments}
        managers={allManagers}
      />

      {/* ── Dedicated Created Credentials Modal ─────────────────────────────── */}
      <CreatedCredentialsModal
        credentials={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
      />

      {/* ── Slide-Over Drawers ──────────────────────────────────────────────── */}
      <Employee360Drawer
        employeeId={selected360EmployeeId}
        isOpen={!!selected360EmployeeId}
        onClose={() => setSelected360EmployeeId(null)}
        onOpenAsset={(assetId) => setSelectedAssetId(assetId)}
        onOpenServiceDesk={(item) => setSelectedServiceDeskItem(item)}
        onOpenProcurement={(prId) => setSelectedProcurementId(prId)}
        onUpdated={fetchEmployees}
      />

      <AssetDetailDrawer
        assetId={selectedAssetId}
        isOpen={!!selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
        onOpenEmployee360={(empId) => setSelected360EmployeeId(empId)}
      />

      <ServiceDeskDetailDrawer
        item={selectedServiceDeskItem}
        isOpen={!!selectedServiceDeskItem}
        onClose={() => setSelectedServiceDeskItem(null)}
      />

      <ProcurementDetailDrawer
        procurementId={selectedProcurementId}
        isOpen={!!selectedProcurementId}
        onClose={() => setSelectedProcurementId(null)}
        onUpdated={fetchEmployees}
      />
    </div>
  );
};
