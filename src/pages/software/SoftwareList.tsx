import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Package,
  X,
} from 'lucide-react';
import { softwareApi, SoftwareFilters } from '../../api/software';
import type { Software, SoftwareStats } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, PageHeader, SegmentedControl } from '../../components/ui';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { SoftwareExpiryDateFilter, ExpiryPreset } from '../../components/software/SoftwareExpiryDateFilter';
import {
  DataTableHeaderCell,
  ActiveFilterChips,
  ToolbarFilterPopover,
  filterFieldLabelStyle,
  filterFieldSelectStyle,
} from '../../components/common/table';

import {
  SoftwareStatusBadge,
  SoftwareCategoryBadge,
  LicenseTypeBadge,
  LicenseUtilizationBar,
  AllocationScopeBadge,
} from '../../components/software/SoftwareBadges';
import { AddSoftwareModal } from './AddSoftwareModal';
import { logger } from '../../utils/logger';

type SoftwareTab = 'all' | 'active' | 'expiring_soon' | 'expired';

export const SoftwareList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === 'it_admin' || user?.role === 'super_admin';
  const isEmployee = user?.role === 'employee';

  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [stats, setStats] = useState<SoftwareStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Initial values from searchParams
  const getInitialTab = (): SoftwareTab => {
    const s = searchParams.get('status');
    const es = searchParams.get('expiring_soon');
    const ex = searchParams.get('expired');
    if (s === 'active') return 'active';
    if (es === 'true') return 'expiring_soon';
    if (ex === 'true') return 'expired';
    return 'all';
  };

  const getInitialCard = () => {
    const s = searchParams.get('status');
    const es = searchParams.get('expiring_soon');
    const ex = searchParams.get('expired');
    if (s === 'active') return 'active';
    if (es === 'true') return 'expiring_soon';
    if (ex === 'true') return 'expired';
    return 'all';
  };

  // Primary Tab View State
  const [activeTab, setActiveTab] = useState<SoftwareTab>(getInitialTab);
  const [activeCard, setActiveCard] = useState<string | null>(getInitialCard);

  // Filter States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [allocationScopeFilter, setAllocationScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('all');
  const [expiryStartDate, setExpiryStartDate] = useState('');
  const [expiryEndDate, setExpiryEndDate] = useState('');
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(searchParams.get('expiring_soon') === 'true');
  const [expiredOnly, setExpiredOnly] = useState(searchParams.get('expired') === 'true');

  // Popover State & Draft Selections
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState('');
  const [draftAllocationScope, setDraftAllocationScope] = useState('');
  const [draftLicenseType, setDraftLicenseType] = useState('');

  // Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sync URL query parameters on navigation
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const expiringSoonParam = searchParams.get('expiring_soon');
    const expiredParam = searchParams.get('expired');

    if (statusParam === 'active') {
      setActiveTab('active');
      setStatusFilter('active');
      setExpiringSoonOnly(false);
      setExpiredOnly(false);
      setActiveCard('active');
    } else if (expiringSoonParam === 'true') {
      setActiveTab('expiring_soon');
      setStatusFilter('');
      setExpiringSoonOnly(true);
      setExpiredOnly(false);
      setActiveCard('expiring_soon');
    } else if (expiredParam === 'true') {
      setActiveTab('expired');
      setStatusFilter('');
      setExpiringSoonOnly(false);
      setExpiredOnly(true);
      setActiveCard('expired');
    } else {
      setActiveTab('all');
      setStatusFilter('');
      setExpiringSoonOnly(false);
      setExpiredOnly(false);
      setActiveCard('all');
    }
  }, [searchParams]);

  // If normal employee, redirect to my-software
  useEffect(() => {
    if (isEmployee) {
      navigate('/my-software', { replace: true });
    }
  }, [isEmployee, navigate]);

  const fetchStats = async () => {
    try {
      const data = await softwareApi.getSoftwareStats();
      setStats(data);
    } catch (err) {
      logger.error('SoftwareList', 'Failed to fetch software stats', err);
    }
  };

  const fetchSoftware = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: SoftwareFilters = {
        page,
        page_size: 10,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        allocation_scope: allocationScopeFilter || undefined,
        status: statusFilter || undefined,
        license_type: licenseTypeFilter || undefined,
        expiring_soon: expiringSoonOnly || undefined,
        expired: expiredOnly || undefined,
        expiry_preset: expiryPreset !== 'all' ? expiryPreset : undefined,
        expiry_date_from: expiryStartDate || undefined,
        expiry_date_to: expiryEndDate || undefined,
      };

      const resp = await softwareApi.getSoftwareList(params);
      setSoftwareList(resp.results || []);
      setTotalCount(resp.count);
      setTotalPages(Math.ceil(resp.count / 10) || 1);
      setCurrentPage(page);
    } catch (err) {
      logger.error('SoftwareList', 'Failed to fetch software directory', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, allocationScopeFilter, statusFilter, licenseTypeFilter, expiringSoonOnly, expiredOnly, expiryPreset, expiryStartDate, expiryEndDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchSoftware(1);
  }, [fetchSoftware]);

  const handlePageChange = (newPage: number) => {
    fetchSoftware(newPage);
  };

  const handleSoftwareAdded = (newSoftware: Software) => {
    fetchStats();
    fetchSoftware(1);
    navigate(`/software/${newSoftware.id}`);
  };

  const handleTabChange = (tab: SoftwareTab) => {
    setActiveTab(tab);
    if (tab === 'all') {
      setStatusFilter('');
      setExpiringSoonOnly(false);
      setExpiredOnly(false);
      setActiveCard('all');
      setSearchParams({});
    } else if (tab === 'active') {
      setStatusFilter('active');
      setExpiringSoonOnly(false);
      setExpiredOnly(false);
      setActiveCard('active');
      setSearchParams({ status: 'active' });
    } else if (tab === 'expiring_soon') {
      setStatusFilter('');
      setExpiringSoonOnly(true);
      setExpiredOnly(false);
      setActiveCard('expiring_soon');
      setSearchParams({ expiring_soon: 'true' });
    } else if (tab === 'expired') {
      setStatusFilter('');
      setExpiringSoonOnly(false);
      setExpiredOnly(true);
      setActiveCard('expired');
      setSearchParams({ expired: 'true' });
    }
  };

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftCategory(categoryFilter);
      setDraftAllocationScope(allocationScopeFilter);
      setDraftLicenseType(licenseTypeFilter);
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleApplyFilters = () => {
    setCategoryFilter(draftCategory);
    setAllocationScopeFilter(draftAllocationScope);
    setLicenseTypeFilter(draftLicenseType);
    setIsFilterOpen(false);
  };

  const handleResetPopoverFilters = () => {
    setDraftCategory('');
    setDraftAllocationScope('');
    setDraftLicenseType('');
    setCategoryFilter('');
    setAllocationScopeFilter('');
    setLicenseTypeFilter('');
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setAllocationScopeFilter('');
    setLicenseTypeFilter('');
    setDraftCategory('');
    setDraftAllocationScope('');
    setDraftLicenseType('');
    setStatusFilter('');
    setExpiryPreset('all');
    setExpiryStartDate('');
    setExpiryEndDate('');
    setExpiringSoonOnly(false);
    setExpiredOnly(false);
    setActiveTab('all');
    setActiveCard('all');
    setSearchParams({});
  };

  const formatExpiry = (expiryDate?: string | null, licenseType?: string) => {
    if (!expiryDate) {
      if (licenseType === 'perpetual' || licenseType === 'open_source') {
        return <span style={{ color: '#059669', fontWeight: 500 }}>No expiry (Perpetual)</span>;
      }
      return <span style={{ color: '#98A2B3', fontStyle: 'italic' }}>Not configured</span>;
    }
    try {
      const exp = new Date(expiryDate);
      if (isNaN(exp.getTime())) return <span>{expiryDate}</span>;

      const today = new Date();
      const expZero = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffDays = Math.round((expZero.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));

      // Standard formatted date e.g. "30 Oct 2026"
      const formattedDate = exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      if (diffDays < 0) {
        return (
          <span
            style={{ color: '#DC2626', fontWeight: 600 }}
            title={`Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago (${expiryDate})`}
          >
            {formattedDate}
          </span>
        );
      } else if (diffDays <= 30) {
        return (
          <span
            style={{ color: '#D97706', fontWeight: 600 }}
            title={`Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'} (${expiryDate})`}
          >
            {formattedDate}
          </span>
        );
      }

      return <span style={{ color: '#475467', fontWeight: 400 }}>{formattedDate}</span>;
    } catch {
      return <span>{expiryDate}</span>;
    }
  };

  const hasAdvancedFilters = Boolean(categoryFilter || allocationScopeFilter || licenseTypeFilter);
  const hasExpiryFilter = expiryPreset !== 'all' || Boolean(expiryStartDate || expiryEndDate);
  const hasAnyFilters = Boolean(
    search.trim() ||
    hasAdvancedFilters ||
    statusFilter ||
    expiringSoonOnly ||
    expiredOnly ||
    hasExpiryFilter ||
    activeTab !== 'all'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header */}
      <PageHeader
        title="Software & Licenses"
        description="Track software catalog, license seats, expiration timelines, and employee assignments"
        actions={
          isAdminOrSuper ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<PlusCircle size={15} />}
            >
              Add Software
            </Button>
          ) : undefined
        }
      />

      {/* KPI Summary Cards */}
      {stats && (
        <div className="stat-card-grid-5">
          <SummaryFilterCard
            title="Total Software"
            count={stats.total_software}
            icon={<Layers size={16} />}
            isActive={activeCard === 'all'}
            accentColor="#2563EB"
            onClick={() => handleTabChange('all')}
          />

          <SummaryFilterCard
            title="Active Licenses"
            count={stats.active_software}
            icon={<CheckCircle2 size={16} />}
            isActive={activeCard === 'active'}
            accentColor="#059669"
            onClick={() => handleTabChange(activeCard === 'active' ? 'all' : 'active')}
          />

          <SummaryFilterCard
            title="Expiring Soon (≤30d)"
            count={stats.expiring_soon}
            icon={<Clock size={16} />}
            isActive={activeCard === 'expiring_soon'}
            accentColor="#D97706"
            onClick={() => handleTabChange(activeCard === 'expiring_soon' ? 'all' : 'expiring_soon')}
          />

          <SummaryFilterCard
            title="Expired"
            count={stats.expired}
            icon={<AlertTriangle size={16} />}
            isActive={activeCard === 'expired'}
            accentColor="#DC2626"
            onClick={() => handleTabChange(activeCard === 'expired' ? 'all' : 'expired')}
          />

          <SummaryFilterCard
            title="License Utilization"
            count={`${stats.utilization_rate}%`}
            subtext={`${stats.used_licenses} / ${stats.total_licenses} seats`}
            icon={<ShieldCheck size={16} />}
            accentColor={
              stats.total_licenses > 0 && stats.used_licenses > stats.total_licenses
                ? '#DC2626'
                : stats.utilization_rate >= 85 && stats.utilization_rate < 100
                ? '#D97706'
                : '#2563EB'
            }
            progressBar={{
              percent: stats.utilization_rate,
              color:
                stats.total_licenses > 0 && stats.used_licenses > stats.total_licenses
                  ? '#DC2626'
                  : stats.utilization_rate >= 85 && stats.utilization_rate < 100
                  ? '#D97706'
                  : '#2563EB',
            }}
            isClickable={false}
          />
        </div>
      )}

      {/* Primary View Tabs */}
      <SegmentedControl
        variant="tabs"
        value={activeTab}
        onChange={(val) => handleTabChange(val as SoftwareTab)}
        options={[
          { key: 'all', label: 'All Software', count: stats?.total_software },
          { key: 'active', label: 'Active Licenses', count: stats?.active_software },
          { key: 'expiring_soon', label: 'Expiring Soon', count: stats?.expiring_soon },
          { key: 'expired', label: 'Expired', count: stats?.expired },
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
              placeholder="Search software name, publisher, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
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
            activeCount={[Boolean(categoryFilter), Boolean(allocationScopeFilter), Boolean(licenseTypeFilter)].filter(Boolean).length}
            title="Filter Software"
            hasFiltersToReset={Boolean(draftCategory || draftAllocationScope || draftLicenseType || categoryFilter || allocationScopeFilter || licenseTypeFilter)}
            onReset={handleResetPopoverFilters}
            onApply={handleApplyFilters}
          >
            <div>
              <label style={filterFieldLabelStyle}>Software Category</label>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Categories</option>
                <option value="productivity">Productivity</option>
                <option value="communication">Communication</option>
                <option value="design">Design</option>
                <option value="hosting_infrastructure">Hosting / Infrastructure</option>
                <option value="security">Security</option>
                <option value="development">Development</option>
                <option value="operating_system">Operating System</option>
                <option value="database">Database</option>
                <option value="vpn_remote">VPN / Remote Access</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={filterFieldLabelStyle}>Allocation Scope</label>
              <select
                value={draftAllocationScope}
                onChange={(e) => setDraftAllocationScope(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Scopes</option>
                <option value="user_specific">User-Specific</option>
                <option value="company_wide">Company-Wide</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="device_specific">Device-Specific</option>
              </select>
            </div>

            <div>
              <label style={filterFieldLabelStyle}>License Type</label>
              <select
                value={draftLicenseType}
                onChange={(e) => setDraftLicenseType(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All License Types</option>
                <option value="subscription">Subscription</option>
                <option value="per_user">Per User</option>
                <option value="per_device">Per Device</option>
                <option value="perpetual">Perpetual</option>
                <option value="trial">Trial</option>
                <option value="open_source">Free / Open Source</option>
              </select>
            </div>
          </ToolbarFilterPopover>
        </div>

        {/* Right side controls: Expiry Date Filter & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <SoftwareExpiryDateFilter
            preset={expiryPreset}
            startDate={expiryStartDate}
            endDate={expiryEndDate}
            onChange={(preset, start, end) => {
              setExpiryPreset(preset);
              setExpiryStartDate(start);
              setExpiryEndDate(end);
            }}
          />
          {hasAnyFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
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
            search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => setSearch('') } : null,
            categoryFilter ? { id: 'category', label: 'Category', value: categoryFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => setCategoryFilter('') } : null,
            allocationScopeFilter ? { id: 'allocation_scope', label: 'Scope', value: allocationScopeFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => setAllocationScopeFilter('') } : null,
            licenseTypeFilter ? { id: 'license_type', label: 'License Type', value: licenseTypeFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => setLicenseTypeFilter('') } : null,
            activeTab !== 'all' ? { id: 'tab', label: 'View', value: activeTab === 'active' ? 'Active Licenses' : activeTab === 'expiring_soon' ? 'Expiring Soon' : 'Expired', onRemove: () => handleTabChange('all') } : null,
            hasExpiryFilter ? {
              id: 'expiry',
              label: 'Expiry',
              value: expiryPreset === 'this_week'
                ? 'This Week'
                : expiryPreset === 'this_month'
                ? 'This Month'
                : expiryPreset === 'next_30_days'
                ? 'Next 30 Days'
                : expiryPreset === 'next_90_days'
                ? 'Next 90 Days'
                : expiryPreset === 'expired'
                ? 'Expired'
                : `${expiryStartDate || '—'} to ${expiryEndDate || '—'}`,
              onRemove: () => {
                setExpiryPreset('all');
                setExpiryStartDate('');
                setExpiryEndDate('');
              },
            } : null,
          ].filter(Boolean) as any[]}
          onClearAll={clearFilters}
        />
      )}

      {/* Directory Table */}
      <Card noPadding style={{ overflow: 'visible' }}>
        <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Software Catalog Table">
          <table style={{ width: '100%', minWidth: '1030px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr>
                <DataTableHeaderCell
                  title="Software Name"
                  width="200px"
                  minWidth="180px"
                  isSticky
                  stickyLeft={0}
                  style={{ borderRight: '1px solid #E5E9F0' }}
                />
                <DataTableHeaderCell
                  title="Publisher"
                  width="140px"
                  minWidth="130px"
                />
                <DataTableHeaderCell
                  title="Category"
                  width="120px"
                  minWidth="110px"
                />
                <DataTableHeaderCell
                  title="Allocation Scope"
                  width="120px"
                  minWidth="110px"
                />
                <DataTableHeaderCell
                  title="License Type"
                  width="110px"
                  minWidth="100px"
                />
                <DataTableHeaderCell
                  title="Expiry Date"
                  width="110px"
                  minWidth="100px"
                />
                <DataTableHeaderCell
                  title="License Seats"
                  width="140px"
                  minWidth="130px"
                />
                <DataTableHeaderCell
                  title="Status"
                  width="100px"
                  minWidth="90px"
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
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#98A2B3' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <p style={{ margin: 0 }}>Loading software catalog...</p>
                  </td>
                </tr>
              ) : softwareList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#98A2B3' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#475569', margin: '0 0 4px' }}>
                      {hasExpiryFilter
                        ? 'No licenses found for the selected expiry period'
                        : 'No software records found'}
                    </p>
                    <p style={{ fontSize: '12px', margin: 0 }}>
                      {hasAnyFilters
                        ? 'Try adjusting your filters or search criteria.'
                        : 'Add a new software record to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                softwareList.map(sw => (
                  <tr
                    key={sw.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    onClick={() => navigate(`/software/${sw.id}`)}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '200px', minWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={sw.name}>{sw.name}</span>
                          {sw.version && (
                            <span style={{ fontSize: '11px', color: '#667085', backgroundColor: '#F5F7FA', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {sw.version}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px', fontFamily: 'monospace' }} className="cell-truncate-1">
                          {sw.software_id}
                        </span>
                      </div>
                    </td>
                    <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', color: '#475467', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="cell-truncate-1" style={{ display: 'block' }} title={sw.publisher}>{sw.publisher}</span>
                    </td>
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <SoftwareCategoryBadge category={sw.category} />
                    </td>
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <AllocationScopeBadge scope={sw.allocation_scope} />
                    </td>
                    <td style={{ width: '110px', minWidth: '100px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <LicenseTypeBadge type={sw.license_type} />
                    </td>
                    <td style={{ width: '110px', minWidth: '100px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#475467' }}>
                      {formatExpiry(sw.license_expiry_date, sw.license_type)}
                    </td>
                    <td style={{ width: '140px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <LicenseUtilizationBar used={sw.used_licenses} total={sw.total_licenses} />
                    </td>
                    <td style={{ width: '100px', minWidth: '90px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <SoftwareStatusBadge status={sw.computed_status || sw.status} />
                    </td>
                    <td style={{ width: '85px', minWidth: '80px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/software/${sw.id}`)}
                      >
                        Details <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={10}
          onPageChange={handlePageChange}
          isLoading={loading}
          itemName="software records"
        />
      </Card>

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddSoftwareModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSoftwareAdded}
        />
      )}
    </div>
  );
};
