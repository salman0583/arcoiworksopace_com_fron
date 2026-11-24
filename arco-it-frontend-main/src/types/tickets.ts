// ── Ticket Types ──────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'waiting_for_vendor'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type CommentType = 'public' | 'internal';

export interface TicketCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  subcategories: TicketSubcategory[];
}

export interface TicketSubcategory {
  id: number;
  name: string;
  is_active: boolean;
}

export interface TicketUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
}

export interface TicketListItem {
  id: number;
  ticket_number: string;
  subject: string;
  priority: Priority;
  status: TicketStatus;
  requester_name: string;
  requester_email: string;
  department_name: string | null;
  category_name: string | null;
  assigned_to_name: string | null;
  assigned_to_id?: number | null;
  asset_id?: number | null;
  asset_tag?: string | null;
  asset_name?: string | null;
  software_id?: number | null;
  software_name?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  vendor_case_number?: string | null;
  created_at: string;

  updated_at: string;
  due_date: string | null;
  is_overdue: boolean;
}


export interface Technician {
  id: number;
  email: string;
  full_name: string;
  role: string;
  open_tickets_count: number;
}


export interface TicketDetail {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  requester: TicketUser;
  department: number | null;
  department_name: string | null;
  category: TicketCategory | null;
  category_id?: number | null;
  subcategory: TicketSubcategory | null;
  subcategory_id?: number | null;
  priority: Priority;
  status: TicketStatus;
  assigned_to: TicketUser | null;
  assigned_to_id?: number | null;
  asset?: {
    id: number;
    asset_tag: string;
    name: string;
    asset_type_name: string | null;
    manufacturer: string;
    model: string;
    serial_number: string;
    status: string;
    condition: string;
    location: string;
    warranty_status: string;
  } | null;
  software?: {
    id: number;
    software_id: string;
    name: string;
    publisher: string;
    version?: string;
    category?: string;
    status?: string;
  } | null;
  vendor?: {
    id: number;
    vendor_id: string;
    name: string;
    vendor_type: string;
    support_email?: string;
    support_phone?: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
  } | null;
  vendor_case_number?: string;
  vendor_notes?: string;
  created_at: string;


  updated_at: string;
  due_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_summary: string;
  is_overdue: boolean;
  attachment_count: number;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: Priority;
  category_id?: number | null;
  subcategory_id?: number | null;
  asset_id?: number | null;
}


export interface TicketComment {
  id: number;
  ticket: number;
  author: number;
  author_name: string;
  author_role: string;
  comment_type: CommentType;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface TicketHistory {
  id: number;
  action: string;
  actor_name: string;
  field_name: string;
  old_value: string;
  new_value: string;
  note: string;
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  original_filename: string;
  file_size: number;
  file_size_display: string;
  content_type: string;
  uploader_name: string;
  created_at: string;
  file: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ITUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}
