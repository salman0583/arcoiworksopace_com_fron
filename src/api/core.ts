import apiClient from './client';
import type {
  DashboardStats,
  AuditLog,
  NotificationsResponse,
  PaginatedResponse,
} from '../types';

export interface AuditLogFilters {
  search?: string;
  action?: string;
  target_type?: string;
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const coreApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats/');
    return response.data;
  },

  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/', {
      params: filters,
    });
    return response.data;
  },

  getNotifications: async (page = 1, unreadOnly = true): Promise<NotificationsResponse> => {
    const params: Record<string, unknown> = { page, page_size: 15 };
    if (unreadOnly) {
      params.unread_only = 'true';
      params.is_read = 'false';
    }
    const response = await apiClient.get<NotificationsResponse>('/notifications/', {
      params,
    });
    return response.data;
  },



  markNotificationRead: async (id: number): Promise<{ success: boolean; id: number; unread_count?: number }> => {
    const response = await apiClient.post<{ success: boolean; id: number; unread_count?: number }>(`/notifications/${id}/read/`);
    return response.data;
  },

  markAllNotificationsRead: async (): Promise<{ success: boolean; marked_count: number; unread_count?: number }> => {
    const response = await apiClient.post<{ success: boolean; marked_count: number; unread_count?: number }>('/notifications/mark-all-read/');
    return response.data;
  },

  clearReadNotifications: async (): Promise<{ success: boolean; cleared_count: number; unread_count: number }> => {
    const response = await apiClient.post<{ success: boolean; cleared_count: number; unread_count: number }>('/notifications/clear-read/');
    return response.data;
  },
};

