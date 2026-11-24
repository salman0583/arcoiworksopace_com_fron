// frontend/src/api/assetsReports.ts
import apiClient from './client';
import type { Asset, PaginatedResponse } from '../types';

export interface AssetReportsSummary {
  total_assets: number;
  total_valuation: number;
  by_status: {
    available: number;
    assigned: number;
    in_repair: number;
    damaged: number;
    lost: number;
    retired: number;
    disposed: number;
  };
  by_condition: Record<string, number>;
  by_type: Array<{ id: number; name: string; count: number }>;
  by_department: Array<{ id: number; name: string; count: number; total_value: number }>;
  warranty: {
    expired: number;
    expiring_30: number;
    expiring_60: number;
    active: number;
    no_warranty: number;
  };
  custody: {
    total_assigned: number;
    acknowledged: number;
    pending_acknowledgment: number;
    compliance_rate: number;
  };
}

export interface AssetReportFilters {
  report_type?: string;
  status?: string;
  condition?: string;
  asset_type?: string | number;
  department_id?: string | number;
  warranty?: string;
  search?: string;
  assigned?: string;
  is_acknowledged?: string;
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

export const assetsReportsApi = {
  getSummary: async (): Promise<AssetReportsSummary> => {
    const response = await apiClient.get<AssetReportsSummary>('/assets/reports/summary/');
    return response.data;
  },

  getData: async (filters: AssetReportFilters = {}): Promise<PaginatedResponse<Asset>> => {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets/reports/data/', {
      params: filters,
    });
    return response.data;
  },

  exportExcel: async (filters: AssetReportFilters = {}, customFilename?: string): Promise<void> => {
    const response = await apiClient.get('/assets/reports/export/excel/', {
      params: filters,
      responseType: 'blob',
    });

    const filename =
      customFilename ||
      `ARCO_Asset_Report_${filters.report_type || 'master'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    triggerBlobDownload(
      response.data,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    );
  },

  exportWord: async (filters: AssetReportFilters = {}, customFilename?: string): Promise<void> => {
    const response = await apiClient.get('/assets/reports/export/word/', {
      params: filters,
      responseType: 'blob',
    });

    const filename =
      customFilename ||
      `ARCO_Asset_Report_${filters.report_type || 'master'}_${new Date().toISOString().slice(0, 10)}.docx`;

    triggerBlobDownload(
      response.data,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename
    );
  },

  downloadHandoverDoc: async (assetId: number | string, assetTag: string): Promise<void> => {
    const response = await apiClient.get(`/assets/${assetId}/handover-doc/`, {
      responseType: 'blob',
    });

    const filename = `Handover_Slip_${assetTag}_${new Date().toISOString().slice(0, 10)}.docx`;
    triggerBlobDownload(
      response.data,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename
    );
  },
};

