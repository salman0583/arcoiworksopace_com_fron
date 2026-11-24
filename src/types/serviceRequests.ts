export type RequestType =
  | 'software_access'
  | 'hardware_request'
  | 'access_request'
  | 'vpn_request'
  | 'account_permission'
  | 'equipment_replacement'
  | 'new_equipment'
  | 'peripheral_request'
  | 'it_service'
  | 'other';

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'waiting_for_user'
  | 'completed'
  | 'cancelled';

export type CommentType = 'public' | 'internal';

export interface UserBasic {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  role: string;
}

export interface ServiceRequestComment {
  id: number;
  service_request: number;
  author: UserBasic;
  comment_type: CommentType;
  message: string;
  created_at: string;
}

export interface ServiceRequestAttachment {
  id: number;
  service_request: number;
  uploaded_by: UserBasic;
  file: string;
  file_url?: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface LinkedTicket {
  id: number;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
}

export interface LinkedAsset {
  id: number;
  asset_tag: string;
  model: string;
  serial_number: string;
  status: string;
  type_name: string;
}

export interface LinkedSoftware {
  id: number;
  software_id: string;
  name: string;
  version: string;
  status: string;
  category_name: string;
}

export interface LinkedProcurement {
  id: number;
  request_id: string;
  item_name: string;
  status: string;
  estimated_total_cost: string | number;
}

export interface ServiceRequest {
  id: number;
  request_id: string;
  requester: UserBasic;
  requester_name: string;
  requester_email: string;
  requested_for?: {
    id: number;
    full_name: string;
    email: string;
    job_title: string;
  } | null;
  requested_for_name: string;
  department?: {
    id: number;
    name: string;
  } | null;
  department_name: string;
  request_type: RequestType;
  request_type_display: string;
  subject: string;
  description: string;
  priority: RequestPriority;
  priority_display: string;
  business_justification: string;
  required_by_date: string | null;
  status: RequestStatus;
  status_display: string;
  assigned_to?: UserBasic | null;
  assigned_to_name: string;
  assigned_date: string | null;
  approval_required: boolean;
  approved_by?: UserBasic | null;
  approved_by_name: string;
  approved_date: string | null;
  approval_comment: string;
  rejected_by?: UserBasic | null;
  rejected_date: string | null;
  rejection_reason: string;
  completed_by?: UserBasic | null;
  completed_date: string | null;
  cancelled_date: string | null;
  cancellation_reason: string;
  notes: string;
  linked_ticket?: LinkedTicket | null;
  linked_asset?: LinkedAsset | null;
  linked_software?: LinkedSoftware | null;
  linked_procurement?: LinkedProcurement | null;
  is_overdue: boolean;
  comments?: ServiceRequestComment[];
  attachments?: ServiceRequestAttachment[];
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestStats {
  total: number;
  pending_approval: number;
  submitted: number;
  in_progress: number;
  waiting_for_user: number;
  completed: number;
  overdue: number;
}

export interface ServiceRequestFilters {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  request_type?: string;
  priority?: string;
  assigned_to?: string;
  approval_required?: boolean;
  overdue?: boolean;
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedServiceRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceRequest[];
}
