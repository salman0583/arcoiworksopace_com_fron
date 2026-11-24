// frontend/src/pages/rewards/RewardReports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  Building2,
  Sparkles,
  PackageCheck,
  Layers,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Package,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Send,
  Users,
} from 'lucide-react';

import { rewardsReportsApi, RewardReportsSummary, RewardReportFilters } from '../../api/rewardsReports';
import { rewardsApi } from '../../api/rewards';
import { employeesApi } from '../../api/employees';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { RewardCategoryBadge, ProgramTypeBadge } from '../../components/rewards/RewardBadges';
import { formatDate, formatCurrency } from '../../utils/formatters';
import type { RewardDistribution, EngagementProgramListItem } from '../../types/rewards';
import type { Department } from '../../types';

interface PresetTab {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

const PRESET_TABS: PresetTab[] = [
  {
    id: 'master_distribution',
    label: 'Master Distribution',
    description: 'Complete audit log of all reward items disbursed across all programs',
    icon: <Gift size={18} />,
    accent: '#2563EB',
  },
  {
    id: 'department_allocation',
    label: 'Dept Allocation',
    description: 'Reward disbursements and item allocation grouped by employee department',
    icon: <Building2 size={18} />,
    accent: '#0891B2',
  },
  {
    id: 'program_summary',
    label: 'Program Overview',
    description: 'Engagement initiatives with planned items, disbursed volumes and budgets',
    icon: <Sparkles size={18} />,
    accent: '#7C3AED',
  },
  {
    id: 'inventory_stock',
    label: 'Stock & Inventory',
    description: 'Remaining stock balance and procurement tracking per reward category',
    icon: <PackageCheck size={18} />,
    accent: '#059669',
  },
  {
    id: 'category_analysis',
    label: 'Category Breakdown',
    description: 'Distribution analysis across Physical Gifts, Vouchers, Merchandise and Awards',
    icon: <Layers size={18} />,
    accent: '#D97706',
  },
  {
    id: 'recipient_audit',
    label: 'Recipient Audit',
    description: 'Beneficiary disbursement logs, repeat recipients, and employee reward history',
    icon: <UserCheck size={18} />,
    accent: '#DC2626',
  },
];

export const RewardReports: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activePreset, setActivePreset] = useState<string>('master_distribution');
  const [summary, setSummary] = useState<RewardReportsSummary | null>(null);
  const [distributions, setDistributions] = useState<RewardDistribution[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [programs, setPrograms] = useState<EngagementProgramListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingWord, setExportingWord] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial load for departments and programs
  useEffect(() => {
    Promise.all([
      rewardsApi.listPrograms().catch(() => ({ results: [] })),
      employeesApi.departments().catch(() => []),
    ]).then(([progData, deptsData]) => {
      setPrograms(progData.results || []);
      setDepartments(deptsData);
    });
  }, []);

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    try {
      const data = await rewardsReportsApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load reward report summary:', err);
    }
  }, []);

  // Fetch preview data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: RewardReportFilters = {
        report_type: activePreset,
        program: programFilter || undefined,
        category: categoryFilter || undefined,
        department: departmentFilter || undefined,
        search: searchFilter.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      };

      const res = await rewardsReportsApi.getData(filters);
      setDistributions(res.results || []);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Failed to load report preview data:', err);
    } finally {
      setLoading(false);
    }
  }, [activePreset, programFilter, categoryFilter, departmentFilter, searchFilter, page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Preset Change
  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId);
    setPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchFilter('');
    setProgramFilter('');
    setCategoryFilter('');
    setDepartmentFilter('');
    setPage(1);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const filters: RewardReportFilters = {
        report_type: activePreset,
        program: programFilter || undefined,
        category: categoryFilter || undefined,
        department: departmentFilter || undefined,
        search: searchFilter.trim() || undefined,
      };
      await rewardsReportsApi.exportExcel(filters);
      showToast('Excel report downloaded successfully.');
    } catch (err) {
      console.error('Excel export failed:', err);
      showToast('Failed to export Excel report.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Export to Word
  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      const filters: RewardReportFilters = {
        report_type: activePreset,
        program: programFilter || undefined,
        category: categoryFilter || undefined,
        department: departmentFilter || undefined,
        search: searchFilter.trim() || undefined,
      };
      await rewardsReportsApi.exportWord(filters);
      showToast('Executive Word report generated successfully.');
    } catch (err) {
      console.error('Word export failed:', err);
      showToast('Failed to export Word report.');
    } finally {
      setExportingWord(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentTab = PRESET_TABS.find((t) => t.id === activePreset) || PRESET_TABS[0];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Navigation & Actions */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/rewards')}
          className="detail-back-button"
          style={{ marginBottom: '14px' }}
        >
          <ArrowLeft size={16} color="#2563EB" />
          <span>Back to Rewards & Recognition</span>
        </button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <Gift size={20} />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172033', margin: 0 }}>
                Rewards & Recognition Reports
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0 46px' }}>
              Executive audit analytics, department allocations, stock balance, and document export engine.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportExcel}
              isLoading={exportingExcel}
              leftIcon={<FileSpreadsheet size={16} color="#10B981" />}
            >
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExportWord}
              isLoading={exportingWord}
              leftIcon={<FileText size={16} />}
            >
              Executive Report (.docx)
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Preset Tabs Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {PRESET_TABS.map((tab) => {
          const isSelected = activePreset === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handlePresetChange(tab.id)}
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : '#F8FAFC',
                border: isSelected ? `2px solid ${tab.accent}` : '1px solid #E5E9F0',
                borderRadius: '10px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    color: isSelected ? tab.accent : '#667085',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {isSelected && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: tab.accent,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#667085',
                  lineHeight: '1.4',
                }}
              >
                {tab.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. 4 KPI Scoped Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: '4px solid #2563EB',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Total Programs
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033' }}>
            {summary?.total_programs ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            {summary?.active_programs ?? 0} active / in progress
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: '4px solid #7C3AED',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Units Procured
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033' }}>
            {summary?.total_items_procured ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            Across all reward categories
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: '4px solid #D97706',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Units Distributed
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>
            {summary?.total_units_distributed ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            To {summary?.unique_recipients ?? 0} unique employees
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: '4px solid #059669',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Remaining in Stock
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
            {summary?.total_units_remaining ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
            Ready for future disbursement
          </div>
        </div>
      </div>

      {/* 4. Dual Visual Breakdown Progress Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Category Allocation */}
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#2563EB" />
            <span>Category Procurement vs Distributed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary?.by_category && summary.by_category.length > 0 ? (
              summary.by_category.map((cat) => {
                const pct = cat.procured > 0 ? Math.round((cat.distributed / cat.procured) * 100) : 0;
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#475467' }}>{cat.label}</span>
                      <span style={{ color: '#667085' }}>
                        {cat.distributed} / {cat.procured} units ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#F5F7FA', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: '#2563EB',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '13px', color: '#98A2B3', textAlign: 'center', padding: '20px 0' }}>
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution Allocation */}
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="#0891B2" />
            <span>Top Department Disbursal Volume</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary?.by_department && summary.by_department.length > 0 ? (
              summary.by_department.slice(0, 5).map((dept) => {
                const totalDist = summary.total_units_distributed || 1;
                const pct = Math.round((dept.distributed_count / totalDist) * 100);
                return (
                  <div key={dept.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#475467' }}>{dept.name}</span>
                      <span style={{ color: '#667085' }}>
                        {dept.distributed_count} units • {dept.recipients_count} recipients
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#F5F7FA', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: '#0891B2',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '13px', color: '#98A2B3', textAlign: 'center', padding: '20px 0' }}>
                No department distribution data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Filter Toolbar */}
      <div className="filter-toolbar-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
          <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <Input
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, item, program, recipient, or department..."
              leftIcon={<Search size={16} color="#98A2B3" />}
            />
          </div>

          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setPage(1);
              }}
              className="standard-select"
              aria-label="Filter by program"
            >
              <option value="">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="standard-select"
              aria-label="Filter by reward category"
            >
              <option value="">All Categories</option>
              <option value="physical">Physical Item</option>
              <option value="voucher">Voucher</option>
              <option value="merchandise">Merchandise</option>
              <option value="digital">Digital Reward</option>
              <option value="gift">Gift</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="standard-select"
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {(searchFilter || programFilter || categoryFilter || departmentFilter) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} leftIcon={<RotateCcw size={14} />}>
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* 6. Preview Data Table */}
      <div className="data-table-card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E9F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>
            {currentTab.label} Preview ({totalCount} records)
          </div>
          <span style={{ fontSize: '12px', color: '#667085' }}>
            Showing page {page} of {totalPages}
          </span>
        </div>

        <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Reward Reports Table">
          <table style={{ width: '100%', minWidth: '1190px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, backgroundColor: '#F8FAFC', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Distribution ID
                </th>
                <th style={{ position: 'sticky', top: 0, left: '140px', zIndex: 20, backgroundColor: '#F8FAFC', width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                  Program Name
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Reward Item
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Category
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Recipient Employee
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '150px', minWidth: '150px', maxWidth: '150px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Department
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '80px', minWidth: '80px', maxWidth: '80px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', borderBottom: '1px solid #E5E9F0' }}>
                  Qty
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Disbursed Date
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px', textAlign: 'center' }}>
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : distributions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px' }}>
                    <EmptyState
                      title="No Distribution Records Found"
                      description="No records matched your selected criteria or active preset scope."
                    />
                  </td>
                </tr>
              ) : (
                distributions.map((dist) => (
                  <tr
                    key={dist.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#172033', fontFamily: 'monospace', borderBottom: '1px solid #E5E9F0' }}>
                      {dist.distribution_id}
                    </td>
                    <td style={{ position: 'sticky', left: '140px', zIndex: 4, backgroundColor: 'inherit', width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', fontSize: '13px', color: '#475467', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                      <span
                        onClick={() => dist.program && navigate(`/rewards/${dist.program}`)}
                        className="cell-truncate-1"
                        style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500, display: 'block' }}
                      >
                        {dist.program_name}
                      </span>
                    </td>
                    <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#172033', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-1">{dist.item_name}</div>
                    </td>
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      {dist.item_category && <RewardCategoryBadge category={dist.item_category} />}
                    </td>
                    <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '13px', color: '#172033', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-1" style={{ fontWeight: 600 }}>{dist.employee_name}</div>
                      <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#667085' }}>{dist.employee_id_code}</div>
                    </td>
                    <td style={{ width: '150px', minWidth: '150px', maxWidth: '150px', padding: '10px 14px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-1">{dist.employee_department || '—'}</div>
                    </td>
                    <td style={{ width: '80px', minWidth: '80px', maxWidth: '80px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#D97706', textAlign: 'center', borderBottom: '1px solid #E5E9F0' }}>
                      {dist.quantity}
                    </td>
                    <td style={{ width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontSize: '13px', color: '#667085', borderBottom: '1px solid #E5E9F0' }}>
                      {formatDate(dist.distribution_date)}
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
              itemName="distribution records"
            />
          </div>
        )}
      </div>
    </div>
  );
};
