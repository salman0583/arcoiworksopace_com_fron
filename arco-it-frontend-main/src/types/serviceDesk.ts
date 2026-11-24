import type { TicketListItem, TicketDetail, Priority as TicketPriority, TicketStatus } from './tickets';
import type { ServiceRequest, RequestPriority, RequestStatus, RequestType } from './serviceRequests';

export type ServiceDeskType = 'incident' | 'service_request';

export interface ServiceDeskItem {
  id: number;
  rawId: number | string;
  request_id: string; // 'IT-2026-0001' or 'SR-2026-0001'
  type: ServiceDeskType;
  subject: string;
  description: string;
  priority: string;
  status: string;
  requester_name: string;
  requester_email: string;
  department_name: string | null;
  category_name: string | null;
  assigned_to_name: string | null;
  assigned_to_id?: number | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  is_overdue: boolean;
  rawTicket?: TicketListItem;
  rawServiceRequest?: ServiceRequest;
}

export interface ServiceDeskStats {
  total: number;
  incidents_count: number;
  service_requests_count: number;
  open_count: number;
  in_progress_count: number;
  waiting_count: number;
  resolved_count: number;
  overdue_count: number;
}

export interface ServiceDeskFilterParams {
  search?: string;
  type?: 'all' | 'incident' | 'service_request';
  tab?: 'all' | 'unassigned' | 'my_work';
  status?: string;
  priority?: string;
  category?: string;
  overdue?: boolean;
}
