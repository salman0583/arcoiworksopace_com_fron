export type AssetStatus =
  | 'available'
  | 'assigned'
  | 'in_repair'
  | 'lost'
  | 'damaged'
  | 'retired'
  | 'disposed';

export type AssetCondition = 'new' | 'good' | 'fair' | 'damaged';

export type AssetCategory = 'it' | 'admin_facilities';

export type AssetAcknowledgementStatus =
  | 'not_applicable'
  | 'pending'
  | 'acknowledged'
  | 'issue_reported'
  | 'returned';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'no_warranty';

export interface AssetType {
  id: number;
  name: string;
  description: string;
  icon: string;
  default_category?: AssetCategory;
  is_active: boolean;
  asset_count: number;
  created_at: string;
}

export interface AssetAssignmentHistory {
  id: number;
  action: 'assigned' | 'returned' | 'reassigned' | 'transferred';
  employee: number;
  employee_name: string;
  employee_code: string;
  assigned_date: string;
  return_date: string | null;
  condition_on_assignment: string;
  condition_on_return: string;
  accessories_issued?: Record<string, boolean>;
  accessories_returned?: Record<string, boolean>;
  reason?: string;
  notes: string;
  performed_by_name: string | null;
  created_at: string;
}

export interface AssetLinkedTicket {
  id: number;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  requester_name: string;
  created_at: string;
}

export interface Asset {
  id: number;
  asset_tag: string;
  category?: AssetCategory;
  category_display?: string;
  asset_type: number;
  asset_type_name: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: AssetStatus;
  condition: AssetCondition;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_to_code: string | null;
  assigned_to_email?: string | null;
  assigned_to_department?: string | null;
  assigned_date: string | null;
  location: string;
  purchase_date: string | null;
  purchase_price: string | number | null;
  vendor: string;
  vendor_supplier?: number | null;
  vendor_supplier_name?: string | null;
  warranty_provider_type?: string;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_status: WarrantyStatus;
  accessories_issued?: Record<string, boolean>;
  qr_code_url?: string;
  notes: string;
  is_acknowledged: boolean;
  acknowledgement_status?: AssetAcknowledgementStatus;
  acknowledgement_condition?: string;
  acknowledgement_notes?: string;
  acknowledged_at: string | null;
  created_at: string;
  updated_at?: string;
  assignment_history?: AssetAssignmentHistory[];
  linked_tickets?: AssetLinkedTicket[];
}

export interface MyAsset {
  id: number;
  asset_tag: string;
  category?: AssetCategory;
  category_display?: string;
  asset_type_name: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: AssetStatus;
  condition: AssetCondition;
  location: string;
  assigned_date: string | null;
  warranty_end_date: string | null;
  warranty_status: WarrantyStatus;
  qr_code_url?: string;
  is_acknowledged: boolean;
  acknowledgement_status?: AssetAcknowledgementStatus;
  acknowledgement_condition?: string;
  acknowledgement_notes?: string;
  acknowledged_at: string | null;
  notes: string;
}

export interface AssetStats {
  total_assets: number;
  assigned: number;
  available: number;
  in_repair: number;
  retired_or_disposed: number;
  expiring_soon: number;
  expired: number;
}

export interface AssetFilters {
  search?: string;
  category?: string;
  asset_type?: number | string;
  status?: string;
  condition?: string;
  assigned?: boolean | string;
  warranty?: 'active' | 'expiring_soon' | 'expired' | '';
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface CreateAssetPayload {
  asset_tag?: string;
  category?: AssetCategory;
  asset_type: number;
  name: string;
  manufacturer: string;
  model: string;
  serial_number?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  purchase_date?: string | null;
  purchase_price?: number | string | null;
  vendor?: string;
  vendor_supplier?: number | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  notes?: string;
}


export interface AssignAssetPayload {
  employee_id: number;
  condition?: AssetCondition;
  accessories?: Record<string, boolean>;
  reason?: string;
  notes?: string;
}

export interface ReturnAssetPayload {
  condition: AssetCondition;
  destination_status?: 'available' | 'in_repair' | 'damaged' | 'retired';
  accessories_returned?: Record<string, boolean>;
  notes?: string;
}

export interface ReassignAssetPayload {
  new_employee_id: number;
  assigned_date?: string;
  condition_on_return?: AssetCondition;
  condition_on_assignment?: AssetCondition;
  reason?: string;
  accessories_returned?: Record<string, boolean>;
  accessories_issued?: Record<string, boolean>;
  notes?: string;
}

export interface ChangeAssetStatusPayload {
  status: AssetStatus;
  condition?: AssetCondition;
  notes?: string;
}
