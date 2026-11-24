import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Laptop,
  Search,
  Filter,
  FilterX,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
  UserCheck,
  Wrench,
  AlertTriangle,
  BarChart2,
  FileSpreadsheet,
  FileText,
  QrCode,
  Printer,
  ArrowRightLeft,
  X,
  Check,
  Layers,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { assetsReportsApi } from '../../api/assetsReports';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import { sortAssetTypes } from '../../utils/assets';

import { Button, Card, SegmentedControl, PageHeader } from '../../components/ui';
import { DataTableHeaderCell } from '../../components/common/table';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { AssetStatusBadge, AssetConditionBadge, WarrantyBadge } from '../../components/assets/AssetBadges';
import { AddAssetModal } from './AddAssetModal';
import { ReassignAssetModal } from './ReassignAssetModal';
import { AssetDetailDrawer } from '../../components/assets/AssetDetailDrawer';
import { Employee360Drawer } from '../../components/employees/Employee360Drawer';
import { ServiceDeskDetailDrawer } from '../../components/service-desk/ServiceDeskDetailDrawer';
import { ProcurementDetailDrawer } from '../../components/procurement/ProcurementDetailDrawer';
import { ScanAssetQRModal } from '../../components/assets/ScanAssetQRModal';
import { AssetLabelModal } from '../../components/assets/AssetLabelModal';
import type { Asset, AssetType, AssetFilters, AssetStats } from '../../types';
import type { ServiceDeskItem } from '../../types/serviceDesk';

import { logger } from '../../utils/logger';

const PAGE_SIZE = 10;

export const AssetList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select & Modals
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);
  const [labelModalAssets, setLabelModalAssets] = useState<Asset[]>([]);
  const [reassignModalAsset, setReassignModalAsset] = useState<Asset | null>(null);

  // Initial values derived from URL query parameters
  const getInitialTab = () => {
    const s = searchParams.get('status');
    if (s === 'available') return 'available';
    if (s === 'assigned') return 'assigned';
    if (s === 'in_repair') return 'in_repair';
    if (s === 'retired') return 'retired_disposed';
    return 'all';
  };

  const getInitialWarranty = () => {
    return searchParams.get('warranty') || '';
  };

  const getInitialCard = () => {
    const s = searchParams.get('status');
    const w = searchParams.get('warranty');
    if (s === 'available') return 'available';
    if (s === 'assigned') return 'assigned';
    if (s === 'in_repair') return 'in_repair';
    if (s === 'retired') return 'retired_disposed';
    if (w === 'expiring_soon') return 'warranty_expiring';
    return 'all';
  };

  // Filters State
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'assigned' | 'in_repair' | 'retired_disposed'>(getInitialTab);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedWarranty, setSelectedWarranty] = useState<string>(getInitialWarranty);
  const [selectedAssigned, setSelectedAssigned] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeCard, setActiveCard] = useState<string | null>(getInitialCard);

  // Sorting State
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | ''>('');

  // Toolbar Filter Popover State & Pending Drafts
  const [isToolbarFilterOpen, setIsToolbarFilterOpen] = useState<boolean>(false);
  const [pendingCategory, setPendingCategory] = useState<string>('');
  const [pendingType, setPendingType] = useState<string>('');
  const [pendingCondition, setPendingCondition] = useState<string>('');
  const [pendingWarranty, setPendingWarranty] = useState<string>('');
  const [pendingAssigned, setPendingAssigned] = useState<string>('');
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const handleToggleFilterPopover = () => {
    if (!isToolbarFilterOpen) {
      setPendingCategory(selectedCategory);
      setPendingType(selectedType);
      setPendingCondition(selectedCondition);
      setPendingWarranty(selectedWarranty);
      setPendingAssigned(selectedAssigned);
      setIsToolbarFilterOpen(true);
    } else {
      setIsToolbarFilterOpen(false);
    }
  };

  const handleApplyToolbarFilters = () => {
    setSelectedCategory(pendingCategory);
    setSelectedType(pendingType);
    setSelectedCondition(pendingCondition);
    setSelectedWarranty(pendingWarranty);
    setSelectedAssigned(pendingAssigned);
    if (pendingWarranty === 'expiring_soon') {
      setActiveCard('warranty_expiring');
    } else if (pendingWarranty === '' && activeCard === 'warranty_expiring') {
      setActiveCard('all');
    } else if (pendingWarranty && pendingWarranty !== 'expiring_soon' && activeCard === 'warranty_expiring') {
      setActiveCard(null);
    }
    setPage(1);
    setIsToolbarFilterOpen(false);
  };

  const handleResetPopoverFilters = () => {
    setPendingCategory('');
    setPendingType('');
    setPendingCondition('');
    setPendingWarranty('');
    setPendingAssigned('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedCondition('');
    setSelectedWarranty('');
    setSelectedAssigned('');
    if (activeCard === 'warranty_expiring') {
      setActiveCard('all');
    }
    setPage(1);
    setIsToolbarFilterOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isToolbarFilterOpen) {
        setIsToolbarFilterOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setIsToolbarFilterOpen(false);
      }
    };
    if (isToolbarFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isToolbarFilterOpen]);

  // Modals & Actions
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingQR, setIsExportingQR] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Slide-over Drawers
  const [selectedAssetDrawerId, setSelectedAssetDrawerId] = useState<number | null>(null);
  const [selected360EmployeeId, setSelected360EmployeeId] = useState<number | null>(null);
  const [selectedServiceDeskItem, setSelectedServiceDeskItem] = useState<ServiceDeskItem | null>(null);
  const [selectedProcurementId, setSelectedProcurementId] = useState<number | null>(null);

  const handleExportQRData = async (format: 'csv' | 'xlsx' = 'csv') => {
    setIsExportingQR(true);
    try {
      const ids = selectedAssetIds.length > 0 ? selectedAssetIds : undefined;
      const params: any = { format, ids };
      if (!ids) {
        if (search.trim()) params.search = search.trim();
        if (selectedCategory) params.category = selectedCategory;
        if (selectedType) params.asset_type = Number(selectedType);
        if (selectedCondition) params.condition = selectedCondition;
        if (selectedAssigned === 'assigned') params.assigned = 'true';
        else if (selectedAssigned === 'unassigned') params.assigned = 'false';
        if (activeTab === 'available') params.status = 'available';
        else if (activeTab === 'assigned') params.status = 'assigned';
        else if (activeTab === 'in_repair') params.status = 'in_repair';
        else if (activeTab === 'retired_disposed') params.status = 'retired';
      }

      const blob = await assetsApi.exportQRData(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arco_qr_label_data_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessToast(
        ids
          ? `Exported QR label mapping data for ${ids.length} selected asset${ids.length > 1 ? 's' : ''}.`
          : 'Exported QR label mapping dataset for active asset inventory.'
      );
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      logger.error('Assets', 'QR Data Export failed', err);
      setError('Failed to export QR label mapping data.');
    } finally {
      setIsExportingQR(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filters: any = {};
      if (search.trim()) filters.search = search.trim();
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedType) filters.asset_type = Number(selectedType);
      if (selectedCondition) filters.condition = selectedCondition;
      if (selectedWarranty) filters.warranty = selectedWarranty;
      if (selectedAssigned === 'assigned') filters.assigned = 'true';
      else if (selectedAssigned === 'unassigned') filters.assigned = 'false';
      if (startDate) filters.date_from = startDate;
      if (endDate) filters.date_to = endDate;
      if (activeTab === 'available') filters.status = 'available';
      else if (activeTab === 'assigned') filters.status = 'assigned';
      else if (activeTab === 'in_repair') filters.status = 'in_repair';
      else if (activeTab === 'retired_disposed') filters.status = 'retired';

      await assetsReportsApi.exportExcel(filters, `arco_asset_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setSuccessToast('Asset inventory exported to Excel successfully.');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      logger.error('Assets', 'Export failed', err);
      setError('Failed to export asset inventory to Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Sync URL query parameters on navigation
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const warrantyParam = searchParams.get('warranty');

    if (statusParam === 'available') {
      setActiveTab('available');
      setActiveCard('available');
      setSelectedWarranty('');
    } else if (statusParam === 'assigned') {
      setActiveTab('assigned');
      setActiveCard('assigned');
      setSelectedWarranty('');
    } else if (statusParam === 'in_repair') {
      setActiveTab('in_repair');
      setActiveCard('in_repair');
      setSelectedWarranty('');
    } else if (statusParam === 'retired') {
      setActiveTab('retired_disposed');
      setActiveCard(null);
      setSelectedWarranty('');
    } else if (warrantyParam === 'expiring_soon') {
      setSelectedWarranty('expiring_soon');
      setActiveTab('all');
      setActiveCard('warranty_expiring');
    } else {
      setActiveTab('all');
      setActiveCard('all');
      setSelectedWarranty('');
    }
    setPage(1);
  }, [searchParams]);

  // Fetch asset types and stats once (sorted with standard display order)
  useEffect(() => {
    assetsApi.getAssetTypes()
      .then(data => setTypes(sortAssetTypes(data)))
      .catch(() => {});
    assetsApi.getAssetStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AssetFilters = {
        page,
        page_size: PAGE_SIZE,
      };

      if (search.trim()) filters.search = search.trim();
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedType) filters.asset_type = Number(selectedType);
      if (selectedCondition) filters.condition = selectedCondition;
      if (selectedWarranty) filters.warranty = selectedWarranty as 'active' | 'expiring_soon' | 'expired';
      if (selectedAssigned === 'assigned') filters.assigned = 'true';
      else if (selectedAssigned === 'unassigned') filters.assigned = 'false';
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;

      if (activeTab === 'available') filters.status = 'available';
      else if (activeTab === 'assigned') filters.status = 'assigned';
      else if (activeTab === 'in_repair') filters.status = 'in_repair';
      else if (activeTab === 'retired_disposed') filters.status = 'retired';

      // Custom user sorting (if empty, backend applies default business display order)
      if (sortField && sortDirection) {
        filters.ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      }

      const res = await assetsApi.listAssets(filters);
      setAssets(res.results);
      setTotalCount(res.count);
    } catch (err) {
      logger.error('Assets', 'Failed to load assets', err);
      setError('Failed to load asset inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, selectedCategory, selectedType, selectedCondition, selectedWarranty, selectedAssigned, startDate, endDate, sortField, sortDirection]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSelectedWarranty('');
    setPage(1);
    if (tab === 'all') {
      setActiveCard('all');
      setSearchParams({});
    } else if (tab === 'available') {
      setActiveCard('available');
      setSearchParams({ status: 'available' });
    } else if (tab === 'assigned') {
      setActiveCard('assigned');
      setSearchParams({ status: 'assigned' });
    } else if (tab === 'in_repair') {
      setActiveCard('in_repair');
      setSearchParams({ status: 'in_repair' });
    } else if (tab === 'retired_disposed') {
      setActiveCard(null);
      setSearchParams({ status: 'retired' });
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedCondition('');
    setSelectedWarranty('');
    setSelectedAssigned('');
    setPendingCategory('');
    setPendingType('');
    setPendingCondition('');
    setPendingWarranty('');
    setPendingAssigned('');
    setStartDate('');
    setEndDate('');
    setSortField('');
    setSortDirection('');
    setActiveTab('all');
    setActiveCard('all');
    setSelectedAssetIds([]);
    setSearchParams({});
    setPage(1);
  };

  const handleSortToggle = (field: string) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField('');
      setSortDirection('');
    }
    setPage(1);
  };

  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      const pageIds = assets.map(a => a.id);
      setSelectedAssetIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(assets.map(a => a.id));
      setSelectedAssetIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelectRow = (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const isAllCurrentPageSelected = assets.length > 0 && assets.every(a => selectedAssetIds.includes(a.id));
  const isSomeCurrentPageSelected = assets.some(a => selectedAssetIds.includes(a.id)) && !isAllCurrentPageSelected;

  const handlePrintSelected = () => {
    const selected = assets.filter(a => selectedAssetIds.includes(a.id));
    if (selected.length > 0) {
      setLabelModalAssets(selected);
      setIsLabelModalOpen(true);
    }
  };

  const handlePrintSingleLabel = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setLabelModalAssets([asset]);
    setIsLabelModalOpen(true);
  };

  // Active filters calculation
  const hasActiveFilters = Boolean(
    search.trim() ||
    selectedCategory ||
    selectedType ||
    selectedCondition ||
    selectedWarranty ||
    selectedAssigned ||
    startDate ||
    endDate ||
    activeTab !== 'all' ||
    sortField
  );

  const activeTypeName = types.find(t => String(t.id) === selectedType)?.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toast */}
      {successToast && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', backgroundColor: '#ECFDF3', border: '1px solid #D1FADF', color: '#065F46', padding: '10px 16px', borderRadius: '8px', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Asset Management"
        description="Hardware, laptops, peripherals, facilities, and workstation inventory"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsScanModalOpen(true)}
              leftIcon={<QrCode size={15} color="#2563EB" />}
            >
              Scan QR
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              isLoading={isExporting}
              leftIcon={<FileSpreadsheet size={15} color="#059669" />}
            >
              Export Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/assets/reports')}
              leftIcon={<BarChart2 size={15} />}
            >
              Reports
            </Button>
            {isITAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                leftIcon={<PlusCircle size={15} />}
              >
                Add Asset
              </Button>
            )}
          </div>
        }
      />

      {/* Interactive KPI Summary Cards */}
      <div className="stat-card-grid-5">
        <SummaryFilterCard
          title="Total Devices"
          count={stats?.total_assets ?? totalCount}
          icon={<Laptop size={16} />}
          isActive={activeCard === 'all'}
          accentColor="#2563EB"
          onClick={() => handleTabChange('all')}
        />

        <SummaryFilterCard
          title="Available"
          count={stats?.available ?? 0}
          icon={<CheckCircle2 size={16} />}
          isActive={activeCard === 'available'}
          accentColor="#059669"
          onClick={() => handleTabChange(activeCard === 'available' ? 'all' : 'available')}
        />

        <SummaryFilterCard
          title="Assigned"
          count={stats?.assigned ?? 0}
          icon={<UserCheck size={16} />}
          isActive={activeCard === 'assigned'}
          accentColor="#175CD3"
          onClick={() => handleTabChange(activeCard === 'assigned' ? 'all' : 'assigned')}
        />

        <SummaryFilterCard
          title="In Repair"
          count={stats?.in_repair ?? 0}
          icon={<Wrench size={16} />}
          isActive={activeCard === 'in_repair'}
          accentColor="#D97706"
          onClick={() => handleTabChange(activeCard === 'in_repair' ? 'all' : 'in_repair')}
        />

        <SummaryFilterCard
          title="Warranty Expiring"
          count={stats?.expiring_soon ?? 0}
          icon={<AlertTriangle size={16} />}
          isActive={activeCard === 'warranty_expiring'}
          accentColor="#DC2626"
          onClick={() => {
            if (activeCard === 'warranty_expiring') {
              handleTabChange('all');
            } else {
              setActiveCard('warranty_expiring');
              setSelectedWarranty('expiring_soon');
              setActiveTab('all');
              setSearchParams({ warranty: 'expiring_soon' });
              setPage(1);
            }
          }}
        />
      </div>

      {/* Status Tabs */}
      <SegmentedControl
        variant="tabs"
        value={activeTab}
        onChange={(val) => handleTabChange(val as typeof activeTab)}
        options={[
          { key: 'all', label: 'All Assets' },
          { key: 'available', label: 'Available', count: stats?.available },
          { key: 'assigned', label: 'Assigned', count: stats?.assigned },
          { key: 'in_repair', label: 'In Repair', count: stats?.in_repair },
          { key: 'retired_disposed', label: 'Retired / Disposed' },
        ]}
      />

      {/* Sleek Compact Top Bar (Global Search + Unified Filter Popover + Date Range Filter) */}
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
        {/* Left Controls: Global Search + Unified Filters Button */}
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
              placeholder="Search asset tag, serial number, model, assignee..."
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
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
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

          {/* Unified Filters Popover Button */}
          <div style={{ position: 'relative' }} ref={filterPopoverRef}>
            <button
              type="button"
              onClick={handleToggleFilterPopover}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                border: [
                  Boolean(selectedCategory),
                  Boolean(selectedType),
                  Boolean(selectedAssigned),
                  Boolean(selectedCondition),
                  Boolean(selectedWarranty),
                ].filter(Boolean).length > 0 ? '1px solid #2563EB' : '1px solid #E5E9F0',
                backgroundColor: [
                  Boolean(selectedCategory),
                  Boolean(selectedType),
                  Boolean(selectedAssigned),
                  Boolean(selectedCondition),
                  Boolean(selectedWarranty),
                ].filter(Boolean).length > 0 ? '#EFF6FF' : '#FFFFFF',
                color: [
                  Boolean(selectedCategory),
                  Boolean(selectedType),
                  Boolean(selectedAssigned),
                  Boolean(selectedCondition),
                  Boolean(selectedWarranty),
                ].filter(Boolean).length > 0 ? '#1E40AF' : '#344054',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Filter size={14} color={[
                Boolean(selectedCategory),
                Boolean(selectedType),
                Boolean(selectedAssigned),
                Boolean(selectedCondition),
                Boolean(selectedWarranty),
              ].filter(Boolean).length > 0 ? '#2563EB' : '#667085'} />
              <span>Filters</span>
              {[
                Boolean(selectedCategory),
                Boolean(selectedType),
                Boolean(selectedAssigned),
                Boolean(selectedCondition),
                Boolean(selectedWarranty),
              ].filter(Boolean).length > 0 && (
                <span
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {[
                    Boolean(selectedCategory),
                    Boolean(selectedType),
                    Boolean(selectedAssigned),
                    Boolean(selectedCondition),
                    Boolean(selectedWarranty),
                  ].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Filter Popover Dropdown Panel */}
            {isToolbarFilterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
                  zIndex: 100,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F4F7', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#172033' }}>
                    Filter Inventory
                  </span>
                  {[
                    Boolean(pendingCategory),
                    Boolean(pendingType),
                    Boolean(pendingAssigned),
                    Boolean(pendingCondition),
                    Boolean(pendingWarranty),
                    Boolean(selectedCategory),
                    Boolean(selectedType),
                    Boolean(selectedAssigned),
                    Boolean(selectedCondition),
                    Boolean(selectedWarranty),
                  ].some(Boolean) && (
                    <button
                      type="button"
                      onClick={handleResetPopoverFilters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* 1. Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Asset Category
                  </label>
                  <select
                    value={pendingCategory}
                    onChange={(e) => setPendingCategory(e.target.value)}
                    style={filterSelectStyle}
                  >
                    <option value="">All Categories</option>
                    <option value="it">IT Assets (ARCO-IT)</option>
                    <option value="admin_facilities">Admin & Facilities (ARCO-AD)</option>
                  </select>
                </div>

                {/* 2. Asset Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Asset Type
                  </label>
                  <select
                    value={pendingType}
                    onChange={(e) => setPendingType(e.target.value)}
                    style={filterSelectStyle}
                  >
                    <option value="">All Types</option>
                    {types.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name} ({t.asset_count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Assignment Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Assignment Status
                  </label>
                  <select
                    value={pendingAssigned}
                    onChange={(e) => setPendingAssigned(e.target.value)}
                    style={filterSelectStyle}
                  >
                    <option value="">All Devices</option>
                    <option value="assigned">Assigned Only</option>
                    <option value="unassigned">Unassigned (Available Stock)</option>
                  </select>
                </div>

                {/* 4. Condition */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Physical Condition
                  </label>
                  <select
                    value={pendingCondition}
                    onChange={(e) => setPendingCondition(e.target.value)}
                    style={filterSelectStyle}
                  >
                    <option value="">All Conditions</option>
                    <option value="new">New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>

                {/* 5. Warranty */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Warranty Coverage
                  </label>
                  <select
                    value={pendingWarranty}
                    onChange={(e) => setPendingWarranty(e.target.value)}
                    style={filterSelectStyle}
                  >
                    <option value="">All Warranties</option>
                    <option value="active">Active Warranty</option>
                    <option value="expiring_soon">Expiring Soon (≤30d)</option>
                    <option value="expired">Expired Warranty</option>
                  </select>
                </div>

                {/* Popover Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #F2F4F7' }}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleApplyToolbarFilters}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
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
          {hasActiveFilters && (
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

      {/* Active Filter Chips / Pills Bar */}
      {hasActiveFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            padding: '2px 4px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#667085', fontWeight: 500, marginRight: '2px' }}>Filtered by:</span>

          {search.trim() && (
            <span style={activePillStyle}>
              Search: "{search.trim()}"
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSearch(''); setPage(1); }} />
            </span>
          )}

          {selectedCategory && (
            <span style={activePillStyle}>
              Category: {selectedCategory === 'it' ? 'IT Assets' : 'Admin & Facilities'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCategory(''); setPage(1); }} />
            </span>
          )}

          {selectedType && (
            <span style={activePillStyle}>
              Type: {activeTypeName || 'Selected'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedType(''); setPage(1); }} />
            </span>
          )}

          {selectedAssigned && (
            <span style={activePillStyle}>
              Assignment: {selectedAssigned === 'assigned' ? 'Assigned' : 'Unassigned'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedAssigned(''); setPage(1); }} />
            </span>
          )}

          {selectedCondition && (
            <span style={activePillStyle}>
              Condition: {selectedCondition.charAt(0).toUpperCase() + selectedCondition.slice(1)}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCondition(''); setPage(1); }} />
            </span>
          )}

          {selectedWarranty && (
            <span style={activePillStyle}>
              Warranty: {selectedWarranty === 'expiring_soon' ? 'Expiring Soon' : selectedWarranty === 'active' ? 'Active' : 'Expired'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedWarranty(''); setActiveCard('all'); setPage(1); }} />
            </span>
          )}

          {activeTab !== 'all' && (
            <span style={activePillStyle}>
              Status: {activeTab === 'available' ? 'Available' : activeTab === 'assigned' ? 'Assigned' : activeTab === 'in_repair' ? 'In Repair' : 'Retired'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleTabChange('all')} />
            </span>
          )}

          {(startDate || endDate) && (
            <span style={activePillStyle}>
              Date: {startDate || '—'} to {endDate || '—'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} />
            </span>
          )}

          {sortField && (
            <span style={activePillStyle}>
              Sort: {sortField.replace('_', ' ')} ({sortDirection})
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSortField(''); setSortDirection(''); setPage(1); }} />
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563EB',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'underline',
              padding: '2px 6px',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Bulk Multi-Select Action Bar */}
      {selectedAssetIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1E40AF',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>{selectedAssetIds.length} asset{selectedAssetIds.length > 1 ? 's' : ''} selected</span>
            <span style={{ color: '#93C5FD' }}>|</span>
            <button
              type="button"
              onClick={() => setSelectedAssetIds([])}
              style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '13px' }}
            >
              Deselect all
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExportQRData('csv')}
              isLoading={isExportingQR}
              leftIcon={<FileText size={14} color="#2563EB" />}
              style={{ backgroundColor: '#FFFFFF' }}
              title="Export CSV for external sticker design tools (Figma, Illustrator, BarTender, Zebra Designer)"
            >
              Export QR / Label Data ({selectedAssetIds.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrintSelected}
              leftIcon={<Printer size={14} />}
            >
              Print Selected Labels ({selectedAssetIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card noPadding style={{ overflow: 'visible' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#667085' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563EB' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading assets...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#B42318' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{error}</p>
            <Button variant="secondary" onClick={fetchAssets} style={{ marginTop: '12px' }}>Retry</Button>
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            icon={<Laptop size={28} color="#98A2B3" />}
            title="No Assets Found"
            description="Try clearing search criteria or adjusting your active column filters."
            action={
              hasActiveFilters ? (
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
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Assets Table">
            <table style={{ width: '100%', minWidth: '1030px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {/* Select All Checkbox */}
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 30, backgroundColor: '#F8FAFC', width: '40px', minWidth: '40px', maxWidth: '40px', padding: '10px 8px', borderBottom: '1px solid #E5E9F0', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={el => { if (el) el.indeterminate = isSomeCurrentPageSelected; }}
                      onChange={e => handleSelectAllCurrentPage(e.target.checked)}
                      style={{ cursor: 'pointer', borderRadius: '4px', width: '15px', height: '15px' }}
                      title="Select all assets on this page"
                    />
                  </th>

                  {/* Asset Tag */}
                  <DataTableHeaderCell
                    title="Asset Tag"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    isSticky
                    stickyLeft="40px"
                    style={{ borderRight: '1px solid #E5E9F0' }}
                    sortField="asset_tag"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Type Column */}
                  <DataTableHeaderCell
                    title="Type"
                    width="100px"
                    minWidth="95px"
                    sortField="asset_type__name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Device & Model */}
                  <DataTableHeaderCell
                    title="Device & Model"
                    width="200px"
                    minWidth="180px"
                    sortField="name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Serial Number */}
                  <DataTableHeaderCell
                    title="Serial Number"
                    width="120px"
                    minWidth="110px"
                    sortField="serial_number"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Assigned To */}
                  <DataTableHeaderCell
                    title="Assigned To"
                    width="135px"
                    minWidth="125px"
                    sortField="assigned_to__full_name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Status */}
                  <DataTableHeaderCell
                    title="Status"
                    width="100px"
                    minWidth="95px"
                    sortField="status"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Condition */}
                  <DataTableHeaderCell
                    title="Condition"
                    width="95px"
                    minWidth="90px"
                    sortField="condition"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Warranty */}
                  <DataTableHeaderCell
                    title="Warranty"
                    width="115px"
                    minWidth="105px"
                    sortField="warranty_end_date"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSortToggle={handleSortToggle}
                  />

                  {/* Actions Column */}
                  <DataTableHeaderCell
                    title="Action"
                    width="90px"
                    minWidth="85px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  const deviceSubtitle = getDeviceSubtitle(asset);
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetDrawerId(asset.id)}
                      style={{ backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF', cursor: 'pointer', transition: 'background-color 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = isSelected ? '#E0EFFF' : '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = isSelected ? '#F0F7FF' : '#FFFFFF'}
                    >
                      <td
                        style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '40px', minWidth: '40px', maxWidth: '40px', padding: '8px 8px', borderBottom: '1px solid #F5F7FA', textAlign: 'center', verticalAlign: 'middle' }}
                        onClick={(e) => handleToggleSelectRow(asset.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', borderRadius: '4px', width: '15px', height: '15px' }}
                        />
                      </td>
                      <td style={{ position: 'sticky', left: '40px', zIndex: 4, backgroundColor: 'inherit', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '8px 12px', fontWeight: 600, color: '#175CD3', fontFamily: 'monospace', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{asset.asset_tag}</span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: asset.category === 'admin_facilities' ? '#F3F4F6' : '#EFF6FF',
                            color: asset.category === 'admin_facilities' ? '#4B5563' : '#2563EB',
                            border: `1px solid ${asset.category === 'admin_facilities' ? '#E5E7EB' : '#BFDBFE'}`,
                          }}>
                            {asset.category === 'admin_facilities' ? 'AD' : 'IT'}
                          </span>
                        </div>
                      </td>
                      <td style={{ width: '100px', minWidth: '95px', padding: '8px 12px', color: '#475467', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'block', fontWeight: 500 }} className="cell-truncate-1" title={asset.asset_type_name}>{asset.asset_type_name}</span>
                      </td>
                      <td style={{ width: '200px', minWidth: '180px', padding: '8px 12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 500, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={asset.name}>{asset.name}</div>
                        {deviceSubtitle && (
                          <div style={{ fontSize: '12px', color: '#667085', lineHeight: 1.3, marginTop: '2px', wordBreak: 'break-word' }} className="cell-truncate-2" title={deviceSubtitle}>{deviceSubtitle}</div>
                        )}
                      </td>
                      <td style={{ width: '120px', minWidth: '110px', padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#475569', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'block' }} className="cell-truncate-1" title={asset.serial_number || undefined}>{asset.serial_number || '—'}</span>
                      </td>
                      <td style={{ width: '135px', minWidth: '125px', padding: '8px 12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        {asset.assigned_to_name ? (
                          <div
                            onClick={(e) => {
                              if (asset.assigned_to) {
                                e.stopPropagation();
                                setSelected360EmployeeId(asset.assigned_to);
                              }
                            }}
                            style={{ cursor: asset.assigned_to ? 'pointer' : 'default', lineHeight: 1.3 }}
                            title={asset.assigned_to ? 'Click to view Employee 360' : undefined}
                          >
                            <span style={{ fontWeight: 500, color: '#175CD3', display: 'block' }} className="cell-truncate-1" title={asset.assigned_to_name}>{asset.assigned_to_name}</span>
                            <span style={{ fontSize: '11px', color: '#667085', display: 'block' }}>{asset.assigned_to_code}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#98A2B3', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ width: '100px', minWidth: '95px', padding: '8px 12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <AssetStatusBadge status={asset.status} />
                      </td>
                      <td style={{ width: '95px', minWidth: '90px', padding: '8px 12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <AssetConditionBadge condition={asset.condition} />
                      </td>
                      <td style={{ width: '115px', minWidth: '105px', padding: '8px 12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <WarrantyBadge status={asset.warranty_status} endDate={asset.warranty_end_date} />
                      </td>
                      <td style={{ width: '90px', minWidth: '85px', padding: '8px 8px', borderBottom: '1px solid #F5F7FA', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isITAdmin && asset.status === 'assigned' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassignModalAsset(asset);
                              }}
                              title="Reassign / Redistribute Asset"
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 6px', fontSize: '12px', color: '#2563EB' }}
                            >
                              <ArrowRightLeft size={13} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handlePrintSingleLabel(asset, e)}
                            title="Print Label"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 6px', fontSize: '12px', color: '#475467' }}
                          >
                            <Printer size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetDrawerId(asset.id);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px' }}
                          >
                            <Eye size={13} /> View
                          </Button>
                        </div>
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
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={loading}
          itemName="assets"
        />
      </Card>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setSuccessToast('Asset created successfully.');
          setTimeout(() => setSuccessToast(null), 4000);
          fetchAssets();
        }}
      />

      {/* Reassign Modal */}
      {reassignModalAsset && (
        <ReassignAssetModal
          asset={reassignModalAsset}
          isOpen={!!reassignModalAsset}
          onClose={() => setReassignModalAsset(null)}
          onSuccess={() => {
            setSuccessToast(`Asset ${reassignModalAsset.asset_tag} successfully reassigned.`);
            setTimeout(() => setSuccessToast(null), 4000);
            setReassignModalAsset(null);
            fetchAssets();
          }}
        />
      )}

      {/* QR Scanner Modal */}
      <ScanAssetQRModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />

      {/* QR Label Print Modal */}
      <AssetLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        assets={labelModalAssets}
        title={labelModalAssets.length > 1 ? `Print ${labelModalAssets.length} Physical Asset Labels` : `Print Asset Label — ${labelModalAssets[0]?.asset_tag || ''}`}
      />

      {/* Asset Detail Drawer */}
      <AssetDetailDrawer
        assetId={selectedAssetDrawerId}
        isOpen={!!selectedAssetDrawerId}
        onClose={() => setSelectedAssetDrawerId(null)}
        onUpdated={fetchAssets}
        onOpenEmployee360={(empId) => setSelected360EmployeeId(empId)}
      />

      {/* Employee 360 Slide-Over Drawer */}
      <Employee360Drawer
        employeeId={selected360EmployeeId}
        isOpen={!!selected360EmployeeId}
        onClose={() => setSelected360EmployeeId(null)}
        onOpenAsset={(assetId) => setSelectedAssetDrawerId(assetId)}
        onOpenServiceDesk={(item) => setSelectedServiceDeskItem(item)}
        onOpenProcurement={(prId) => setSelectedProcurementId(prId)}
        onUpdated={fetchAssets}
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
        onUpdated={fetchAssets}
      />
    </div>
  );
};

// ── Micro Styles & Render Helpers ───────────────────────────────────────────

const headerTitleSortStyle = (isActiveSort: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  userSelect: 'none',
  color: isActiveSort ? '#175CD3' : '#667085',
  fontWeight: isActiveSort ? 700 : 600,
});

const activePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  backgroundColor: '#EFF6FF',
  border: '1px solid #BFDBFE',
  color: '#1E40AF',
  padding: '2px 8px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: 500,
};

const categoryBadgeStyle = (cat: string): React.CSSProperties => ({
  fontSize: '9px',
  fontWeight: 700,
  padding: '1px 5px',
  borderRadius: '4px',
  backgroundColor: cat === 'admin_facilities' ? '#F3F4F6' : '#EFF6FF',
  color: cat === 'admin_facilities' ? '#4B5563' : '#2563EB',
  border: `1px solid ${cat === 'admin_facilities' ? '#E5E7EB' : '#BFDBFE'}`,
});

const filterSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid #D0D5DD',
  fontSize: '13px',
  backgroundColor: '#FFFFFF',
  color: '#101828',
  outline: 'none',
  boxSizing: 'border-box',
};

const getDeviceSubtitle = (asset: Asset): string | null => {
  const makeModel = `${asset.manufacturer || ''} ${asset.model || ''}`.trim();
  if (!makeModel) return null;
  const nameLower = (asset.name || '').toLowerCase();
  const makeLower = (asset.manufacturer || '').toLowerCase();
  const modelLower = (asset.model || '').toLowerCase();

  // If name already equals the whole make & model, avoid repeating
  if (nameLower === makeModel.toLowerCase()) {
    return null;
  }
  // If name contains both model and manufacturer, avoid repeating
  if (modelLower && nameLower.includes(modelLower) && makeLower && nameLower.includes(makeLower)) {
    return null;
  }
  // If name contains model, only show manufacturer if not present in name
  if (modelLower && nameLower.includes(modelLower)) {
    return !nameLower.includes(makeLower) && asset.manufacturer ? asset.manufacturer : null;
  }
  return makeModel;
};
