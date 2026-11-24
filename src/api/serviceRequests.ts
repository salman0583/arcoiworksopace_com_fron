import apiClient from './client';
import {
  ServiceRequest,
  PaginatedServiceRequests,
  ServiceRequestStats,
  ServiceRequestFilters,
  ServiceRequestComment,
  ServiceRequestAttachment,
} from '../types/serviceRequests';

export const serviceRequestsApi = {
  list: async (params: ServiceRequestFilters = {}): Promise<PaginatedServiceRequests> => {
    const res = await apiClient.get<PaginatedServiceRequests>('/service-requests/', { params });
    return res.data;
  },

  getStats: async (): Promise<ServiceRequestStats> => {
    const res = await apiClient.get<ServiceRequestStats>('/service-requests/stats/');
    return res.data;
  },

  get: async (id: number | string): Promise<ServiceRequest> => {
    const res = await apiClient.get<ServiceRequest>(`/service-requests/${id}/`);
    return res.data;
  },

  create: async (data: {
    request_type: string;
    subject: string;
    description: string;
    priority: string;
    business_justification?: string;
    required_by_date?: string | null;
    requested_for_id?: number | null;
  }): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>('/service-requests/', data);
    return res.data;
  },

  update: async (id: number | string, data: Partial<ServiceRequest>): Promise<ServiceRequest> => {
    const res = await apiClient.patch<ServiceRequest>(`/service-requests/${id}/`, data);
    return res.data;
  },

  approve: async (id: number | string, comment = ''): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/approve/`, { comment });
    return res.data;
  },

  reject: async (id: number | string, reason: string): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/reject/`, { reason });
    return res.data;
  },

  assign: async (id: number | string, assignedTo: number): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/assign/`, { assigned_to: assignedTo });
    return res.data;
  },

  updateStatus: async (id: number | string, status: string): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/status/`, { status });
    return res.data;
  },

  complete: async (id: number | string): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/complete/`);
    return res.data;
  },

  cancel: async (id: number | string, reason = ''): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/cancel/`, { reason });
    return res.data;
  },

  respond: async (id: number | string, message: string): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/respond/`, { message });
    return res.data;
  },

  listComments: async (id: number | string): Promise<ServiceRequestComment[]> => {
    const res = await apiClient.get<ServiceRequestComment[]>(`/service-requests/${id}/comments/`);
    return res.data;
  },

  addComment: async (id: number | string, message: string, commentType = 'public'): Promise<ServiceRequestComment> => {
    const res = await apiClient.post<ServiceRequestComment>(`/service-requests/${id}/comments/`, {
      message,
      comment_type: commentType,
    });
    return res.data;
  },

  uploadAttachment: async (id: number | string, file: File): Promise<ServiceRequestAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ServiceRequestAttachment>(`/service-requests/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  linkItems: async (
    id: number | string,
    links: {
      ticket_id?: number | null;
      asset_id?: number | null;
      software_id?: number | null;
      procurement_id?: number | null;
    }
  ): Promise<ServiceRequest> => {
    const res = await apiClient.post<ServiceRequest>(`/service-requests/${id}/link/`, links);
    return res.data;
  },
};
