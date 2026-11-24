// frontend/src/pages/assets/AssetReports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Laptop,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  Package,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
} from 'lucide-react';

import { assetsReportsApi, AssetReportsSummary, AssetReportFilters } from '../../api/assetsReports';
import { assetsApi } from '../../api/assets';
import { employeesApi } from '../../api/employees';
import { Button, Card, Input } from '../../components/ui';
import { AssetStatusBadge, AssetConditionBadge, WarrantyBadge } from '../../components/assets/AssetBadges';
import type { Asset, AssetType, Department } from '../../types';
import { sortAssetTypes } from '../../utils/assets';

interface PresetTab {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

const PRESET_TABS: PresetTab[] = [
  {
    id: 'master_inventory',
    label: 'Master Inventory',
    description: 'Complete hardware inventory across all branches and locations',
    icon: <Laptop size={18} />,
    accent: '#2563EB',
  },
  {
    id: 'department_allocation',
    label: 'Dept Allocation',
    description: 'Hardware distribution and equipment expenditure grouped by department',
    icon: <Building2 size={18} />,
    accent: '#0891B2',
  },
  {
    id: 'warranty_lifecycle',
    label: 'Warranty & Lifecycle',
    description: 'Warranty expiration tracking, upcoming renewals, and end-of-life audit',
    icon: <ShieldCheck size={18} />,
    accent: '#F59E0B',
  },
  {
    id: 'available_pool',
    label: 'Available Stock',
    description: 'Unassigned devices in inventory ready for immediate employee deployment',
    icon: <CheckCircle2 size={18} />,
    accent: '#059669',
  },
  {
    id: 'maintenance_repair',
    label: 'Repairs & Retired',
    description: 'Assets currently under servicing, repair, damaged, or retired from service',
    icon: <Wrench size={18} />,
    accent: '#DC2626',
  },
  {
    id: 'custody_acknowledgment',
    label: 'Custody & Compliance',
    description: 'Employee custody tracking and electronic receipt acknowledgement status',
    icon: <UserCheck size={18} />,
    accent: '#7C3AED',
  },
];

export const AssetReports: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activePreset, setActivePreset] = useState<string>('master_inventory');
  const [summary, setSummary] = useState<AssetReportsSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 12;

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingWord, setExportingWord] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial load for types and departments
  useEffect(() => {
    Promise.all([
      assetsApi.getAssetTypes().catch(() => []),
      employeesApi.departments().catch(() => []),
    ]).then(([typesData, deptsData]) => {
      setTypes(sortAssetTypes(typesData));
      setDepartments(deptsData);
    });
  }, []);

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    try {
      const data = await assetsReportsApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load asset report summary:', err);
    }
  }, []);

  // Fetch preview data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AssetReportFilters = {
        report_type: activePreset,
        department_id: departmentFilter || undefined,
        asset_type: typeFilter || undefined,
        status: statusFilter || undefined,
        warranty: warrantyFilter || undefined,
        search: searchFilter.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      };

      const res = await assetsReportsApi.getData(filters);
      setAssets(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error('Failed to load asset report preview data:', err);
      setAssets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activePreset, departmentFilter, typeFilter, statusFilter, warrantyFilter, searchFilter, page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Preset change
  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId);
    setPage(1);
    // Reset specific conflicting filters when preset changes
    if (presetId === 'available_pool') {
      setStatusFilter('available');
    } else if (presetId === 'maintenance_repair') {
      setStatusFilter('');
    } else if (presetId === 'custody_acknowledgment') {
      setStatusFilter('assigned');
    } else {
      setStatusFilter('');
    }
  };

  const resetFilters = () => {
    setDepartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setWarrantyFilter('');
    setSearchFilter('');
    setPage(1);
  };

  // Export handlers
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const filters: AssetReportFilters = {
        report_type: activePreset,
        department_id: departmentFilter || undefined,
        asset_type: typeFilter || undefined,
        status: statusFilter || undefined,
        warranty: warrantyFilter || undefined,
        search: searchFilter.trim() || undefined,
      };
      await assetsReportsApi.exportExcel(filters);
      showToast('Excel report (.xlsx) downloaded successfully!');
    } catch (err) {
      console.error('Excel export failed:', err);
      showToast('Export failed. Please check network and try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      const filters: AssetReportFilters = {
        report_type: activePreset,
        department_id: departmentFilter || undefined,
        asset_type: typeFilter || undefined,
        status: statusFilter || undefined,
        warranty: warrantyFilter || undefined,
        search: searchFilter.trim() || undefined,
      };
      await assetsReportsApi.exportWord(filters);
      showToast('Word report (.docx) downloaded successfully!');
    } catch (err) {
      console.error('Word export failed:', err);
      showToast('Export failed. Please check network and try again.');
    } finally {
      setExportingWord(false);
    }
  };

  // Dynamic values for KPI cards based on active preset and summary
  const activeTabMeta = PRESET_TABS.find(t => t.id === activePreset) || PRESET_TABS[0];
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Calculate total valuation of loaded preview rows as indicator
  const previewValuation = assets.reduce((acc, a) => acc + (parseFloat(a.purchase_price as any) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#172033',
            color: '#FFFFFF',
            border: '1px solid #2563EB',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="#2FB4E5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <button
              type="button"
              onClick={() => navigate('/assets')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E9F0';
                e.currentTarget.style.color = '#172033';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.color = '#475467';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                color: '#475467',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeft size={16} strokeWidth={2.2} style={{ color: '#2563EB' }} />
              <span>Back to Assets</span>
            </button>
            <span style={{ color: '#E5E9F0' }}>|</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
              Asset Reports & Analytics
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172033', margin: 0 }}>
            Asset Reports & Document Exports
          </h1>
          <p style={{ fontSize: '14px', color: '#667085', margin: '4px 0 0 0' }}>
            Generate executive summaries, department allocations, warranty audits, and downloadable Excel & Word reports
          </p>
        </div>

        {/* Global Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', maxWidth: '100%' }}>

          <Button
            onClick={handleExportExcel}
            disabled={exportingExcel || totalCount === 0}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <FileSpreadsheet size={16} />
            {exportingExcel ? 'Generating Excel...' : 'Export to Excel (.xlsx)'}
          </Button>

          <Button
            onClick={handleExportWord}
            disabled={exportingWord || totalCount === 0}
            style={{
              backgroundColor: '#1E40AF',
              borderColor: '#1E40AF',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <FileText size={16} />
            {exportingWord ? 'Generating Word...' : 'Export to Word (.docx)'}
          </Button>
        </div>
      </div>

      {/* Preset Report Selection Tabs */}
      <div className="asset-report-presets-grid">
        {PRESET_TABS.map(tab => {
          const isSelected = activePreset === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handlePresetChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: isSelected ? '#FFFFFF' : '#F8FAFC',
                border: isSelected ? `2px solid ${tab.accent}` : '1px solid #E5E9F0',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? `${tab.accent}15` : '#E5E9F0',
                  color: isSelected ? tab.accent : '#667085',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tab.icon}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? tab.accent : '#172033' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px', lineHeight: 1.3 }}>
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Assets in Scope */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Scoped Assets
            </span>
            <div style={{ padding: '6px', backgroundColor: '#EFF6FF', borderRadius: '6px', color: '#2563EB' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#172033' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            Matches current report & filters
          </div>
        </div>

        {/* Card 2: Total Valuation in Scope */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Portfolio Valuation
            </span>
            <div style={{ padding: '6px', backgroundColor: '#ECFDF3', borderRadius: '6px', color: '#059669' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
            ₹{(summary?.total_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            Total hardware capital value
          </div>
        </div>

        {/* Card 3: Custody Compliance / Active Ratio */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Deployment Rate
            </span>
            <div style={{ padding: '6px', backgroundColor: '#F5F3FF', borderRadius: '6px', color: '#7C3AED' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#7C3AED' }}>
            {summary?.total_assets ? Math.round(((summary.by_status.assigned || 0) / summary.total_assets) * 100) : 0}%
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            {summary?.by_status.assigned || 0} assigned of {summary?.total_assets || 0} total
          </div>
        </div>

        {/* Card 4: Action / Attention Needed */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Attention Needed
            </span>
            <div style={{ padding: '6px', backgroundColor: '#FEF2F2', borderRadius: '6px', color: '#DC2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#DC2626' }}>
            {(summary?.warranty.expiring_30 || 0) + (summary?.by_status.in_repair || 0) + (summary?.custody.pending_acknowledgment || 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            {summary?.warranty.expiring_30 || 0} expiring warranties, {summary?.custody.pending_acknowledgment || 0} unacknowledged
          </div>
        </div>
      </div>

      {/* Visual Distribution Summary Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Department Allocation Progress Bars */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Building2 size={16} color="#2563EB" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: 0 }}>
              Department Allocation Distribution
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(summary?.by_department || []).slice(0, 5).map(dept => {
              const pct = summary?.total_assets ? Math.round((dept.count / summary.total_assets) * 100) : 0;
              return (
                <div key={dept.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: '#172033' }}>{dept.name}</span>
                    <span style={{ color: '#667085' }}>
                      {dept.count} devices ({pct}%) · ₹{Number(dept.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F5F7FA', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: dept.id === 0 ? '#98A2B3' : '#2563EB',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution Bars */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Layers size={16} color="#059669" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#172033', margin: 0 }}>
              Hardware Lifecycle & Status Breakdown
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Available (In Stock)', count: summary?.by_status.available || 0, color: '#059669' },
              { label: 'Assigned to Staff', count: summary?.by_status.assigned || 0, color: '#2563EB' },
              { label: 'In Repair / Servicing', count: summary?.by_status.in_repair || 0, color: '#D97706' },
              { label: 'Damaged / Lost', count: (summary?.by_status.damaged || 0) + (summary?.by_status.lost || 0), color: '#DC2626' },
              { label: 'Retired / Disposed', count: (summary?.by_status.retired || 0) + (summary?.by_status.disposed || 0), color: '#667085' },
            ].map(item => {
              const pct = summary?.total_assets ? Math.round((item.count / summary.total_assets) * 100) : 0;
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: '#172033' }}>{item.label}</span>
                    <span style={{ color: '#667085' }}>
                      {item.count} devices ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F5F7FA', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: item.color,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E9F0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={15} color="#2563EB" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#172033' }}>
            Filter Report Data
          </span>
          <span style={{ fontSize: '12px', color: '#667085' }}>
            (Live table preview and file exports both reflect these filters)
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          {/* Department Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Asset Type Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Asset Type
            </label>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">All Types</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="in_repair">In Repair</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="retired">Retired</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>

          {/* Warranty Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Warranty
            </label>
            <select
              value={warrantyFilter}
              onChange={e => { setWarrantyFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">All Warranty States</option>
              <option value="active">Active Coverage</option>
              <option value="expiring_soon">Expiring in 30 Days</option>
              <option value="expiring_60">Expiring in 60 Days</option>
              <option value="expired">Expired Warranty</option>
              <option value="no_warranty">No Warranty</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Keyword Search
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tag, make, serial, user..."
                value={searchFilter}
                onChange={e => { setSearchFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px 0 30px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <Search size={14} color="#98A2B3" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Reset Button */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              style={{ height: '36px', padding: '0 12px', fontSize: '12px', color: '#667085', width: '100%' }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Live Data Preview Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E5E9F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#172033' }}>
              {activeTabMeta.label} — Live Data Preview
            </div>
            <div style={{ fontSize: '12px', color: '#667085' }}>
              Showing {assets.length} of {totalCount} matching hardware assets
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#667085', marginRight: '6px' }}>
              Download current view:
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={exportingExcel || totalCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
            >
              <FileSpreadsheet size={13} color="#059669" />
              Excel (.xlsx)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportWord}
              disabled={exportingWord || totalCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
            >
              <FileText size={13} color="#1E40AF" />
              Word (.docx)
            </Button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#667085' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563EB' }} />
            <div>Loading asset report preview...</div>
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#98A2B3' }}>
            <Package size={36} color="#E5E9F0" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>No assets match this report criteria</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting filters or choosing another report preset.</div>
          </div>
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Asset Reports Table">
            <table style={{ width: '100%', minWidth: '1020px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, backgroundColor: '#F8FAFC', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Asset Tag</th>
                  <th style={{ position: 'sticky', top: 0, left: '120px', zIndex: 20, backgroundColor: '#F8FAFC', width: '190px', minWidth: '170px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>Device Name</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '160px', minWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Make / Model</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Serial No</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '100px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '150px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Custodian / Dept</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Warranty</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '95px', minWidth: '90px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Price</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '75px', minWidth: '70px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    style={{
                      borderBottom: '1px solid #F5F7FA',
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Tag */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontFamily: 'monospace' }}>
                      <Link to={`/assets/${asset.id}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                        {asset.asset_tag}
                      </Link>
                    </td>

                    {/* Name & Type */}
                    <td style={{ position: 'sticky', left: '120px', zIndex: 4, backgroundColor: 'inherit', width: '190px', minWidth: '170px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: '#172033', maxWidth: '100%' }} className="cell-truncate-1" title={asset.name}>{asset.name}</div>
                      <div style={{ fontSize: '11px', color: '#667085', maxWidth: '100%' }} className="cell-truncate-1">{asset.asset_type_name || 'Device'}</div>
                    </td>

                    {/* Make / Model */}
                    <td style={{ width: '160px', minWidth: '140px', padding: '10px 14px', color: '#475467', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div style={{ maxWidth: '100%' }} className="cell-truncate-1" title={`${asset.manufacturer || ''} ${asset.model || ''}`}>{asset.manufacturer} {asset.model}</div>
                    </td>

                    {/* Serial */}
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', fontFamily: 'monospace', color: '#475569', fontSize: '12px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <span className="cell-truncate-1" style={{ display: 'block', maxWidth: '100%' }}>{asset.serial_number || '—'}</span>
                    </td>

                    {/* Status */}
                    <td style={{ width: '110px', minWidth: '100px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <AssetStatusBadge status={asset.status} />
                    </td>

                    {/* Custodian & Dept */}
                    <td style={{ width: '150px', minWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {asset.assigned_to_name ? (
                        <div style={{ maxWidth: '100%' }}>
                          <div style={{ fontWeight: 500, color: '#172033' }} className="cell-truncate-1" title={asset.assigned_to_name}>{asset.assigned_to_name}</div>
                          <div style={{ fontSize: '11px', color: '#667085' }} className="cell-truncate-1">{asset.assigned_to_code}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#98A2B3', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Warranty */}
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <WarrantyBadge status={asset.warranty_status} endDate={asset.warranty_end_date} />
                    </td>

                    {/* Price */}
                    <td style={{ width: '95px', minWidth: '90px', padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#172033', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {asset.purchase_price ? `₹${parseFloat(String(asset.purchase_price)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>

                    {/* Action */}
                    <td style={{ width: '75px', minWidth: '70px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <Link
                        to={`/assets/${asset.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                        }}
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: '#667085',
          }}
        >
          <div>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total assets)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} /> Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

