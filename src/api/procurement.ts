import apiClient from './client';
import type { PaginatedResponse } from '../types';
import type {
  ProcurementRequestListItem,
  ProcurementRequestDetail,
  ProcurementQuotation,
  ProcurementStats,
  CreateProcurementPayload,
  CreateQuotationPayload,
  OrderProcurementPayload,
  ReceiveProcurementPayload,
  CreateAssetFromProcurementPayload,
  UpdateSoftwareFromProcurementPayload,
  QuotationComparisonResponse,
} from '../types/procurement';

export const procurementApi = {
  list: async (params: {
    page?: number;
    search?: string;
    status?: string;
    request_type?: string;
    priority?: string;
    vendor?: number | string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<PaginatedResponse<ProcurementRequestListItem>> => {
    const res = await apiClient.get('/procurement/', { params });
    return res.data;
  },

  get: async (id: number): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.get(`/procurement/${id}/`);
    return res.data;
  },

  create: async (data: CreateProcurementPayload): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post('/procurement/', data);
    return res.data;
  },

  update: async (id: number, data: Partial<CreateProcurementPayload>): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.patch(`/procurement/${id}/`, data);
    return res.data;
  },

  submit: async (id: number): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/submit/`);
    return res.data;
  },

  review: async (id: number): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/review/`);
    return res.data;
  },

  listQuotations: async (id: number): Promise<ProcurementQuotation[]> => {
    const res = await apiClient.get(`/procurement/${id}/quotations/`);
    return res.data;
  },

  compareQuotations: async (id: number): Promise<QuotationComparisonResponse> => {
    const res = await apiClient.get(`/procurement/${id}/quotations/compare/`);
    return res.data;
  },

  resolveQuotationMatch: async (id: number, itemIds: number[], matchKey?: string): Promise<QuotationComparisonResponse> => {
    const res = await apiClient.post(`/procurement/${id}/quotations/resolve-match/`, {
      item_ids: itemIds,
      match_key: matchKey || '',
    });
    return res.data;
  },

  addQuotation: async (id: number, data: FormData | CreateQuotationPayload): Promise<ProcurementQuotation> => {
    let payload = data;
    if (!(data instanceof FormData)) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val instanceof File ? val : String(val));
        }
      });
      payload = formData;
    }
    const res = await apiClient.post(`/procurement/${id}/quotations/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteQuotation: async (id: number, qid: number): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/procurement/${id}/quotations/${qid}/`);
    return res.data;
  },

  selectQuotation: async (id: number, quotationId: number, selectionReason?: string): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/select-quotation/`, {
      quotation_id: quotationId,
      selection_reason: selectionReason || '',
    });
    return res.data;
  },

  approve: async (id: number, approval_comment?: string): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/approve/`, { approval_comment });
    return res.data;
  },

  reject: async (id: number, approval_comment: string): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/reject/`, { approval_comment });
    return res.data;
  },

  order: async (id: number, data: OrderProcurementPayload): Promise<ProcurementRequestDetail> => {
    const formData = new FormData();
    formData.append('order_number', data.order_number);
    formData.append('order_date', data.order_date);
    formData.append('actual_vendor_id', String(data.actual_vendor_id));
    if (data.expected_delivery_date) formData.append('expected_delivery_date', data.expected_delivery_date);
    if (data.actual_unit_cost) formData.append('actual_unit_cost', String(data.actual_unit_cost));
    if (data.payment_terms) formData.append('payment_terms', data.payment_terms);
    if (data.delivery_address) formData.append('delivery_address', data.delivery_address);
    if (data.order_notes) formData.append('order_notes', data.order_notes);
    if (data.order_document) formData.append('order_document', data.order_document);

    const res = await apiClient.post(`/procurement/${id}/order/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  receive: async (id: number, data: ReceiveProcurementPayload): Promise<ProcurementRequestDetail> => {
    const formData = new FormData();
    formData.append('quantity_received', String(data.quantity_received));
    if (data.received_date) formData.append('received_date', data.received_date);
    if (data.condition) formData.append('condition', data.condition);
    if (data.notes) formData.append('notes', data.notes);
    if (data.receiving_document) formData.append('receiving_document', data.receiving_document);

    const res = await apiClient.post(`/procurement/${id}/receive/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  createAsset: async (id: number, data: CreateAssetFromProcurementPayload): Promise<{
    success: boolean;
    asset_id: number;
    asset_tag: string;
    status: string;
    procurement_id: number;
  }> => {
    const res = await apiClient.post(`/procurement/${id}/create-asset/`, data);
    return res.data;
  },

  updateSoftware: async (id: number, data: UpdateSoftwareFromProcurementPayload): Promise<{
    success: boolean;
    software_id: number;
    software_code: string;
    name: string;
    old_total_licenses: number;
    new_total_licenses: number;
    available_licenses: number;
  }> => {
    const res = await apiClient.post(`/procurement/${id}/update-software/`, data);
    return res.data;
  },

  complete: async (id: number): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/complete/`);
    return res.data;
  },

  cancel: async (id: number, reason?: string): Promise<ProcurementRequestDetail> => {
    const res = await apiClient.post(`/procurement/${id}/cancel/`, { reason });
    return res.data;
  },

  getStats: async (): Promise<ProcurementStats> => {
    const res = await apiClient.get('/procurement/stats/');
    return res.data;
  },
};
