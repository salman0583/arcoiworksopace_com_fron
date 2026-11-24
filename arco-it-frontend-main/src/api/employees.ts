import apiClient from './client';
import type { Employee, PaginatedResponse, Department, Employee360Data } from '../types';

interface EmployeeFilters {
  search?: string;
  department?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface CreateUserResponse {
  message: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: string;
  user_id: number;
  temporary_password?: string;
}

export interface ResetPasswordResponse {
  message: string;
  employee_id: string;
  full_name: string;
  email: string;
  temporary_password: string;
}

export const employeesApi = {
  list: async (filters: EmployeeFilters = {}): Promise<PaginatedResponse<Employee>> => {
    const response = await apiClient.get('/employees/', { params: filters });
    return response.data;
  },
  get: async (id: number): Promise<Employee> => {
    const response = await apiClient.get(`/employees/${id}/`);
    return response.data;
  },
  getOverview360: async (id: number): Promise<Employee360Data> => {
    const response = await apiClient.get(`/employees/${id}/overview-360/`);
    return response.data;
  },
  create: async (data: Partial<Employee> & Record<string, unknown>): Promise<Employee> => {
    const response = await apiClient.post('/employees/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.patch(`/employees/${id}/`, data);
    return response.data;
  },
  departments: async (): Promise<Department[]> => {
    const response = await apiClient.get('/departments/');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { results?: Department[] }).results)) {
      return (data as { results: Department[] }).results;
    }
    return [];
  },
  createUserAccount: async (id: number, data?: { temp_password?: string; role?: string }): Promise<CreateUserResponse> => {
    const response = await apiClient.post(`/employees/${id}/create-user/`, data || {});
    return response.data;
  },
  resetUserPassword: async (id: number, data?: { temp_password?: string }): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post(`/employees/${id}/reset-password/`, data || {});
    return response.data;
  },
};
