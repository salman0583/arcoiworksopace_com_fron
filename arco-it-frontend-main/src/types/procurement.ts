import type { Vendor } from './vendors';

export type RequestType =
  | 'hardware'
  | 'software'
  | 'license'
  | 'it_service'
  | 'network'
  | 'accessories'
  | 'office_supplies'
  | 'other';

export type ProcurementPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ProcurementStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'quotations_received'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'completed'
  | 'cancelled';

export type ReceivingCondition = 'good' | 'damaged' | 'acceptable';

export interface ProcurementQuotationItem {
  id: number;
  quotation: number;
  item_name: string;
  normalized_name: string;
  description: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  row_number: number;
  match_key: string;
  created_at: string;
}

export interface ProcurementQuotation {
  id: number;
  procurement: number;
  quotation_number: string;
  vendor: number;
  vendor_name: string;
  vendor_detail?: Vendor | null;
  quotation_date: string;
  valid_until: string | null;
  currency: string;
  subtotal: string | null;
  tax_amount: string;
  total_amount: string;
  unit_price: string | null;
  delivery_timeline: string;
  payment_terms: string;
  warranty_terms: string;
  notes: string;
  attachment: string | null;
  attachment_url: string | null;
  is_selected: boolean;
  selection_notes: string;
  selected_by: number | null;
  selected_by_name: string;
  selected_at: string | null;
  uploaded_by: number | null;
  uploaded_by_name: string;
  items?: ProcurementQuotationItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationComparisonVendorHeader {
  quotation_id: number;
  quotation_number: string;
  vendor_id: number;
  vendor_name: string;
  quotation_date: string | null;
  delivery_timeline: string;
  payment_terms: string;
  warranty_terms: string;
  valid_until: string | null;
  attachment_url: string | null;
  is_selected: boolean;
  notes: string;
  total_amount: string;
  items_count: number;
}

export interface QuotationVendorOffer {
  is_quoted: boolean;
  item_id?: number | null;
  item_name?: string | null;
  quantity?: number | null;
  qty_status?: 'full' | 'partial' | 'extra' | null;
  unit_price?: string | null;
  line_total?: string | null;
  is_lowest_price?: boolean;
  is_highest_price?: boolean;
  price_delta_from_lowest?: string | null;
  description?: string | null;
  status?: 'MATCHED' | 'POSSIBLE_MATCH' | 'VENDOR_SPECIFIC' | 'EXTRA_ITEM' | 'NOT_QUOTED';
  label?: string;
  remark?: string;
}

export interface QuotationComparisonItemRow {
  match_key: string;
  item_name: string;
  match_status: 'MATCHED' | 'POSSIBLE_MATCH' | 'VENDOR_SPECIFIC' | 'EXTRA_ITEM';
  quoted_vendors_count: number;
  lowest_unit_price: string | null;
  highest_unit_price?: string | null;
  price_difference: string;
  total_difference?: string;
  comparison_remark?: string;
  vendor_offers: Record<string, QuotationVendorOffer>;
}

export interface QuotationVendorSummary {
  quotation_id: number;
  quotation_number: string;
  vendor_id: number;
  vendor_name: string;
  is_selected: boolean;
  selection_notes: string;
  comparable_total: string;
  extra_items_total: string;
  full_quoted_total: string;
  is_lowest_comparable: boolean;
  is_lowest_full_quote: boolean;
  price_variance_from_lowest: string;
  delivery_timeline: string;
  payment_terms: string;
  warranty_terms: string;
}

export interface QuotationComparisonResponse {
  procurement_id: number;
  request_id: string;
  item_name: string;
  requested_quantity: number;
  estimated_total_cost: string;
  status: ProcurementStatus;
  vendors_count: number;
  total_items_quoted?: number;
  common_items_count?: number;
  is_comparable: boolean;
  max_savings?: string;
  message?: string;
  vendors: QuotationComparisonVendorHeader[];
  items: QuotationComparisonItemRow[];
  vendor_summaries: QuotationVendorSummary[];
}

export interface ProcurementReceivingLog {
  id: number;
  procurement: number;
  received_date: string;
  quantity_received: number;
  condition: ReceivingCondition;
  notes: string;
  receiving_document?: string | null;
  receiving_document_url?: string | null;
  received_by: number | null;
  received_by_name: string;
  created_at: string;
}

export interface ProcurementAssetSummary {
  id: number;
  asset_tag: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  condition: string;
  assigned_to: number | null;
  assigned_to_name: string;
  is_acknowledged: boolean;
}

export interface ProcurementRequestListItem {
  id: number;
  request_id: string;
  requester: number;
  requester_name: string;
  requester_email: string;
  requested_for: number | null;
  requested_for_name: string;
  department: number | null;
  department_name: string;
  request_type: RequestType;
  item_name: string;
  quantity: number;
  received_quantity: number;
  pending_quantity: number;
  estimated_unit_cost: string;
  estimated_total_cost: string;
  actual_unit_cost: string | null;
  actual_total_cost: string | null;
  priority: ProcurementPriority;
  status: ProcurementStatus;
  vendor_name: string;
  preferred_vendor: number | null;
  actual_vendor: number | null;
  selected_quotation: number | null;
  selected_quotation_number: string;
  quotations_count: number;
  order_number: string;
  order_date: string | null;
  expected_delivery_date: string | null;
  required_by_date: string | null;
  created_at: string;
}

export interface ProcurementRequestDetail extends ProcurementRequestListItem {
  description: string;
  business_justification: string;
  preferred_vendor_detail: Vendor | null;
  actual_vendor_detail: Vendor | null;
  selected_quotation_detail: ProcurementQuotation | null;
  selection_reason: string;
  selection_date: string | null;
  selected_by: number | null;
  selected_by_name: string;
  is_fully_received: boolean;
  cost_variance: string | null;
  actual_delivery_date: string | null;
  payment_terms: string;
  delivery_address: string;
  order_document: string | null;
  order_document_url: string | null;
  order_notes: string;
  approved_by: number | null;
  approved_by_name: string;
  approved_date: string | null;
  rejected_by: number | null;
  rejected_by_name: string;
  rejected_date: string | null;
  approval_comment: string;
  linked_ticket: number | null;
  linked_ticket_number: string;
  linked_ticket_subject: string;
  linked_software: number | null;
  linked_software_name: string;
  linked_software_code: string;
  linked_software_licenses: number;
  quotations: ProcurementQuotation[];
  receiving_logs: ProcurementReceivingLog[];
  created_assets: ProcurementAssetSummary[];
  notes: string;
  updated_at: string;
}

export interface ProcurementStats {
  pending_approval: number;
  quotations_pending: number;
  approved: number;
  ordered: number;
  partially_received: number;
  received: number;
  completed: number;
  total: number;
}

export interface CreateProcurementPayload {
  item_name: string;
  request_type: RequestType;
  description?: string;
  quantity: number;
  estimated_unit_cost: number | string;
  priority: ProcurementPriority;
  business_justification: string;
  preferred_vendor?: number | null;
  required_by_date?: string | null;
  requested_for?: number | null;
  department?: number | null;
  notes?: string;
}

export interface CreateQuotationPayload {
  quotation_number: string;
  vendor: number;
  quotation_date?: string;
  valid_until?: string | null;
  currency?: string;
  subtotal?: number | string | null;
  tax_amount?: number | string;
  total_amount: number | string;
  unit_price?: number | string | null;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  notes?: string;
  attachment?: File | null;
}

export interface OrderProcurementPayload {
  order_number: string;
  order_date: string;
  actual_vendor_id: number;
  expected_delivery_date?: string | null;
  actual_unit_cost?: number | string | null;
  payment_terms?: string;
  delivery_address?: string;
  order_notes?: string;
  order_document?: File | null;
}

export interface ReceiveProcurementPayload {
  received_date?: string;
  quantity_received: number;
  condition?: ReceivingCondition;
  notes?: string;
  receiving_document?: File | null;
}

export interface CreateAssetFromProcurementPayload {
  asset_tag: string;
  asset_type_id: number;
  name: string;
  manufacturer: string;
  model: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number | string;
  vendor?: string;
  vendor_supplier_id?: number | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  notes?: string;
}

export interface UpdateSoftwareFromProcurementPayload {
  software_id: number;
  additional_licenses: number;
  notes?: string;
}

export interface QuotationRowValidationError {
  row?: number | null;
  item?: string | null;
  field?: string;
  problem?: string;
  expected?: string;
  message: string;
}

export interface QuotationUploadErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  attachment?: string[];
  errors?: QuotationRowValidationError[];
}

