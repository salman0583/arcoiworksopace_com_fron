import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  PlusCircle,
  Filter,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, SegmentedControl, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { vendorsApi } from '../../api/vendors';
import { VendorTypeBadge, VendorStatusBadge, ContractStatusBadge, ContractTypeBadge } from '../../components/vendors/VendorBadges';
import { AddVendorModal } from './AddVendorModal';
import { AddContractModal } from './AddContractModal';
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
import { X } from 'lucide-react';

import type {
  VendorListItem,
  VendorStats,
  Contract,
} from '../../types/vendors';

const PAGE_SIZE = 10;

export const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isITAdmin = user?.role === 'it_admin' || user?.role === 'super_admin';
  const isEmployee = user?.role === 'employee';

  const getInitialTab = () => {
    return searchParams.get('tab') === 'contracts' ? 'contracts' : 'vendors';
  };
  const getInitialStatus = () => {
    return searchParams.get('status') || '';
  };
  const getInitialContractStatus = () => {
    return searchParams.get('contract_status') || '';
  };
  const getInitialCard = () => {
    const tab = searchParams.get('tab');
    const s = searchParams.get('status');
    const cs = searchParams.get('contract_status');
    if (tab === 'contracts') {
      if (cs === 'active') return 'active_contracts';
      if (cs === 'expiring_soon') return 'renewals';
      return null;
    }
    if (s === 'active') return 'active_vendors';
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<'vendors' | 'contracts'>(getInitialTab);
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [statusFilter, setStatusFilter] = useState(getInitialStatus);
  const [contractStatusFilter, setContractStatusFilter] = useState(getInitialContractStatus);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeCard, setActiveCard] = useState<string | null>(getInitialCard);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Centralized Popover & Draft Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftVendorType, setDraftVendorType] = useState('');
  const [draftStatus, setDraftStatus] = useState('');

  // Modals
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);

  // Sync URL search parameters on navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const statusParam = searchParams.get('status');
    const contractStatusParam = searchParams.get('contract_status');

    if (tabParam === 'contracts') {
      setActiveTab('contracts');
      setStatusFilter('');
      if (contractStatusParam === 'active') {
        setContractStatusFilter('active');
        setActiveCard('active_contracts');
      } else if (contractStatusParam === 'expiring_soon') {
        setContractStatusFilter('expiring_soon');
        setActiveCard('renewals');
      } else {
        setContractStatusFilter(contractStatusParam || '');
        setActiveCard(null);
      }
    } else {
      setActiveTab('vendors');
      setContractStatusFilter('');
      if (statusParam === 'active') {
        setStatusFilter('active');
        setActiveCard('active_vendors');
      } else {
        setStatusFilter(statusParam || '');
        setActiveCard('all');
      }
    }
    setPage(1);
  }, [searchParams]);

  // Redirect employee if unauthorized
  useEffect(() => {
    if (isEmployee) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEmployee, navigate]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, vendorsRes, contractsRes] = await Promise.all([
        vendorsApi.getStats(),
        vendorsApi.list({
          search: search || undefined,
          vendor_type: vendorType || undefined,
          status: statusFilter || undefined,
          page,
          page_size: 10,
        }),
        vendorsApi.listContracts({ page_size: 100 }).catch(() => ({ count: 0, results: [] })),
      ]);
      setStats(statsRes);
      setVendors(vendorsRes.results);
      setTotalCount(vendorsRes.count);
      setTotalPages(Math.ceil(vendorsRes.count / 10) || 1);
      setContracts(contractsRes.results || []);
    } catch (err) {
      console.error('Failed to fetch vendor data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, vendorType, statusFilter, startDate, endDate, page]);



  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftVendorType(vendorType);
      setDraftStatus(statusFilter);
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleApplyFilters = () => {
    setVendorType(draftVendorType);
    setStatusFilter(draftStatus);
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetPopoverFilters = () => {
    setDraftVendorType('');
    setDraftStatus('');
    setVendorType('');
    setStatusFilter('');
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setVendorType('');
    setStatusFilter('');
    setContractStatusFilter('');
    setDraftVendorType('');
    setDraftStatus('');
    setStartDate('');
    setEndDate('');
    setActiveCard('all');
    setSearchParams({});
    setPage(1);
  };

  const hasAnyFilters = Boolean(search || vendorType || statusFilter || startDate || endDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Page Title & Actions */}
      <PageHeader
        title="Vendors"
        description="Track hardware suppliers, software licensing partners, telecom carriers, and service level contracts"
        actions={
          isITAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddContractOpen(true)}
                leftIcon={<PlusCircle size={15} />}
              >
                New Contract
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddVendorOpen(true)}
                leftIcon={<PlusCircle size={15} />}
              >
                Add Vendor
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
        }}
      >
        <SummaryFilterCard
          title="Total Registered"
          count={stats ? stats.total_vendors : '—'}
          icon={<Building2 size={16} />}
          isActive={activeTab === 'vendors' && activeCard === 'all'}
          accentColor="#2563EB"
          onClick={() => {
            setActiveTab('vendors');
            setStatusFilter('');
            setContractStatusFilter('');
            setActiveCard('all');
            setSearchParams({});
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Active Partners"
          count={stats ? stats.active_vendors : '—'}
          icon={<CheckCircle2 size={16} />}
          isActive={activeTab === 'vendors' && activeCard === 'active_vendors'}
          accentColor="#059669"
          onClick={() => {
            if (activeTab === 'vendors' && activeCard === 'active_vendors') {
              setActiveCard('all');
              setStatusFilter('');
              setSearchParams({});
            } else {
              setActiveTab('vendors');
              setStatusFilter('active');
              setContractStatusFilter('');
              setActiveCard('active_vendors');
              setSearchParams({ status: 'active' });
            }
            setPage(1);
          }}
        />

        <SummaryFilterCard
          title="Active Contracts"
          count={stats ? stats.active_contracts : '—'}
          icon={<FileText size={16} />}
          isActive={activeTab === 'contracts' && activeCard === 'active_contracts'}
          accentColor="#4F46E5"
          onClick={() => {
            if (activeTab === 'contracts' && activeCard === 'active_contracts') {
              setActiveCard(null);
              setContractStatusFilter('');
              setSearchParams({ tab: 'contracts' });
            } else {
              setActiveTab('contracts');
              setStatusFilter('');
              setContractStatusFilter('active');
              setActiveCard('active_contracts');
              setSearchParams({ tab: 'contracts', contract_status: 'active' });
            }
          }}
        />

        <SummaryFilterCard
          title="Renewals (≤ 30 Days)"
          count={stats ? stats.expiring_soon_contracts : '—'}
          icon={<AlertTriangle size={16} />}
          isActive={activeTab === 'contracts' && activeCard === 'renewals'}
          accentColor="#D97706"
          onClick={() => {
            if (activeTab === 'contracts' && activeCard === 'renewals') {
              setActiveCard(null);
              setContractStatusFilter('');
              setSearchParams({ tab: 'contracts' });
            } else {
              setActiveTab('contracts');
              setStatusFilter('');
              setContractStatusFilter('expiring_soon');
              setActiveCard('renewals');
              setSearchParams({ tab: 'contracts', contract_status: 'expiring_soon' });
            }
          }}
        />
      </div>


      {/* Tabs */}
      <SegmentedControl
        variant="tabs"
        value={activeTab}
        onChange={(val) => {
          if (val === 'vendors') {
            setActiveTab('vendors');
            setContractStatusFilter('');
            setActiveCard(statusFilter === 'active' ? 'active_vendors' : 'all');
            setSearchParams(statusFilter ? { status: statusFilter } : {});
          } else {
            setActiveTab('contracts');
            setStatusFilter('');
            setActiveCard(contractStatusFilter === 'active' ? 'active_contracts' : contractStatusFilter === 'expiring_soon' ? 'renewals' : null);
            setSearchParams(contractStatusFilter ? { tab: 'contracts', contract_status: contractStatusFilter } : { tab: 'contracts' });
          }
        }}
        options={[
          { key: 'vendors', label: 'Vendors Directory', icon: <Building2 size={16} /> },
          {
            key: 'contracts',
            label: 'Contracts & Renewals',
            icon: <FileText size={16} />,
            count: stats && stats.expiring_soon_contracts > 0 ? stats.expiring_soon_contracts : undefined,
            badgeBg: '#FEF3C7',
            badgeColor: '#B54708',
          },
        ]}
      />


      {activeTab === 'vendors' ? (
        <>
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
                  placeholder="Search vendor, contact person, phone, or email..."
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
                activeCount={[Boolean(vendorType), Boolean(statusFilter)].filter(Boolean).length}
                title="Filter Vendors"
                hasFiltersToReset={Boolean(draftVendorType || draftStatus || vendorType || statusFilter)}
                onReset={handleResetPopoverFilters}
                onApply={handleApplyFilters}
              >
                <div>
                  <label style={filterFieldLabelStyle}>Category / Type</label>
                  <select
                    value={draftVendorType}
                    onChange={(e) => setDraftVendorType(e.target.value)}
                    style={filterFieldSelectStyle}
                  >
                    <option value="">All Vendor Types</option>
                    <option value="hardware_supplier">Hardware Supplier</option>
                    <option value="software_vendor">Software Vendor</option>
                    <option value="internet_network">Internet / Network</option>
                    <option value="it_support">IT Support Provider</option>
                    <option value="printer_amc">Printer / AMC</option>
                    <option value="telecom">Telecom Provider</option>
                    <option value="cloud_hosting">Cloud / Hosting</option>
                    <option value="security">Security Provider</option>
                    <option value="office_tech">Office Technology</option>
                    <option value="other">Other</option>
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
                    <option value="inactive">Inactive</option>
                    <option value="on_hold">On Hold</option>
                    <option value="blocked">Blocked</option>
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
                vendorType ? { id: 'type', label: 'Category', value: vendorType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setVendorType(''); setDraftVendorType(''); setPage(1); } } : null,
                statusFilter ? { id: 'status', label: 'Status', value: statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), onRemove: () => { setStatusFilter(''); setDraftStatus(''); setActiveCard('all'); setPage(1); } } : null,
                (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
              ].filter(Boolean) as any[]}
              onClearAll={handleResetFilters}
            />
          )}

          {/* Vendors Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E9F0',
              overflow: 'visible',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Vendors Table">
              <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <DataTableHeaderCell
                      title="Vendor"
                      width="220px"
                      minWidth="220px"
                      maxWidth="220px"
                      isSticky
                      stickyLeft={0}
                    />
                    <DataTableHeaderCell
                      title="Category / Type"
                      width="160px"
                      minWidth="160px"
                      maxWidth="160px"
                      isSticky
                      stickyLeft="220px"
                      style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                    />
                    <DataTableHeaderCell
                      title="Primary Contact"
                      width="200px"
                      minWidth="200px"
                      maxWidth="200px"
                    />
                    <DataTableHeaderCell
                      title="Status"
                      width="120px"
                      minWidth="120px"
                      maxWidth="120px"
                    />
                    <DataTableHeaderCell
                      title="Contracts"
                      width="90px"
                      minWidth="90px"
                      maxWidth="90px"
                      align="center"
                    />
                    <DataTableHeaderCell
                      title="Assets"
                      width="90px"
                      minWidth="90px"
                      maxWidth="90px"
                      align="center"
                    />
                    <DataTableHeaderCell
                      title="Software"
                      width="90px"
                      minWidth="90px"
                      maxWidth="90px"
                      align="center"
                    />
                    <DataTableHeaderCell
                      title="Actions"
                      width="110px"
                      minWidth="110px"
                      maxWidth="110px"
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                        Loading vendors directory...
                      </td>
                    </tr>
                  ) : vendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                        No vendors match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    vendors.map(v => (
                      <tr
                        key={v.id}
                        onClick={() => navigate(`/vendors/${v.id}`)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={v.name}>{v.name}</div>
                          <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px', fontFamily: 'monospace' }} className="cell-truncate-1">
                            {v.vendor_id} • {v.city || 'Hyderabad'}
                          </div>
                        </td>
                        <td style={{ position: 'sticky', left: '220px', zIndex: 4, backgroundColor: 'inherit', width: '160px', minWidth: '160px', maxWidth: '160px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <VendorTypeBadge type={v.vendor_type} />
                        </td>
                        <td style={{ width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                          {v.primary_contact_name ? (
                            <div>
                              <div style={{ fontWeight: 500, color: '#475467' }} className="cell-truncate-1" title={v.primary_contact_name}>{v.primary_contact_name}</div>
                              <div style={{ fontSize: '12px', color: '#667085', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                {v.primary_contact_email && <span className="cell-truncate-1">{v.primary_contact_email}</span>}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#98A2B3' }}>—</span>
                          )}
                        </td>
                        <td style={{ width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <VendorStatusBadge status={v.status} />
                        </td>
                        <td style={{ width: '90px', minWidth: '90px', maxWidth: '90px', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 600, color: v.active_contracts_count > 0 ? '#172033' : '#98A2B3' }}>
                            {v.active_contracts_count}
                          </span>
                        </td>
                        <td style={{ width: '90px', minWidth: '90px', maxWidth: '90px', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 600, color: v.assets_count > 0 ? '#172033' : '#98A2B3' }}>
                            {v.assets_count}
                          </span>
                        </td>
                        <td style={{ width: '90px', minWidth: '90px', maxWidth: '90px', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 600, color: v.software_count > 0 ? '#172033' : '#98A2B3' }}>
                            {v.software_count}
                          </span>
                        </td>
                        <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/vendors/${v.id}`);
                            }}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            isLoading={isLoading}
            itemName="vendors"
          />
        </>
      ) : (
        /* Contracts View */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>Vendor Contracts</h3>
              <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0 0' }}>
                All contracts, SLAs, and agreements across registered vendors
              </p>
            </div>
            {isITAdmin && (
              <Button variant="primary" size="sm" onClick={() => setIsAddContractOpen(true)} leftIcon={<PlusCircle size={14} />}>
                New Contract
              </Button>
            )}
          </div>

          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Vendor Contracts Table">
            <table style={{ width: '100%', minWidth: '1110px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Contract Name</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Vendor</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Type</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Start Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>End Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Status</th>
                  {isITAdmin && <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Value</th>}
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const displayedContracts = contracts.filter(c => {
                    if (contractStatusFilter === 'active') return c.computed_status === 'active';
                    if (contractStatusFilter === 'expiring_soon') return c.computed_status === 'expiring_soon';
                    if (contractStatusFilter === 'expired') return c.computed_status === 'expired';
                    return true;
                  });

                  if (displayedContracts.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#667085' }}>
                          No contracts match the selected filter.
                        </td>
                      </tr>
                    );
                  }

                  return displayedContracts.map(c => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #F5F7FA',
                        backgroundColor: c.computed_status === 'expiring_soon' ? '#FFFAEB' : '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (c.computed_status !== 'expiring_soon') e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={e => {
                        if (c.computed_status !== 'expiring_soon') e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <td style={{ width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#172033', maxWidth: '192px' }} className="cell-truncate-1" title={c.name}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: '#667085', fontFamily: 'monospace', maxWidth: '192px' }} className="cell-truncate-1">{c.contract_id}</div>
                      </td>
                      <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => navigate(`/vendors/${c.vendor}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#2563EB',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            maxWidth: '152px',
                          }}
                          className="cell-truncate-1"
                          title={c.vendor_name}
                        >
                          {c.vendor_name}
                          <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        </button>
                      </td>
                      <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <ContractTypeBadge type={c.contract_type} />
                      </td>
                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', color: '#475569', fontSize: '12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{c.start_date}</td>
                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', fontWeight: 500, color: c.computed_status === 'expiring_soon' ? '#B54708' : '#172033', fontSize: '12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {c.end_date}
                      </td>
                      <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <ContractStatusBadge status={c.computed_status} daysRemaining={c.days_remaining} />
                      </td>
                      {isITAdmin && (
                        <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#172033', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          ${parseFloat(String(c.contract_value || '0')).toLocaleString()}
                        </td>
                      )}
                      <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigate(`/vendors/${c.vendor}`);
                          }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* Modals */}
      <AddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onSuccess={() => loadData()}
      />

      <AddContractModal
        isOpen={isAddContractOpen}
        onClose={() => setIsAddContractOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
