export type UserRole = 'employee' | 'it_support' | 'it_admin' | 'super_admin' | 'hr';

export type { Technician } from './tickets';
export * from './assets';
export * from './rewards';
export * from './expenses';
export * from './serviceDesk';

export type EmployeeStatus = 'active' | 'on_leave' | 'inactive' | 'exited';



export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  date_joined: string;
  employee_id?: string | null;
  department_name?: string | null;
  job_title?: string | null;
  location?: string | null;
  employee_status?: EmployeeStatus | null;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  employee_count: number;
  created_at?: string;
}

export interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  department: Department;
  department_name: string;
  job_title: string;
  manager: Employee | null;
  manager_name: string | null;
  location: string;
  joining_date: string;
  status: EmployeeStatus;
  user?: number | null;
  user_id?: number | null;
  has_user_account?: boolean;
  user_role?: UserRole | null;
  user_email?: string | null;
  generated_password?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Employee360Asset {
  id: number;
  asset_tag: string;
  name: string;
  type_name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  condition: string;
  assigned_date: string | null;
  warranty_status: string;
  warranty_end_date: string | null;
  is_acknowledged: boolean;
  acknowledgement_status?: string;
  acknowledgement_condition?: string;
  acknowledgement_notes?: string;
  acknowledged_at: string | null;
}

export interface Employee360Software {
  id: number;
  assignment_id: number;
  software_id: string;
  name: string;
  publisher: string;
  version: string;
  category: string;
  license_type: string;
  status: string;
  assigned_date: string | null;
  license_expiry_date: string | null;
  device_tag: string | null;
}

export interface Employee360ServiceRequest {
  id: number;
  rawId: number;
  request_id: string;
  type: 'service_request';
  subject: string;
  request_type: string;
  priority: string;
  status: string;
  created_at: string;
  required_by_date: string | null;
  assigned_to_name: string | null;
}

export interface Employee360Ticket {
  id: number;
  rawId: number;
  request_id: string;
  type: 'incident';
  subject: string;
  category_name: string;
  priority: string;
  status: string;
  created_at: string;
  due_date: string | null;
  assigned_to_name: string | null;
}

export interface Employee360Procurement {
  id: number;
  request_id: string;
  item_name: string;
  request_type: string;
  quantity: number;
  received_quantity: number;
  estimated_total_cost: number;
  actual_total_cost: number | null;
  priority: string;
  status: string;
  created_at: string;
  vendor_name: string | null;
}

export interface Employee360Activity {
  id: number;
  action: string;
  details: string;
  actor_name: string;
  timestamp: string;
  type: string;
}

export interface Employee360Data {
  employee: Employee;
  assets: Employee360Asset[];
  software: Employee360Software[];
  service_requests: Employee360ServiceRequest[];
  tickets: Employee360Ticket[];
  procurement_requests: Employee360Procurement[];
  activity: Employee360Activity[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  unread_count?: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface LoginPendingResponse {
  status: 'otp_required';
  message: string;
  temp_token: string;
  email: string;
  expires_in: number;
}

export type LoginResult = LoginResponse | LoginPendingResponse;

export interface OTPVerifyRequest {
  temp_token: string;
  otp: string;
}

export interface OTPResendRequest {
  temp_token: string;
  purpose?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetOTPRequest {
  temp_token: string;
  otp: string;
}

export interface ResetPasswordRequest {
  reset_token: string;
  new_password: string;
  confirm_password?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ── Phase 3 Admin & Core Types ────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  timestamp: string;
  actor_name: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  description: string;
}

export interface InAppNotification {
  id: number;
  title: string;
  message: string;
  ticket: number | null;
  ticket_number: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse extends PaginatedResponse<InAppNotification> {
  unread_count: number;
}

export interface TechnicianWorkload {
  id: number;
  name: string;
  email: string;
  role: string;
  open_count: number;
  in_progress_count: number;
  overdue_count: number;
}

export interface RecentUnassignedTicket {
  id: number;
  ticket_number: string;
  subject: string;
  category_name: string;
  priority: string;
  requester_name: string;
  created_at: string;
}

export interface RecentOverdueTicket {
  id: number;
  ticket_number: string;
  subject: string;
  requester_name: string;
  priority: string;
  assigned_to_name: string;
  due_date: string | null;
  overdue_duration: string;
}

export interface RecentAssignedTicket {
  id: number;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  requester_name: string;
  due_date: string | null;
  is_overdue: boolean;
}

export interface RecentEmployeeTicket {
  id: number;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  category_name: string;
  assigned_to_name: string;
  created_at: string;
}

export interface DashboardStats {
  role: UserRole;
  metrics: {
    // IT Admin
    open_tickets?: number;
    unassigned_tickets?: number;
    overdue_tickets?: number;
    critical_tickets?: number;
    resolved_this_month?: number;

    // IT Support
    assigned_to_me?: number;
    in_progress?: number;
    overdue?: number;

    // Employee
    my_open_tickets?: number;
    my_in_progress_tickets?: number;
    my_resolved_tickets?: number;
  };
  unassigned_tickets?: RecentUnassignedTicket[];
  overdue_tickets?: RecentOverdueTicket[];
  technician_workload?: TechnicianWorkload[];
  recent_activity?: AuditLog[];
  recent_assigned_tickets?: RecentAssignedTicket[];
  recent_tickets?: RecentEmployeeTicket[];
}

// ── Software Management Types ──────────────────────────────────────────
export type SoftwareCategory =
  | 'operating_system'
  | 'productivity'
  | 'security'
  | 'development'
  | 'communication'
  | 'design'
  | 'database'
  | 'vpn_remote'
  | 'hosting_infrastructure'
  | 'other';

export type AllocationScope =
  | 'company_wide'
  | 'user_specific'
  | 'infrastructure'
  | 'device_specific';

export type LicenseType =
  | 'subscription'
  | 'per_user'
  | 'per_device'
  | 'perpetual'
  | 'trial'
  | 'open_source'
  | 'other';

export type SoftwareStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'suspended'
  | 'retired';

export interface SoftwareAssignment {
  id: number;
  software: number;
  employee_id?: number | null;
  employee_code?: string | null;
  employee_name?: string | null;
  employee_email?: string | null;
  employee_department?: string | null;
  asset_id?: number | null;
  asset_tag?: string | null;
  asset_name?: string | null;
  assigned_date: string;
  revoked_date?: string | null;
  is_active: boolean;
  assigned_by_name?: string | null;
  notes?: string;
  created_at: string;
}

export interface SoftwareHistory {
  id: number;
  action: string;
  actor_name: string;
  details: string;
  timestamp: string;
}

export interface Software {
  id: number;
  software_id: string;
  name: string;
  publisher: string;
  version: string;
  category: SoftwareCategory;
  allocation_scope: AllocationScope;
  license_type: LicenseType;
  license_key?: string | null;
  total_licenses: number;
  used_licenses: number;
  available_licenses: number;
  utilization_percentage: number;
  purchase_date?: string | null;
  license_start_date?: string | null;
  license_expiry_date?: string | null;
  cost?: number | string | null;
  status: SoftwareStatus;
  computed_status: SoftwareStatus;
  display_order?: number;
  notes?: string;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  assignments?: SoftwareAssignment[];
  history?: SoftwareHistory[];
}

export interface MySoftware {
  id: number;
  software_id: string;
  name: string;
  publisher: string;
  version: string;
  category: string;
  allocation_scope?: AllocationScope | string;
  license_type: string;
  status: string;
  license_expiry_date?: string | null;
  assigned_date: string;
  asset_tag?: string | null;
  asset_name?: string | null;
  notes?: string;
}

export interface SoftwareStats {
  total_software: number;
  active_software: number;
  expiring_soon: number;
  expired: number;
  total_licenses: number;
  used_licenses: number;
  available_licenses: number;
  utilization_rate: number;
}

