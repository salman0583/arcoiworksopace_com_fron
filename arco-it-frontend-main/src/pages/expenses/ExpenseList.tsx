import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import {
  Receipt,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Paperclip,
  Calendar,
  Filter,
  Ban,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Loader2,
  Scale,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canOperateOfficeExpenses, canAccessOfficeExpenses } from '../../utils/auth';
import { formatINR, formatDate } from '../../utils/formatters';
import { expensesApi } from '../../api/expenses';

import { Button, PageHeader } from '../../components/ui';
import { SummaryFilterCard } from '../../components/common/SummaryFilterCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  TransactionTypeBadge,
  TransactionStatusBadge,
  RecordTypeBadge,
  getPaymentMethodLabel,
} from '../../components/expenses/ExpenseBadges';

import { AddTopUpModal } from './AddTopUpModal';
import { RecordExpenseModal } from './RecordExpenseModal';
import { ExpenseDetailDrawer } from '../../components/expenses/ExpenseDetailDrawer';
import { VoidTransactionModal } from './VoidTransactionModal';
import { ReconciliationModal } from '../../components/expenses/ReconciliationModal';
import { ReimbursementsTab } from './ReimbursementsTab';

import {
  DataTableHeaderCell,
  ActiveFilterChips,
  ToolbarFilterPopover,
  filterFieldLabelStyle,
  filterFieldSelectStyle,
} from '../../components/common/table';
import { X } from 'lucide-react';

import type {
  ExpenseCategory,
  ExpenseTransactionListItem,
  ExpenseTransactionDetail,
  ExpenseSummaryStats,
  ExpenseFilters,
} from '../../types';

const PAGE_SIZE = 10;

type QuickTabType = 'all' | 'cash_in' | 'cash_out' | 'voided';

export const ExpenseList: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isOperator = canOperateOfficeExpenses(role);
  const isViewer = canAccessOfficeExpenses(role);

  const [transactions, setTransactions] = useState<ExpenseTransactionListItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<ExpenseSummaryStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const isReimbursementsPath = location.pathname.startsWith('/reimbursements');
  const [mainTab, setMainTab] = useState<'ledger' | 'reimbursements'>(
    isReimbursementsPath || !isViewer ? 'reimbursements' : 'ledger'
  );

  useEffect(() => {
    if (location.pathname.startsWith('/reimbursements')) {
      setMainTab('reimbursements');
    } else if (location.pathname.startsWith('/expenses') && isViewer) {
      setMainTab('ledger');
    }
  }, [location.pathname, isViewer]);

  // Quick Tab state
  const [quickTab, setQuickTab] = useState<QuickTabType>('all');

  // Applied Filters state
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Centralized Popover & Draft State
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [draftType, setDraftType] = useState<string>('');
  const [draftCategory, setDraftCategory] = useState<string>('');
  const [draftPaymentMethod, setDraftPaymentMethod] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<string>('');

  // Export dropdown state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Modals & Drawer state
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState<boolean>(false);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [voidTxTarget, setVoidTxTarget] = useState<ExpenseTransactionListItem | ExpenseTransactionDetail | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Summary Stats
  const fetchSummary = useCallback(async () => {
    try {
      const data = await expensesApi.summary();
      setStats(data);
    } catch {
      // Summary errors handled gracefully
    }
  }, []);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await expensesApi.categories({ is_active: true });
      setCategories(data || []);
    } catch {
      // Ignore category load error
    }
  }, []);

  // Handle Quick Tab Change
  const handleQuickTabChange = (tab: QuickTabType) => {
    setQuickTab(tab);
    setPage(1);
    if (tab === 'all') {
      setSelectedType('');
      setSelectedStatus('');
    } else if (tab === 'cash_in') {
      setSelectedType('CASH_IN');
      setSelectedStatus('POSTED');
    } else if (tab === 'cash_out') {
      setSelectedType('CASH_OUT');
      setSelectedStatus('POSTED');
    } else if (tab === 'voided') {
      setSelectedType('');
      setSelectedStatus('VOIDED');
    }
  };

  // Fetch Transactions List
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ExpenseFilters = {
        page,
        search: search.trim() || undefined,
        transaction_type: selectedType || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        payment_method: selectedPaymentMethod || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const res = await expensesApi.list(params);
      setTransactions(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('You do not have permission to view Office Expenses.');
      } else {
        setError('Failed to load office expenses ledger.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedType, selectedCategory, selectedStatus, selectedPaymentMethod, startDate, endDate]);

  useEffect(() => {
    fetchCategories();
    fetchSummary();
  }, [fetchCategories, fetchSummary]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefreshAll = () => {
    fetchSummary();
    fetchTransactions();
    showToast('Ledger and financial summary refreshed.');
  };

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftType(selectedType);
      setDraftCategory(selectedCategory);
      setDraftPaymentMethod(selectedPaymentMethod);
      setDraftStatus(selectedStatus);
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleApplyFilters = () => {
    setSelectedType(draftType);
    setSelectedCategory(draftCategory);
    setSelectedPaymentMethod(draftPaymentMethod);
    setSelectedStatus(draftStatus);
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetPopoverFilters = () => {
    setDraftType('');
    setDraftCategory('');
    setDraftPaymentMethod('');
    setDraftStatus('');
    setSelectedType('');
    setSelectedCategory('');
    setSelectedPaymentMethod('');
    setSelectedStatus('');
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedPaymentMethod('');
    setDraftType('');
    setDraftCategory('');
    setDraftPaymentMethod('');
    setDraftStatus('');
    setStartDate('');
    setEndDate('');
    setQuickTab('all');
    setPage(1);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setIsExportOpen(false);
    try {
      const params: ExpenseFilters = {
        search: search.trim() || undefined,
        transaction_type: selectedType || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        payment_method: selectedPaymentMethod || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      await expensesApi.exportExcel(params);
      showToast('Office Expenses Excel workbook downloaded successfully.');
    } catch (err) {
      showToast('Failed to export Excel report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setIsExportOpen(false);
    try {
      const params: ExpenseFilters = {
        search: search.trim() || undefined,
        transaction_type: selectedType || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        payment_method: selectedPaymentMethod || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      await expensesApi.exportCsv(params);
      showToast('Office Expenses CSV exported successfully.');
    } catch (err) {
      showToast('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDetail = (id: number) => {
    setSelectedTxId(id);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenVoidFromList = (tx: ExpenseTransactionListItem) => {
    setVoidTxTarget(tx);
    setIsVoidModalOpen(true);
  };

  const handleOpenVoidFromDrawer = (detail: ExpenseTransactionDetail) => {
    setIsDetailDrawerOpen(false);
    setVoidTxTarget(detail);
    setIsVoidModalOpen(true);
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedType) ||
    Boolean(selectedCategory) ||
    Boolean(selectedStatus) ||
    Boolean(selectedPaymentMethod) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    quickTab !== 'all';

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  if (!isViewer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <ReimbursementsTab />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toast Notification */}
      {toastMessage && (
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
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Top Level Module Navigation (Ledger vs Reimbursements) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setMainTab('ledger')}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            backgroundColor: mainTab === 'ledger' ? '#071A3B' : '#F1F5F9',
            color: mainTab === 'ledger' ? '#FFFFFF' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Wallet size={16} /> Cash Ledger &amp; Petty Cash
        </button>
        <button
          type="button"
          onClick={() => setMainTab('reimbursements')}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            backgroundColor: mainTab === 'reimbursements' ? '#071A3B' : '#F1F5F9',
            color: mainTab === 'reimbursements' ? '#FFFFFF' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={16} /> Reimbursement Forms
        </button>
      </div>

      {mainTab === 'reimbursements' ? (
        <ReimbursementsTab />
      ) : (
        <>
          {/* Header */}
          <PageHeader
            title="Office Expenses"
            description="Cash ledger, petty expenses, additions, running balances, and physical reconciliations"

        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isOperator && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsReconModalOpen(true)}
                  leftIcon={<Scale size={15} color="#475569" />}
                  title="Perform Physical Cash Reconciliation"
                >
                  Reconciliation
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTopUpModalOpen(true)}
                  leftIcon={<ArrowDownLeft size={15} color="#059669" />}
                >
                  Add Top-Up
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsExpenseModalOpen(true)}
                  leftIcon={<PlusCircle size={15} />}
                >
                  Record Expense
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Low Balance Warning Alert Banner */}
      {stats?.is_low_balance && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#FEF3F2',
            border: '1px solid #FECDCA',
            borderRadius: '8px',
            color: '#B42318',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#D92D20" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                Low Cash Reserve Alert
              </div>
              <div style={{ fontSize: '13px', color: '#7A271A' }}>
                Available cash balance ({formatINR(stats.current_balance)}) has fallen below the operating threshold ({formatINR(stats.low_balance_threshold)}). Please record a cash top-up.
              </div>
            </div>
          </div>
          {isOperator && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTopUpModalOpen(true)}
              leftIcon={<ArrowDownLeft size={14} />}
              style={{ backgroundColor: '#D92D20', borderColor: '#D92D20' }}
            >
              Top-Up Now
            </Button>
          )}
        </div>
      )}

      {/* 5 Compact KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Card 1: Available Cash Balance */}
        <SummaryFilterCard
          title="Available Cash Balance"
          count={stats ? formatINR(stats.current_balance) : '₹0.00'}
          icon={<Wallet size={16} />}
          accentColor={stats?.is_low_balance ? '#DC2626' : '#059669'}
          isClickable={false}
          subtext={stats?.is_low_balance ? '⚠️ Below threshold' : 'Live server-authoritative balance'}
        />

        {/* Card 2: Total Cash In */}
        <SummaryFilterCard
          title="Total Cash In"
          count={stats ? formatINR(stats.total_cash_in_all_time) : '₹0.00'}
          icon={<ArrowDownLeft size={16} />}
          accentColor="#2563EB"
          isActive={quickTab === 'cash_in'}
          onClick={() => handleQuickTabChange(quickTab === 'cash_in' ? 'all' : 'cash_in')}
          subtext={`Month: ${stats ? formatINR(stats.total_cash_in_month) : '₹0.00'}`}
        />

        {/* Card 3: Total Cash Out */}
        <SummaryFilterCard
          title="Total Cash Out"
          count={stats ? formatINR(stats.total_cash_out_all_time) : '₹0.00'}
          icon={<ArrowUpRight size={16} />}
          accentColor="#DC2626"
          isActive={quickTab === 'cash_out'}
          onClick={() => handleQuickTabChange(quickTab === 'cash_out' ? 'all' : 'cash_out')}
          subtext={`Month: ${stats ? formatINR(stats.total_cash_out_month) : '₹0.00'}`}
        />

        {/* Card 4: Last Top-Up */}
        <SummaryFilterCard
          title="Last Cash Top-Up"
          count={stats?.last_top_up ? formatINR(stats.last_top_up.amount) : 'None'}
          icon={<Clock size={16} />}
          accentColor="#0891B2"
          isClickable={false}
          subtext={
            stats?.last_top_up
              ? `${formatDate(stats.last_top_up.transaction_date)} • ${stats.last_top_up.payee_or_source}`
              : 'No top-up on file'
          }
        />

        {/* Card 5: Total Transactions */}
        <SummaryFilterCard
          title="Total Transactions"
          count={stats?.total_transactions_count ?? 0}
          icon={<Receipt size={16} />}
          accentColor="#475569"
          isActive={quickTab === 'all'}
          onClick={() => handleQuickTabChange('all')}
          subtext={`${stats?.posted_vouchers_count ?? stats?.active_transactions_count ?? 0} posted · ${stats?.voided_transactions_count ?? 0} voided`}
        />
      </div>

      {/* Period Cash Flow Breakdown Summary Bar */}
      {stats?.period_summary && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600 }}>
            <Calendar size={15} color="#2563EB" />
            <span>Cash Flow Equation:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748B' }}>Opening Balance:</span>
              <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                {formatINR(stats.period_summary.opening_balance)}
              </strong>
            </div>

            <span style={{ color: '#94A3B8', fontWeight: 700 }}>+</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748B' }}>Inflow:</span>
              <strong style={{ color: '#16A34A', fontFamily: 'monospace' }}>
                +{formatINR(stats.period_summary.period_cash_in)}
              </strong>
            </div>

            <span style={{ color: '#94A3B8', fontWeight: 700 }}>−</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748B' }}>Outflow:</span>
              <strong style={{ color: '#DC2626', fontFamily: 'monospace' }}>
                −{formatINR(stats.period_summary.period_cash_out)}
              </strong>
            </div>

            <span style={{ color: '#94A3B8', fontWeight: 700 }}>=</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748B' }}>Closing Balance:</span>
              <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                {formatINR(stats.period_summary.closing_balance)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <SegmentedControl<QuickTabType>
          variant="pill"
          size="sm"
          value={quickTab}
          onChange={handleQuickTabChange}
          options={[
            {
              key: 'all',
              label: 'All Transactions',
              count: stats?.total_transactions_count,
            },
            {
              key: 'cash_in',
              label: 'Cash In (Top-Ups)',
              icon: <ArrowDownLeft size={13} color="#16A34A" />,
              accentColor: '#16A34A',
            },
            {
              key: 'cash_out',
              label: 'Cash Out (Expenses)',
              icon: <ArrowUpRight size={13} color="#DC2626" />,
              accentColor: '#DC2626',
            },
            {
              key: 'voided',
              label: 'Voided',
              count: stats?.voided_transactions_count,
              icon: <Ban size={13} color="#94A3B8" />,
              accentColor: '#94A3B8',
            },
          ]}
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
              placeholder="Search voucher, payee/source, description..."
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
            activeCount={[Boolean(selectedType), Boolean(selectedCategory), Boolean(selectedPaymentMethod), Boolean(selectedStatus)].filter(Boolean).length}
            title="Filter Cash Ledger"
            hasFiltersToReset={Boolean(draftType || draftCategory || draftPaymentMethod || draftStatus || selectedType || selectedCategory || selectedPaymentMethod || selectedStatus)}
            onReset={handleResetPopoverFilters}
            onApply={handleApplyFilters}
          >
            <div>
              <label style={filterFieldLabelStyle}>Transaction Type</label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Types</option>
                <option value="CASH_IN">Cash In (Top-Up)</option>
                <option value="CASH_OUT">Cash Out (Expense)</option>
              </select>
            </div>

            <div>
              <label style={filterFieldLabelStyle}>Expense Category</label>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={filterFieldLabelStyle}>Payment Method</label>
              <select
                value={draftPaymentMethod}
                onChange={(e) => setDraftPaymentMethod(e.target.value)}
                style={filterFieldSelectStyle}
              >
                <option value="">All Payment Methods</option>
                <option value="CASH">Physical Cash</option>
                <option value="PETTY_CASH">Petty Cash Float</option>
                <option value="BANK_WITHDRAWAL">Bank Withdrawal</option>
                <option value="OTHER">Other</option>
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
                <option value="POSTED">Posted</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>
          </ToolbarFilterPopover>
        </div>

        {/* Right Side: Date Filter + Export Menu + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
          />

          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isExporting}
              leftIcon={isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              style={{ height: '34px' }}
            >
              Export <ChevronDown size={13} style={{ marginLeft: 2 }} />
            </Button>

            {isExportOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E9F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  minWidth: '200px',
                  zIndex: 100,
                  overflow: 'hidden',
                  padding: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#172033',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F7FA')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileSpreadsheet size={15} color="#059669" />
                  <span>Export as Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#172033',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F7FA')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileText size={15} color="#2563EB" />
                  <span>Export as CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

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

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <ActiveFilterChips
          filters={[
            search.trim() ? { id: 'search', label: 'Search', value: `"${search.trim()}"`, onRemove: () => { setSearch(''); setPage(1); } } : null,
            selectedType ? { id: 'type', label: 'Type', value: selectedType === 'CASH_IN' ? 'Cash In (Top-Up)' : 'Cash Out (Expense)', onRemove: () => { setSelectedType(''); setDraftType(''); setQuickTab('all'); setPage(1); } } : null,
            selectedCategory ? {
              id: 'category',
              label: 'Category',
              value: categories.find(c => String(c.id) === selectedCategory)?.name || selectedCategory,
              onRemove: () => { setSelectedCategory(''); setDraftCategory(''); setPage(1); }
            } : null,
            selectedPaymentMethod ? {
              id: 'payment',
              label: 'Payment Method',
              value: getPaymentMethodLabel(selectedPaymentMethod),
              onRemove: () => { setSelectedPaymentMethod(''); setDraftPaymentMethod(''); setPage(1); }
            } : null,
            selectedStatus ? { id: 'status', label: 'Status', value: selectedStatus === 'POSTED' ? 'Posted' : 'Voided', onRemove: () => { setSelectedStatus(''); setDraftStatus(''); setQuickTab('all'); setPage(1); } } : null,
            (startDate || endDate) ? { id: 'date', label: 'Date', value: `${startDate || '—'} to ${endDate || '—'}`, onRemove: () => { setStartDate(''); setEndDate(''); setPage(1); } } : null,
          ].filter(Boolean) as any[]}
          onClearAll={handleResetFilters}
        />
      )}

      {/* Financial Ledger Table Card */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#667085' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563EB' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading office expenses ledger...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#B42318' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{error}</p>
            <Button variant="secondary" onClick={fetchTransactions} style={{ marginTop: '12px' }}>
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <EmptyState
              icon={<Receipt size={40} color="#98A2B3" />}
              title={hasActiveFilters ? 'No matching vouchers found' : 'No Transactions Recorded'}
              description={
                hasActiveFilters
                  ? 'Try changing the date range, clearing filters, or resetting search.'
                  : 'Start by adding an initial Cash Top-Up or recording petty office cash disbursements.'
              }
            />
          </div>
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="Expenses Table">
            <table style={{ width: '100%', minWidth: '1280px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr>
                  <DataTableHeaderCell
                    title="Voucher #"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                    isSticky
                    stickyLeft={0}
                  />
                  <DataTableHeaderCell
                    title="Date"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                    isSticky
                    stickyLeft="140px"
                  />
                  <DataTableHeaderCell
                    title="Type"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    isSticky
                    stickyLeft="250px"
                    style={{ borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}
                  />
                  <DataTableHeaderCell
                    title="Category"
                    width="140px"
                    minWidth="140px"
                    maxWidth="140px"
                  />
                  <DataTableHeaderCell
                    title="Payee / Source"
                    width="170px"
                    minWidth="170px"
                    maxWidth="170px"
                  />
                  <DataTableHeaderCell
                    title="Cash In (+)"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    align="right"
                  />
                  <DataTableHeaderCell
                    title="Cash Out (−)"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    align="right"
                  />
                  <DataTableHeaderCell
                    title="Running Balance"
                    width="130px"
                    minWidth="130px"
                    maxWidth="130px"
                    align="right"
                  />
                  <DataTableHeaderCell
                    title="Payment Method"
                    width="130px"
                    minWidth="130px"
                    maxWidth="130px"
                  />
                  <DataTableHeaderCell
                    title="Status"
                    width="110px"
                    minWidth="110px"
                    maxWidth="110px"
                  />
                  <DataTableHeaderCell
                    title="Actions"
                    width="120px"
                    minWidth="120px"
                    maxWidth="120px"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCashIn = tx.transaction_type === 'CASH_IN';
                  const isVoid = tx.status === 'VOIDED';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => handleOpenDetail(tx.id)}
                      style={{
                        backgroundColor: isVoid ? '#FAFAFA' : '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isVoid ? '#FAFAFA' : '#FFFFFF')}
                    >
                      {/* Voucher Number (Sticky 1) */}
                      <td
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 4,
                          backgroundColor: 'inherit',
                          width: '140px',
                          minWidth: '140px',
                          maxWidth: '140px',
                          padding: '10px 14px',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #F5F7FA',
                          verticalAlign: 'middle',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(tx.id)}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#175CD3',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {tx.voucher_number}
                            {tx.has_receipt && (
                              <span title="Receipt attached">
                                <Paperclip size={13} color="#98A2B3" />
                              </span>
                            )}
                          </button>
                          {tx.record_type === 'DEMO' && (
                            <div>
                              <RecordTypeBadge recordType="DEMO" size="sm" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Transaction Date (Sticky 2) */}
                      <td
                        style={{
                          position: 'sticky',
                          left: '140px',
                          zIndex: 4,
                          backgroundColor: 'inherit',
                          width: '110px',
                          minWidth: '110px',
                          maxWidth: '110px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #F5F7FA',
                          verticalAlign: 'middle',
                        }}
                      >
                        {formatDate(tx.transaction_date)}
                      </td>

                      {/* Type Badge (Sticky 3) */}
                      <td
                        style={{
                          position: 'sticky',
                          left: '250px',
                          zIndex: 4,
                          backgroundColor: 'inherit',
                          width: '120px',
                          minWidth: '120px',
                          maxWidth: '120px',
                          padding: '10px 14px',
                          borderBottom: '1px solid #F5F7FA',
                          borderRight: '1px solid #E5E9F0',
                          boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <TransactionTypeBadge type={tx.transaction_type} size="sm" />
                      </td>

                      {/* Category */}
                      <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', fontSize: '13px', color: '#475467', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div
                          title={tx.category_name || (isCashIn ? 'Cash Addition / Top-Up' : 'Uncategorized')}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}
                        >
                          {tx.category_name || (isCashIn ? '—' : 'Uncategorized')}
                        </div>
                      </td>

                      {/* Payee / Source */}
                      <td style={{ width: '170px', minWidth: '170px', maxWidth: '170px', padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: '#172033', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <div
                          title={tx.payee_or_source}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}
                        >
                          {tx.payee_or_source}
                        </div>
                      </td>

                      {/* Cash In (+) */}
                      <td
                        style={{
                          width: '120px',
                          minWidth: '120px',
                          maxWidth: '120px',
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isVoid ? '#98A2B3' : isCashIn ? '#15803D' : '#94A3B8',
                          textDecoration: isVoid ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #F5F7FA',
                          verticalAlign: 'middle',
                        }}
                      >
                        {isCashIn ? `+${formatINR(tx.amount)}` : '—'}
                      </td>

                      {/* Cash Out (−) */}
                      <td
                        style={{
                          width: '120px',
                          minWidth: '120px',
                          maxWidth: '120px',
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isVoid ? '#98A2B3' : !isCashIn ? '#BE123C' : '#94A3B8',
                          textDecoration: isVoid ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #F5F7FA',
                          verticalAlign: 'middle',
                        }}
                      >
                        {!isCashIn ? `−${formatINR(tx.amount)}` : '—'}
                      </td>

                      {/* Running Balance */}
                      <td
                        style={{
                          width: '130px',
                          minWidth: '130px',
                          maxWidth: '130px',
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isVoid ? '#98A2B3' : '#334155',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #F5F7FA',
                          verticalAlign: 'middle',
                        }}
                      >
                        {tx.running_balance ? formatINR(tx.running_balance) : '—'}
                      </td>

                      {/* Payment Method */}
                      <td style={{ width: '130px', minWidth: '130px', maxWidth: '130px', padding: '10px 14px', fontSize: '12px', color: '#667085', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                        <span className="cell-truncate-1" style={{ display: 'block', maxWidth: '102px' }}>
                          {getPaymentMethodLabel(tx.payment_method)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <TransactionStatusBadge status={tx.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td
                        style={{ width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(tx.id)}
                            leftIcon={<Eye size={13} />}
                            title="View Voucher Details"
                            style={{ padding: '3px 8px', height: '28px', fontSize: '12px' }}
                          >
                            View
                          </Button>

                          {isOperator && tx.status === 'POSTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenVoidFromList(tx)}
                              style={{ color: '#EF4444', padding: '3px 8px', height: '28px', fontSize: '12px' }}
                              leftIcon={<Ban size={13} />}
                              title="Void Transaction"
                            >
                              Void
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > PAGE_SIZE && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #E5E9F0' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      <ExpenseDetailDrawer
        transactionId={selectedTxId}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedTxId(null);
        }}
        onVoidClick={handleOpenVoidFromDrawer}
        canVoid={isOperator}
      />

      {/* Cash Reconciliation Modal */}
      <ReconciliationModal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        onSuccess={() => {
          showToast('Cash reconciliation recorded and logged.');
          fetchSummary();
          fetchTransactions();
        }}
      />

      {/* Add Top-Up Modal */}
      <AddTopUpModal
        isOpen={isTopUpModalOpen}
        categories={categories}
        onClose={() => setIsTopUpModalOpen(false)}
        onSuccess={() => {
          setIsTopUpModalOpen(false);
          showToast('Cash Top-Up recorded successfully.');
          fetchSummary();
          fetchTransactions();
        }}
      />

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        categories={categories}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          setIsExpenseModalOpen(false);
          showToast('Office Expense voucher created successfully.');
          fetchSummary();
          fetchTransactions();
        }}
      />

          {/* Void Transaction Modal */}
          <VoidTransactionModal
            isOpen={isVoidModalOpen}
            transaction={voidTxTarget}
            onClose={() => {
              setIsVoidModalOpen(false);
              setVoidTxTarget(null);
            }}
            onSuccess={(msg) => {
              setIsVoidModalOpen(false);
              setVoidTxTarget(null);
              showToast(msg || 'Transaction was voided successfully.');
              fetchSummary();
              fetchTransactions();
            }}
          />
        </>
      )}
    </div>
  );
};

