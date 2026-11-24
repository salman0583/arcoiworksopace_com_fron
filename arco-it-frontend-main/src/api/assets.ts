import apiClient from './client';
import type {
  Asset,
  AssetType,
  AssetStats,
  MyAsset,
  AssetFilters,
  CreateAssetPayload,
  AssignAssetPayload,
  ReturnAssetPayload,
  ReassignAssetPayload,
  ChangeAssetStatusPayload,
  PaginatedResponse,
} from '../types';

export const assetsApi = {
  getAssetTypes: async (): Promise<AssetType[]> => {
    const response = await apiClient.get<AssetType[]>('/assets/types/');
    return response.data;
  },

  getNextAssetTag: async (category: string = 'it'): Promise<{ category: string; next_tag: string }> => {
    const response = await apiClient.get<{ category: string; next_tag: string }>('/assets/next-tag/', {
      params: { category },
    });
    return response.data;
  },

  listAssets: async (filters: AssetFilters = {}): Promise<PaginatedResponse<Asset>> => {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets/', {
      params: filters,
    });
    return response.data;
  },

  getAsset: async (idOrTag: number | string): Promise<Asset> => {
    const response = await apiClient.get<Asset>(`/assets/${idOrTag}/`);
    return response.data;
  },

  createAsset: async (data: CreateAssetPayload): Promise<Asset> => {
    const response = await apiClient.post<Asset>('/assets/', data);
    return response.data;
  },

  updateAsset: async (idOrTag: number | string, data: Partial<CreateAssetPayload>): Promise<Asset> => {
    const response = await apiClient.patch<Asset>(`/assets/${idOrTag}/`, data);
    return response.data;
  },

  assignAsset: async (idOrTag: number | string, data: AssignAssetPayload): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`/assets/${idOrTag}/assign/`, data);
    return response.data;
  },

  returnAsset: async (idOrTag: number | string, data: ReturnAssetPayload): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`/assets/${idOrTag}/return/`, data);
    return response.data;
  },

  reassignAsset: async (idOrTag: number | string, data: ReassignAssetPayload): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`/assets/${idOrTag}/reassign/`, data);
    return response.data;
  },

  changeAssetStatus: async (idOrTag: number | string, data: ChangeAssetStatusPayload): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`/assets/${idOrTag}/status/`, data);
    return response.data;
  },

  getMyAssets: async (): Promise<MyAsset[]> => {
    const response = await apiClient.get<MyAsset[]>('/assets/my/');
    return response.data;
  },

  acknowledgeAsset: async (
    idOrTag: number | string,
    data?: { condition?: string; notes?: string; report_issue?: boolean }
  ): Promise<{
    success: boolean;
    acknowledgement_status?: string;
    is_acknowledged?: boolean;
    acknowledged_at?: string;
    condition?: string;
    notes?: string;
  }> => {
    const response = await apiClient.post(`/assets/${idOrTag}/acknowledge/`, data || {});
    return response.data;
  },

  getAssetStats: async (): Promise<AssetStats> => {
    const response = await apiClient.get<AssetStats>('/assets/stats/');
    return response.data;
  },

  verifyAssetQR: async (
    idOrTag: number | string
  ): Promise<{
    is_valid: boolean;
    asset_id: number;
    asset_tag: string;
    category: string;
    category_display: string;
    name: string;
    status: string;
    condition: string;
    qr_code_url: string;
    full_qr_url: string;
    barcode_value: string;
    message: string;
  }> => {
    const response = await apiClient.get(`/assets/${idOrTag}/verify/`);
    return response.data;
  },

  downloadLabelsPdf: async (params: {
    ids?: number[];
    id?: number;
    tag?: string;
    single?: boolean;
    theme?: 'auto' | 'it' | 'admin';
    layout?: 'dual_sheet' | 'sheet' | 'single';
    tagFormat?: 'short' | 'full';
  }): Promise<Blob> => {
    const queryParams: Record<string, string> = {};
    if (params.ids && params.ids.length > 0) queryParams.ids = params.ids.join(',');
    if (params.id) queryParams.id = String(params.id);
    if (params.tag) queryParams.tag = params.tag;
    if (params.single) queryParams.single = 'true';
    if (params.theme) queryParams.theme = params.theme;
    if (params.layout) queryParams.layout = params.layout;
    if (params.tagFormat) queryParams.tag_format = params.tagFormat;

    const response = await apiClient.get('/assets/labels/pdf/', {
      params: queryParams,
      responseType: 'blob',
    });
    return response.data;
  },

  exportQRData: async (params: {
    ids?: number[];
    format?: 'csv' | 'xlsx' | 'json';
    search?: string;
    category?: string;
    status?: string;
    asset_type?: number;
  }): Promise<Blob> => {
    const queryParams: Record<string, string> = {};
    if (params.ids && params.ids.length > 0) queryParams.ids = params.ids.join(',');
    if (params.format) queryParams.format = params.format;
    if (params.search) queryParams.search = params.search;
    if (params.category) queryParams.category = params.category;
    if (params.status) queryParams.status = params.status;
    if (params.asset_type) queryParams.asset_type = String(params.asset_type);

    const response = await apiClient.get('/assets/export-qr-data/', {
      params: queryParams,
      responseType: 'blob',
    });
    return response.data;
  },
};

