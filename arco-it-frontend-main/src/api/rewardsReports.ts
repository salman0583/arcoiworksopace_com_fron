// frontend/src/api/rewardsReports.ts
import apiClient from './client';
import type { PaginatedResponse } from '../types';
import type { RewardDistribution } from '../types/rewards';

export interface RewardReportsSummary {
  total_programs: number;
  active_programs: number;
  completed_programs: number;
  total_items_procured: number;
  total_units_distributed: number;
  total_units_remaining: number;
  total_budget: number;
  unique_recipients: number;
  by_category: Array<{
    category: string;
    label: string;
    procured: number;
    distributed: number;
    remaining: number;
  }>;
  by_department: Array<{
    id: number;
    name: string;
    distributed_count: number;
    recipients_count: number;
  }>;
  by_status: {
    planned: number;
    active: number;
    partially_distributed: number;
    completed: number;
    cancelled: number;
  };
  by_program_type: Array<{
    type: string;
    label: string;
    count: number;
  }>;
}

export interface RewardReportFilters {
  report_type?: string;
  program?: string | number;
  program_type?: string;
  category?: string;
  department?: string | number;
  employee?: string | number;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

const triggerBlobDownload = (blobData: any, contentType: string, defaultFilename: string) => {
  const blob = new Blob([blobData], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const rewardsReportsApi = {
  getSummary: async (): Promise<RewardReportsSummary> => {
    const response = await apiClient.get<RewardReportsSummary>('/rewards/reports/summary/');
    return response.data;
  },

  getData: async (filters: RewardReportFilters = {}): Promise<PaginatedResponse<RewardDistribution>> => {
    const response = await apiClient.get<PaginatedResponse<RewardDistribution>>('/rewards/reports/data/', {
      params: filters,
    });
    return response.data;
  },

  exportExcel: async (filters: RewardReportFilters = {}, customFilename?: string): Promise<void> => {
    const response = await apiClient.get('/rewards/reports/export/excel/', {
      params: filters,
      responseType: 'blob',
    });

    const filename =
      customFilename ||
      `ARCO_Rewards_Report_${filters.report_type || 'master'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    triggerBlobDownload(
      response.data,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    );
  },

  exportWord: async (filters: RewardReportFilters = {}, customFilename?: string): Promise<void> => {
    const response = await apiClient.get('/rewards/reports/export/word/', {
      params: filters,
      responseType: 'blob',
    });

    const filename =
      customFilename ||
      `ARCO_Rewards_Report_${filters.report_type || 'master'}_${new Date().toISOString().slice(0, 10)}.docx`;

    triggerBlobDownload(
      response.data,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename
    );
  },
};
