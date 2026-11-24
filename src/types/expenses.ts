// frontend/src/types/expenses.ts
/**
 * TypeScript definitions for ARCO Workplace — Office Expenses / Cash Ledger module.
 */

export type ExpenseCategoryType = 'EXPENSE' | 'IN';

export interface ExpenseCategory {
  id: number;
  name: string;
  category_type: ExpenseCategoryType;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ExpenseTransactionType = 'CASH_IN' | 'CASH_OUT';
export type ExpenseTransactionStatus = 'POSTED' | 'VOIDED';
export type ExpensePaymentMethod = 'CASH' | 'BANK_WITHDRAWAL' | 'PETTY_CASH' | 'OTHER';
export type ExpenseRecordType = 'REAL' | 'DEMO';

export interface ExpenseTransactionListItem {
  id: number;
  voucher_number: string;
  transaction_type: ExpenseTransactionType;
  transaction_date: string;
  category: number | null;
  category_name: string;
  amount: string;
  running_balance: string;
  payee_or_source: string;
  payment_method: ExpensePaymentMethod;
  status: ExpenseTransactionStatus;
  record_type?: ExpenseRecordType;
  authorized_by: number;
  authorized_by_name: string;
  recorded_by: number;
  recorded_by_name: string;
  has_receipt: boolean;
  receipt_attachment: string | null;
  created_at: string;
}

export interface UserSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
}

export interface ExpenseTransactionDetail {
  id: number;
  voucher_number: string;
  transaction_type: ExpenseTransactionType;
  transaction_date: string;
  category: ExpenseCategory | null;
  amount: string;
  running_balance: string;
  payee_or_source: string;
  payment_method: ExpensePaymentMethod;
  description: string;
  authorized_by: UserSummary;
  recorded_by: UserSummary;
  receipt_attachment: string | null;
  has_receipt: boolean;
  status: ExpenseTransactionStatus;
  record_type?: ExpenseRecordType;
  void_reason: string;
  voided_by: UserSummary | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LastTopUpInfo {
  amount: string;
  transaction_date: string;
  voucher_number: string;
  payee_or_source: string;
  authorized_by_name?: string;
}

export interface PeriodCashFlowSummary {
  opening_balance: string;
  period_cash_in: string;
  period_cash_out: string;
  closing_balance: string;
  net_change: string;
}

export interface ExpenseSummaryStats {
  current_balance: string;
  low_balance_threshold: string;
  is_low_balance: boolean;
  last_top_up: LastTopUpInfo | null;
  total_cash_in_all_time: string;
  total_cash_out_all_time: string;
  total_transactions_count: number;
  total_cash_in_month: string;
  total_cash_out_month: string;
  active_transactions_count: number;
  posted_vouchers_count?: number;
  voided_transactions_count: number;
  period_summary?: PeriodCashFlowSummary;
  top_categories: Array<{
    category_id: number;
    category_name: string;
    total_spent: string;
    count: number;
  }>;
  monthly_trend: Array<{
    month: string;
    inflow: string;
    outflow: string;
  }>;
}

export interface CashReconciliation {
  id: number;
  reconciliation_date: string;
  period_start: string | null;
  period_end: string | null;
  opening_balance: string;
  total_cash_in: string;
  total_cash_out: string;
  expected_closing_balance: string;
  physical_cash_count: string;
  discrepancy: string;
  status: 'MATCHED' | 'DISCREPANCY';
  reconciled_by: number;
  reconciled_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationPreview {
  as_of_date: string;
  period_start: string | null;
  period_end: string | null;
  opening_balance: string;
  total_cash_in: string;
  total_cash_out: string;
  expected_closing_balance: string;
  current_system_balance: string;
  transactions_count: number;
}

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  transaction_type?: string;
  category?: number | string;
  payment_method?: string;
  status?: string;
  record_type?: string;
  min_amount?: number | string;
  max_amount?: number | string;
  search?: string;
  page?: number;
}

// ── REIMBURSEMENT TYPES ──────────────────────────────────────────────────────

export type ReimbursementStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface ReimbursementItem {
  id?: number;
  item_date: string;
  description: string;
  expense_type: string;
  amount: string | number;
  order?: number;
}

export interface ReimbursementListItem {
  id: number;
  reimbursement_number: string;
  employee_name: string;
  employee_id_code: string;
  department_name: string;
  manager_name: string;
  application_date: string;
  purpose: string;
  total_amount: string;
  status: ReimbursementStatus;
  has_receipt: boolean;
  receipt_attachment: string | null;
  approver_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  items_count: number;
}

export interface ReimbursementDetail {
  id: number;
  reimbursement_number: string;
  applicant_user: UserSummary;
  employee?: {
    id: number;
    employee_id: string;
    full_name: string;
    department_name?: string;
  } | null;
  employee_name: string;
  employee_id_code: string;
  department_name: string;
  manager_name: string;
  application_date: string;
  purpose: string;
  total_amount: string;
  status: ReimbursementStatus;
  receipt_attachment: string | null;
  has_receipt: boolean;
  employee_signature?: string;
  employee_signature_date: string | null;
  manager_signature?: string;
  approver_name: string;
  approved_by: UserSummary | null;
  approved_at: string | null;
  rejected_by: UserSummary | null;
  rejected_at: string | null;
  rejection_reason: string;
  paid_by: UserSummary | null;
  paid_at: string | null;
  payment_reference: string;
  expense_transaction: number | null;
  expense_voucher_number: string | null;
  items: ReimbursementItem[];
  created_at: string;
  updated_at: string;
}

export interface ReimbursementFilters {
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  my_only?: boolean;
  page?: number;
}

