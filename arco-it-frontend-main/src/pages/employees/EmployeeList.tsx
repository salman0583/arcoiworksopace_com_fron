import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/employees';
import { Employee, Department } from '../../types';
import { Button, Input, PasswordInput, Badge, LoadingSpinner, Avatar, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { canManageEmployees } from '../../utils/auth';
import {
  Search, PlusCircle, Filter, Users,
  RotateCcw, CheckCircle2, Building2, Calendar,
  X, AlertCircle, Key, ShieldCheck, Copy, Check, Info
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
import { Employee360Drawer } from '../../components/employees/Employee360Drawer';
import { AssetDetailDrawer } from '../../components/assets/AssetDetailDrawer';
import { ServiceDeskDetailDrawer } from '../../components/service-desk/ServiceDeskDetailDrawer';
import { ProcurementDetailDrawer } from '../../components/procurement/ProcurementDetailDrawer';
import type { ServiceDeskItem } from '../../types/serviceDesk';
import { logger } from '../../utils/logger';


interface AddEmployeeForm {
  employee_id: string;
  full_name: string;
  email: string;
  department_id: number | '';
  job_title: string;
  manager_id: number | '';
  location: string;
  joining_date: string;
  status: 'active' | 'on_leave' | 'inactive' | 'exited';
  create_user_account: boolean;
  temp_password: string;
}

interface CreatedCredentials {
  employee_id: string;
  full_name: string;
  email: string;
  temporary_password?: string;
  role?: string;
}

const initialForm: AddEmployeeForm = {
  employee_id: '',
  full_name: '',
  email: '',
  department_id: '',
  job_title: '',
  manager_id: '',
  location: 'Hyderabad, Telangana, India',
  joining_date: new Date().toISOString().split('T')[0],
  status: 'active',
  create_user_account: true,
  temp_password: '',
};

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

  // Add Employee Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddEmployeeForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Created Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<'password' | 'email' | 'url' | null>(null);

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
        search,
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

  const handleOpenAddModal = () => {
    setAddForm(initialForm);
    setFieldErrors({});
    setModalError(null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFieldErrors({});
    setModalError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addForm.employee_id.trim()) {
      errors.employee_id = 'Employee ID is required (e.g. EMP016)';
    }
    if (!addForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    if (!addForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!addForm.department_id) {
      errors.department_id = 'Please select a department';
    }
    if (!addForm.job_title.trim()) {
      errors.job_title = 'Job title is required';
    }
    if (!addForm.joining_date) {
      errors.joining_date = 'Joining date is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Employee> & Record<string, unknown> = {
        employee_id: addForm.employee_id.trim().toUpperCase(),
        full_name: addForm.full_name.trim(),
        email: addForm.email.trim().toLowerCase(),
        department_id: Number(addForm.department_id),
        job_title: addForm.job_title.trim(),
        manager_id: addForm.manager_id ? Number(addForm.manager_id) : null,
        location: addForm.location.trim() || 'Dubai, UAE',
        joining_date: addForm.joining_date,
        status: addForm.status,
        create_user_account: addForm.create_user_account,
        ...(addForm.create_user_account && addForm.temp_password.trim() ? { temp_password: addForm.temp_password.trim() } : {}),
      };

      const created = await employeesApi.create(payload);
      logger.info('Employees', `Successfully created employee ${created.employee_id}`);
      setShowAddModal(false);

      if (created.generated_password || (addForm.create_user_account && addForm.temp_password)) {
        setCreatedCredentials({
          employee_id: created.employee_id,
          full_name: created.full_name,
          email: created.email,
          temporary_password: created.generated_password || addForm.temp_password,
          role: created.user_role || 'Employee',
        });
      } else {
        setSuccessBanner(`Employee ${created.full_name} (${created.employee_id}) created successfully!`);
        setTimeout(() => setSuccessBanner(null), 5000);
      }

      fetchEmployees();
      fetchDepartmentsAndManagers();
      fetchStats();
    } catch (err: unknown) {
      const errorResp = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (errorResp && typeof errorResp === 'object') {
        const newFieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(errorResp)) {
          if (Array.isArray(val)) {
            newFieldErrors[key] = val[0];
          } else if (typeof val === 'string') {
            newFieldErrors[key] = val;
          }
        }
        setFieldErrors(newFieldErrors);
        if (errorResp.detail) {
          setModalError(String(errorResp.detail));
        } else {
          setModalError('Please review and correct the highlighted fields.');
        }
      } else {
        setModalError('Failed to create employee. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Success Notification Banner */}
      {successBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ECFDF3',
            color: '#065F46',
            border: '1px solid #D1FADF',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{successBanner}</span>
        </div>
      )}

      <PageHeader
        title="Employee Directory"
        description="Manage company employee profiles and department assignments"
        actions={
          user && canManageEmployees(user.role) ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle size={15} />}
              onClick={handleOpenAddModal}
            >
              Add Employee
            </Button>
          ) : undefined
        }
      />

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
        }}
      >
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
            (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
          ].filter(Boolean) as any[]}
          onClearAll={handleResetFilters}
        />
      )}

      {error ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: '#FEE2E2', borderRadius: '8px', border: '1px solid #FECDCA' }}>
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
          description="Try adjusting your search criteria or clearing active filters."
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
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)', overflow: 'visible' }}>
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Employees Table">
            <table style={{ width: '100%', minWidth: '990px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
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
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Title & Dept"
                    width="220px"
                    minWidth="220px"
                    maxWidth="220px"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                  />
                  <DataTableHeaderCell
                    title="Portal Access"
                    width="190px"
                    minWidth="190px"
                    maxWidth="190px"
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
                {safeEmployees.map((emp) => {
                  const statusLabel = emp.status ? emp.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelected360EmployeeId(emp.id)}
                      style={{ backgroundColor: '#FFFFFF', transition: 'background-color 0.15s', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '240px', minWidth: '240px', maxWidth: '240px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={emp.full_name || 'Employee'} size="sm" />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="cell-truncate-1" style={{ fontWeight: 500, color: '#172033', fontSize: '13px' }}>{emp.full_name || 'Unnamed Employee'}</div>
                            <div className="cell-truncate-1" style={{ fontSize: '12px', color: '#667085' }}>{emp.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ position: 'sticky', left: '240px', zIndex: 4, backgroundColor: 'inherit', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', color: '#475569', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>{emp.employee_id || '—'}</td>
                      <td style={{ width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                        <div className="cell-truncate-2" style={{ color: '#172033', fontSize: '13px', fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word' }}>{emp.job_title || '—'}</div>
                        <div className="cell-truncate-1" style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>{emp.department_name || '—'}</div>
                      </td>
                      <td style={{ width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                        <Badge variant={emp.status}>{statusLabel}</Badge>
                      </td>
                      <td style={{ width: '190px', minWidth: '190px', maxWidth: '190px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                        {emp.has_user_account ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 8px',
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
                            <ShieldCheck size={12} style={{ flexShrink: 0 }} />
                            <span className="cell-truncate-1">Active ({emp.user_role === 'super_admin' ? 'Super Admin' : emp.user_role === 'it_admin' ? 'IT Admin' : emp.user_role === 'it_support' ? 'IT Support' : 'Employee'})</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: '#F5F7FA',
                              color: '#667085',
                              border: '1px solid #E5E9F0',
                            }}
                          >
                            <span>No Login Account</span>
                          </span>
                        )}
                      </td>
                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0' }}>
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

      {/* ── Add Employee Modal ────────────────────────────────────────────── */}
      {showAddModal && (
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
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E5E9F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #E5E9F0',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', margin: 0 }}>Add New Employee</h2>
                <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>Enter company employee details to create their profile</p>
              </div>
              <button
                onClick={handleCloseAddModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667085',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateEmployee} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEE2E2',
                    color: '#B42318',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{modalError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="Employee ID *"
                  placeholder="e.g. EMP016"
                  value={addForm.employee_id}
                  error={fieldErrors.employee_id}
                  onChange={(e) => {
                    setAddForm({ ...addForm, employee_id: e.target.value.toUpperCase() });
                    if (fieldErrors.employee_id) setFieldErrors({ ...fieldErrors, employee_id: '' });
                  }}
                />
                <Input
                  label="Full Name *"
                  placeholder="e.g. Sarah Connor"
                  value={addForm.full_name}
                  error={fieldErrors.full_name}
                  onChange={(e) => {
                    setAddForm({ ...addForm, full_name: e.target.value });
                    if (fieldErrors.full_name) setFieldErrors({ ...fieldErrors, full_name: '' });
                  }}
                />
              </div>

              <Input
                label="Email Address *"
                type="email"
                placeholder="e.g. s.connor@arcofintech.com"
                value={addForm.email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setAddForm({ ...addForm, email: e.target.value.toLowerCase() });
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                    Department *
                  </label>
                  <select
                    value={addForm.department_id}
                    onChange={(e) => {
                      setAddForm({ ...addForm, department_id: e.target.value ? Number(e.target.value) : '' });
                      if (fieldErrors.department_id) setFieldErrors({ ...fieldErrors, department_id: '' });
                    }}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: `1px solid ${fieldErrors.department_id ? '#EF4444' : '#E5E9F0'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#172033',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">Select Department</option>
                    {safeDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {fieldErrors.department_id && (
                    <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.department_id}
                    </span>
                  )}
                </div>

                <Input
                  label="Job Title *"
                  placeholder="e.g. Security Analyst"
                  value={addForm.job_title}
                  error={fieldErrors.job_title}
                  onChange={(e) => {
                    setAddForm({ ...addForm, job_title: e.target.value });
                    if (fieldErrors.job_title) setFieldErrors({ ...fieldErrors, job_title: '' });
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                    Manager (Optional)
                  </label>
                  <select
                    value={addForm.manager_id}
                    onChange={(e) => setAddForm({ ...addForm, manager_id: e.target.value ? Number(e.target.value) : '' })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E5E9F0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#172033',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">None / Reports to CEO</option>
                    {allManagers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.job_title})</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Location"
                  placeholder="e.g. Hyderabad, Telangana, India"
                  value={addForm.location}
                  error={fieldErrors.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    value={addForm.joining_date}
                    onChange={(e) => {
                      setAddForm({ ...addForm, joining_date: e.target.value });
                      if (fieldErrors.joining_date) setFieldErrors({ ...fieldErrors, joining_date: '' });
                    }}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: `1px solid ${fieldErrors.joining_date ? '#EF4444' : '#E5E9F0'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#172033',
                      boxSizing: 'border-box',
                    }}
                  />
                  {fieldErrors.joining_date && (
                    <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.joining_date}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as AddEmployeeForm['status'] })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E5E9F0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#172033',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                    <option value="exited">Exited</option>
                  </select>
                </div>
              </div>

              {/* ARCO WORKPLACE ACCESS SECTION */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E5E9F0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={18} color="#2563EB" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>ARCO Workplace Access</span>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addForm.create_user_account}
                    onChange={(e) => setAddForm({ ...addForm, create_user_account: e.target.checked })}
                    style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2563EB' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                      Create ARCO Workplace Login Account
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                      Creates an employee user login allowing this person to log in, raise support tickets, and view their assets.
                    </div>
                  </div>
                </label>

                {addForm.create_user_account && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px dashed #E5E9F0' }}>
                    <div style={{ fontSize: '12px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '8px 12px', borderRadius: '6px', border: '1px solid #B2CCFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={14} style={{ flexShrink: 0 }} />
                      <span>A secure temporary password will be auto-generated and shown after creation. Or specify a custom temporary password below.</span>
                    </div>
                    <PasswordInput
                      label="Custom Temporary Password (Optional)"
                      placeholder="Leave blank to auto-generate secure password"
                      value={addForm.temp_password}
                      onChange={(e) => setAddForm({ ...addForm, temp_password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #E5E9F0' }}>
                <Button type="button" variant="ghost" onClick={handleCloseAddModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Create Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Created Credentials Modal ─────────────────────────────────────── */}
      {createdCredentials && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: '#ECFDF3', borderBottom: '1px solid #D1FADF', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#065F46', margin: 0 }}>Login Account Created</h3>
                <p style={{ fontSize: '13px', color: '#047857', margin: '2px 0 0' }}>Share these initial login details securely with the employee</p>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E9F0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Employee</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>{createdCredentials.full_name} ({createdCredentials.employee_id})</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Login Email / Username</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#172033' }}>{createdCredentials.email}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={copiedField === 'email' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.email);
                      setCopiedField('email');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                  >
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Temporary Password</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#172033', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {createdCredentials.temporary_password}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={copiedField === 'password' ? <Check size={14} color="#fff" /> : <Copy size={14} />}
                    onClick={() => {
                      if (createdCredentials.temporary_password) {
                        navigator.clipboard.writeText(createdCredentials.temporary_password);
                        setCopiedField('password');
                        setTimeout(() => setCopiedField(null), 2000);
                      }
                    }}
                  >
                    {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Portal Login URL</div>
                    <div style={{ fontSize: '13px', color: '#2563EB' }}>{window.location.origin}/login</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={copiedField === 'url' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/login`);
                      setCopiedField('url');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                  >
                    {copiedField === 'url' ? 'Copied' : 'Copy URL'}
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#667085', lineHeight: '1.5' }}>
                <Info size={14} color="#2563EB" />
                <span>The employee can use these credentials to log into ARCO Workplace and will have the default <strong>Employee</strong> role.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => setCreatedCredentials(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee 360 Slide-Over Drawer */}
      <Employee360Drawer
        employeeId={selected360EmployeeId}
        isOpen={!!selected360EmployeeId}
        onClose={() => setSelected360EmployeeId(null)}
        onOpenAsset={(assetId) => setSelectedAssetId(assetId)}
        onOpenServiceDesk={(item) => setSelectedServiceDeskItem(item)}
        onOpenProcurement={(prId) => setSelectedProcurementId(prId)}
        onUpdated={fetchEmployees}
      />

      {/* Asset Detail Drawer */}
      <AssetDetailDrawer
        assetId={selectedAssetId}
        isOpen={!!selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
        onOpenEmployee360={(empId) => setSelected360EmployeeId(empId)}
      />

      {/* Service Desk Detail Drawer */}
      <ServiceDeskDetailDrawer
        item={selectedServiceDeskItem}
        isOpen={!!selectedServiceDeskItem}
        onClose={() => setSelectedServiceDeskItem(null)}
      />

      {/* Procurement Detail Drawer */}
      <ProcurementDetailDrawer
        procurementId={selectedProcurementId}
        isOpen={!!selectedProcurementId}
        onClose={() => setSelectedProcurementId(null)}
        onUpdated={fetchEmployees}
      />
    </div>
  );
};

