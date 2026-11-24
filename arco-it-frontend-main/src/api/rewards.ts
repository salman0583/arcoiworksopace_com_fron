import apiClient from './client';
import type { PaginatedResponse } from '../types';
import type {
  EngagementProgramListItem,
  EngagementProgramDetail,
  EngagementProgramCreatePayload,
  RewardItem,
  RewardItemCreatePayload,
  RewardDistribution,
  RewardDistributionCreatePayload,
  BulkRewardDistributionPayload,
  BulkDistributionResponse,
  MyReward,
  RewardStats,
  DuplicateCheckResult,
} from '../types/rewards';

export const rewardsApi = {
  // Stats
  getStats: async (): Promise<RewardStats> => {
    const res = await apiClient.get<RewardStats>('/rewards/stats/');
    return res.data;
  },

  // Programs
  listPrograms: async (params: {
    page?: number;
    search?: string;
    program_type?: string;
    status?: string;
    filter_card?: string;
    filter?: string;
    date_from?: string;
    date_to?: string;
    ordering?: string;
  } = {}): Promise<PaginatedResponse<EngagementProgramListItem>> => {
    const res = await apiClient.get<PaginatedResponse<EngagementProgramListItem>>('/rewards/programs/', { params });
    return res.data;
  },

  getProgram: async (id: number): Promise<EngagementProgramDetail> => {
    const res = await apiClient.get<EngagementProgramDetail>(`/rewards/programs/${id}/`);
    return res.data;
  },

  createProgram: async (payload: EngagementProgramCreatePayload): Promise<EngagementProgramListItem> => {
    const res = await apiClient.post<EngagementProgramListItem>('/rewards/programs/', payload);
    return res.data;
  },

  updateProgram: async (id: number, payload: Partial<EngagementProgramCreatePayload>): Promise<EngagementProgramListItem> => {
    const res = await apiClient.patch<EngagementProgramListItem>(`/rewards/programs/${id}/`, payload);
    return res.data;
  },

  deleteProgram: async (id: number): Promise<void> => {
    await apiClient.delete(`/rewards/programs/${id}/`);
  },

  // Items
  listItems: async (params: {
    program?: number;
    category?: string;
    search?: string;
    is_exhausted?: boolean;
    page?: number;
  } = {}): Promise<PaginatedResponse<RewardItem>> => {
    const res = await apiClient.get<PaginatedResponse<RewardItem>>('/rewards/items/', { params });
    return res.data;
  },

  getItem: async (id: number): Promise<RewardItem> => {
    const res = await apiClient.get<RewardItem>(`/rewards/items/${id}/`);
    return res.data;
  },

  createItem: async (payload: RewardItemCreatePayload): Promise<RewardItem> => {
    const res = await apiClient.post<RewardItem>('/rewards/items/', payload);
    return res.data;
  },

  updateItem: async (id: number, payload: Partial<RewardItemCreatePayload>): Promise<RewardItem> => {
    const res = await apiClient.patch<RewardItem>(`/rewards/items/${id}/`, payload);
    return res.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await apiClient.delete(`/rewards/items/${id}/`);
  },

  // Distributions
  listDistributions: async (params: {
    program?: number;
    item?: number;
    employee?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  } = {}): Promise<PaginatedResponse<RewardDistribution>> => {
    const res = await apiClient.get<PaginatedResponse<RewardDistribution>>('/rewards/distributions/', { params });
    return res.data;
  },

  createDistribution: async (payload: RewardDistributionCreatePayload): Promise<RewardDistribution> => {
    const res = await apiClient.post<RewardDistribution>('/rewards/distributions/', payload);
    return res.data;
  },

  bulkDistribute: async (payload: BulkRewardDistributionPayload): Promise<BulkDistributionResponse> => {
    const res = await apiClient.post<BulkDistributionResponse>('/rewards/distributions/bulk/', payload);
    return res.data;
  },

  checkDuplicate: async (itemId: number, employeeId: number): Promise<DuplicateCheckResult> => {
    const res = await apiClient.get<DuplicateCheckResult>('/rewards/check-duplicate/', {
      params: { item_id: itemId, employee_id: employeeId },
    });
    return res.data;
  },

  // Self-Service Employee Rewards
  getMyRewards: async (): Promise<MyReward[]> => {
    const res = await apiClient.get<MyReward[]>('/rewards/my-rewards/');
    return res.data;
  },
};
