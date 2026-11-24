// frontend/src/api/expenses.ts
import apiClient from './client';
import type { PaginatedResponse } from '../types';
import type {
  ExpenseCategory,
  ExpenseTransactionListItem,
  ExpenseTransactionDetail,
  ExpenseSummaryStats,
  ExpenseFilters,
  ReimbursementListItem,
  ReimbursementDetail,
  ReimbursementFilters,
} from '../types/expenses';


const triggerBlobDownload = (blobData: any, contentType: string, defaultFilename: string) => {
  const blob = new Blob([blobData], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const expensesApi = {
  /**
   * List paginated transactions with optional filters.
   */
  list: async (params: ExpenseFilters = {}): Promise<PaginatedResponse<ExpenseTransactionListItem>> => {
    const res = await apiClient.get('/expenses/', { params });
    return res.data;
  },

  /**
   * Retrieve full details of a specific transaction voucher.
   */
  get: async (id: number): Promise<ExpenseTransactionDetail> => {
    const res = await apiClient.get(`/expenses/${id}/`);
    return res.data;
  },

  /**
   * Record a new transaction (Cash Top-Up or Office Expense).
   * Supports FormData for receipt attachments.
   */
  create: async (data: FormData | Record<string, any>): Promise<ExpenseTransactionDetail> => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const res = await apiClient.post('/expenses/', data, { headers });
    return res.data;
  },

  /**
   * Atomically void an existing POSTED transaction with mandatory reason.
   */
  void: async (id: number, void_reason: string): Promise<ExpenseTransactionDetail> => {
    const res = await apiClient.post(`/expenses/${id}/void/`, { void_reason });
    return res.data;
  },

  /**
   * Retrieve live real-time financial KPI metrics and category totals.
   */
  summary: async (params?: { start_date?: string; end_date?: string }): Promise<ExpenseSummaryStats> => {
    const res = await apiClient.get('/expenses/summary/', { params });
    return res.data;
  },

  /**
   * List all controlled categories.
   */
  categories: async (params?: { is_active?: boolean; category_type?: string }): Promise<ExpenseCategory[]> => {
    const res = await apiClient.get('/expenses/categories/', { params });
    return res.data;
  },

  /**
   * Create a new custom category (Operator only).
   */
  createCategory: async (data: { name: string; category_type?: string; description?: string }): Promise<ExpenseCategory> => {
    const res = await apiClient.post('/expenses/categories/', data);
    return res.data;
  },

  /**
   * Export transactions as Excel workbook (.xlsx) respecting active filters.
   */
  exportExcel: async (params: ExpenseFilters = {}, customFilename?: string): Promise<void> => {
    const res = await apiClient.get('/expenses/reports/export/excel/', {
      params,
      responseType: 'blob',
    });
    const filename =
      customFilename ||
      `ARCO_Office_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
    triggerBlobDownload(
      res.data,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    );
  },

  /**
   * Export transactions as CSV (.csv) respecting active filters.
   */
  exportCsv: async (params: ExpenseFilters = {}, customFilename?: string): Promise<void> => {
    const res = await apiClient.get('/expenses/reports/export/csv/', {
      params,
      responseType: 'blob',
    });
    const filename =
      customFilename ||
      `ARCO_Office_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    triggerBlobDownload(
      res.data,
      'text/csv;charset=utf-8;',
      filename
    );
  },

  /**
   * Retrieve reconciliation preview (expected balance, period totals).
   */
  getReconciliationPreview: async (params?: { as_of_date?: string; period_start?: string; period_end?: string }) => {
    const res = await apiClient.get('/expenses/reconciliation/preview/', { params });
    return res.data;
  },

  /**
   * List past reconciliation records.
   */
  listReconciliations: async () => {
    const res = await apiClient.get('/expenses/reconciliation/');
    return res.data;
  },

  /**
   * Record a physical cash count reconciliation.
   */
  createReconciliation: async (data: {
    reconciliation_date?: string;
    period_start?: string | null;
    period_end?: string | null;
    physical_cash_count: number | string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/expenses/reconciliation/', data);
    return res.data;
  },

  // ── REIMBURSEMENT WORKFLOW APIS ──────────────────────────────────────────

  /**
   * List paginated reimbursement forms.
   */
  listReimbursements: async (params: ReimbursementFilters = {}): Promise<PaginatedResponse<ReimbursementListItem>> => {
    const res = await apiClient.get('/expenses/reimbursements/', { params });
    return res.data;
  },

  /**
   * Retrieve single reimbursement sheet with itemized breakdown.
   */
  getReimbursement: async (id: number): Promise<ReimbursementDetail> => {
    const res = await apiClient.get(`/expenses/reimbursements/${id}/`);
    return res.data;
  },

  /**
   * Submit a new reimbursement form (supports receipt file upload via FormData).
   */
  createReimbursement: async (data: FormData | Record<string, any>): Promise<ReimbursementDetail> => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const res = await apiClient.post('/expenses/reimbursements/', data, { headers });
    return res.data;
  },

  /**
   * Authorize a pending reimbursement form (Admin / Approver) with digital signature.
   */
  approveReimbursement: async (
    id: number,
    data: { approver_name?: string; manager_signature?: string; approval_notes?: string } = {}
  ): Promise<ReimbursementDetail> => {
    const res = await apiClient.post(`/expenses/reimbursements/${id}/approve/`, data);
    return res.data;
  },

  /**
   * Reject a pending reimbursement form with justification reason.
   */
  rejectReimbursement: async (id: number, reason: string): Promise<ReimbursementDetail> => {
    const res = await apiClient.post(`/expenses/reimbursements/${id}/reject/`, { reason });
    return res.data;
  },

  /**
   * Mark an approved reimbursement as PAID and disburse funds.
   */
  markReimbursementPaid: async (
    id: number,
    data: { payment_method?: string; payment_reference?: string; record_in_cash_ledger?: boolean } = {}
  ): Promise<ReimbursementDetail> => {
    const res = await apiClient.post(`/expenses/reimbursements/${id}/mark-paid/`, data);
    return res.data;
  },

  /**
   * Cancel a pending reimbursement claim (Applicant or Admin).
   */
  cancelReimbursement: async (id: number): Promise<ReimbursementDetail> => {
    const res = await apiClient.post(`/expenses/reimbursements/${id}/cancel/`);
    return res.data;
  },

  /**
   * Download the official ReportLab generated PDF for a reimbursement.
   */
  downloadReimbursementPdf: async (id: number, reimbursementNumber?: string): Promise<void> => {
    const res = await apiClient.get(`/expenses/reimbursements/${id}/pdf/`, {
      responseType: 'blob',
    });
    const filename = `${reimbursementNumber || `RMB-${id}`}_Form.pdf`;
    triggerBlobDownload(res.data, 'application/pdf', filename);
  },
};


