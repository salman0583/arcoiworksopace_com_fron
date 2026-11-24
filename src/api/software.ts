import apiClient from './client';
import type {
  Software,
  SoftwareAssignment,
  MySoftware,
  SoftwareStats,
  PaginatedResponse,
} from '../types';

export interface SoftwareFilters {
  search?: string;
  category?: string;
  allocation_scope?: string;
  status?: string;
  license_type?: string;
  expiring_soon?: boolean;
  expired?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
  expiry_preset?: string;
  expiry_date_from?: string;
  expiry_date_to?: string;
}

export const softwareApi = {
  getSoftwareList: async (filters: SoftwareFilters = {}): Promise<PaginatedResponse<Software>> => {
    const params: Record<string, unknown> = { ...filters };
    if (filters.expiring_soon) params.expiring_soon = 'true';
    if (filters.expired) params.expired = 'true';
    const response = await apiClient.get<PaginatedResponse<Software>>('/software/', { params });
    return response.data;
  },

  getSoftware: async (id: number): Promise<Software> => {
    const response = await apiClient.get<Software>(`/software/${id}/`);
    return response.data;
  },

  createSoftware: async (data: Partial<Software>): Promise<Software> => {
    const response = await apiClient.post<Software>('/software/', data);
    return response.data;
  },

  updateSoftware: async (id: number, data: Partial<Software>): Promise<Software> => {
    const response = await apiClient.patch<Software>(`/software/${id}/`, data);
    return response.data;
  },

  deleteSoftware: async (id: number): Promise<void> => {
    await apiClient.delete(`/software/${id}/`);
  },

  assignSoftware: async (
    id: number,
    payload: { employee_id?: number | null; asset_id?: number | null; notes?: string }
  ): Promise<Software> => {
    const response = await apiClient.post<Software>(`/software/${id}/assign/`, payload);
    return response.data;
  },

  revokeSoftware: async (
    id: number,
    payload: { assignment_id?: number | null; employee_id?: number | null; asset_id?: number | null; notes?: string }
  ): Promise<Software> => {
    const response = await apiClient.post<Software>(`/software/${id}/revoke/`, payload);
    return response.data;
  },

  reassignSoftware: async (
    id: number,
    payload: { from_employee_id: number; to_employee_id: number; notes?: string }
  ): Promise<Software> => {
    const response = await apiClient.post<Software>(`/software/${id}/reassign/`, payload);
    return response.data;
  },

  getMySoftware: async (): Promise<MySoftware[]> => {
    const response = await apiClient.get<MySoftware[]>('/software/my-software/');
    return response.data;
  },

  getSoftwareStats: async (): Promise<SoftwareStats> => {
    const response = await apiClient.get<SoftwareStats>('/software/stats/');
    return response.data;
  },
};
