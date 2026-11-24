import client from './client';
import type {
  TicketCategory,
  TicketListItem,
  TicketDetail,
  TicketComment,
  TicketHistory,
  TicketAttachment,
  Technician,
  PaginatedResponse,
} from '../types/tickets';

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = () =>
  client.get<TicketCategory[]>('/tickets/categories/');

// ── Technicians (IT Staff) ───────────────────────────────────────────────────

export const getTechnicians = () =>
  client.get<Technician[]>('/tickets/technicians/');

// ── Tickets ───────────────────────────────────────────────────────────────────

export const getTickets = (params?: Record<string, string | number | boolean>) =>
  client.get<PaginatedResponse<TicketListItem>>('/tickets/', { params });

export const getTicket = (id: number | string) =>
  client.get<TicketDetail>(`/tickets/${id}/`);

export const createTicket = (data: {
  subject: string;
  description: string;
  priority: string;
  category_id?: number | null;
  subcategory_id?: number | null;
  asset_id?: number | null;
  software_id?: number | null;
}) => client.post<TicketDetail>('/tickets/', data);



export const updateTicket = (id: number | string, data: Record<string, unknown>) =>
  client.patch<TicketDetail>(`/tickets/${id}/`, data);

// ── Actions ───────────────────────────────────────────────────────────────────

export const assignTicket = (id: number | string, assignedToId: number | null) =>
  client.post<TicketDetail>(`/tickets/${id}/assign/`, {
    assigned_to_id: assignedToId,
  });

export const changeTicketStatus = (id: number | string, ticketStatus: string) =>
  client.post<TicketDetail>(`/tickets/${id}/status/`, {
    status: ticketStatus,
  });

export const resolveTicket = (id: number | string, resolutionSummary: string) =>
  client.post<TicketDetail>(`/tickets/${id}/resolve/`, {
    resolution_summary: resolutionSummary,
  });

export const closeTicket = (id: number | string) =>
  client.post<TicketDetail>(`/tickets/${id}/close/`);

// ── Comments ──────────────────────────────────────────────────────────────────

export const getComments = (ticketId: number | string) =>
  client.get<PaginatedResponse<TicketComment>>(
    `/tickets/${ticketId}/comments/`
  );

export const addComment = (
  ticketId: number | string,
  data: { message: string; comment_type: string }
) => client.post<TicketComment>(`/tickets/${ticketId}/comments/`, data);

// ── History ───────────────────────────────────────────────────────────────────

export const getHistory = (ticketId: number | string) =>
  client.get<TicketHistory[]>(`/tickets/${ticketId}/history/`);

// ── Attachments ───────────────────────────────────────────────────────────────

export const getAttachments = (ticketId: number | string) =>
  client.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments/`);

export const uploadAttachment = (ticketId: number | string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<TicketAttachment>(
    `/tickets/${ticketId}/attachments/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};

export const downloadAttachment = async (
  ticketId: number | string,
  attId: number | string,
  filename: string
): Promise<void> => {
  const response = await client.get(`/tickets/${ticketId}/attachments/${attId}/`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: (response.headers['content-type'] as string) || 'application/octet-stream',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
