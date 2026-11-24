import apiClient from './client';
import type { PaginatedResponse } from '../types';
import type {
  VendorListItem,
  VendorDetail,
  VendorContact,
  Contract,
  VendorStats,
} from '../types/vendors';

export interface VendorFilterParams {
  search?: string;
  vendor_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface ContractFilterParams {
  vendor?: number;
  contract_type?: string;
  status?: string;
  expiring_soon?: boolean;
  expired?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export const vendorsApi = {
  list: async (params?: VendorFilterParams): Promise<PaginatedResponse<VendorListItem>> => {
    const response = await apiClient.get('/vendors/', { params });
    return response.data;
  },

  get: async (id: number): Promise<VendorDetail> => {
    const response = await apiClient.get(`/vendors/${id}/`);
    return response.data;
  },

  create: async (data: Partial<VendorDetail>): Promise<VendorDetail> => {
    const response = await apiClient.post('/vendors/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<VendorDetail>): Promise<VendorDetail> => {
    const response = await apiClient.patch(`/vendors/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/vendors/${id}/`);
  },

  getStats: async (): Promise<VendorStats> => {
    const response = await apiClient.get('/vendors/stats/');
    return response.data;
  },

  addContact: async (vendorId: number, data: Partial<VendorContact>): Promise<VendorContact> => {
    const response = await apiClient.post(`/vendors/${vendorId}/contacts/`, data);
    return response.data;
  },

  deleteContact: async (contactId: number): Promise<void> => {
    await apiClient.delete(`/vendors/contacts/${contactId}/`);
  },

  listContracts: async (params?: ContractFilterParams): Promise<PaginatedResponse<Contract>> => {
    const response = await apiClient.get('/contracts/', { params });
    return response.data;
  },

  createContract: async (data: Partial<Contract>): Promise<Contract> => {
    const response = await apiClient.post('/contracts/', data);
    return response.data;
  },

  updateContract: async (id: number, data: Partial<Contract>): Promise<Contract> => {
    const response = await apiClient.patch(`/contracts/${id}/`, data);
    return response.data;
  },

  deleteContract: async (id: number): Promise<void> => {
    await apiClient.delete(`/contracts/${id}/`);
  },

  updateTicketVendorSupport: async (
    ticketId: number,
    data: {
      vendor_id?: number | null;
      vendor_case_number?: string;
      vendor_notes?: string;
      set_waiting_for_vendor?: boolean;
    }
  ) => {
    const response = await apiClient.patch(`/tickets/${ticketId}/vendor-support/`, data);
    return response.data;
  },
};
