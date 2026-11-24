export type ProgramType =
  | 'festival'
  | 'recognition'
  | 'performance'
  | 'appreciation'
  | 'company_event'
  | 'engagement'
  | 'other';

export type ProgramStatus =
  | 'planned'
  | 'active'
  | 'partially_distributed'
  | 'completed'
  | 'cancelled';

export type RewardCategory =
  | 'physical'
  | 'voucher'
  | 'digital'
  | 'merchandise'
  | 'gift'
  | 'other';

export interface RewardItem {
  id: number;
  item_id: string;
  program: number;
  program_id_code?: string;
  program_name?: string;
  reward_name: string;
  category: RewardCategory;
  description?: string;
  quantity_received: number;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  procurement_reference?: string;
  procurement_request?: number | null;
  procurement_request_id?: string | null;
  available_date?: string | null;
  notes?: string;
  distributed_quantity: number;
  remaining_quantity: number;
  is_exhausted: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardItemCreatePayload {
  program: number;
  reward_name: string;
  category?: RewardCategory;
  description?: string;
  quantity_received: number;
  unit_cost?: number | string | null;
  procurement_reference?: string;
  procurement_request?: number | null;
  available_date?: string | null;
  notes?: string;
}

export interface EngagementProgramListItem {
  id: number;
  program_id: string;
  program_name: string;
  program_type: ProgramType;
  description?: string;
  program_date: string;
  status: ProgramStatus;
  budget?: number | string | null;
  notes?: string;
  total_items_count: number;
  total_quantity_received: number;
  total_quantity_distributed: number;
  total_quantity_remaining: number;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementProgramDetail extends EngagementProgramListItem {
  items: RewardItem[];
}

export interface EngagementProgramCreatePayload {
  program_name: string;
  program_type?: ProgramType;
  description?: string;
  program_date?: string;
  status?: ProgramStatus;
  budget?: number | string | null;
  notes?: string;
}

export interface RewardDistribution {
  id: number;
  distribution_id: string;
  program: number;
  program_id_code?: string;
  program_name: string;
  item: number;
  item_id_code?: string;
  item_name: string;
  item_category?: RewardCategory;
  employee: number;
  employee_id_code?: string;
  employee_name: string;
  employee_email?: string;
  employee_department?: string | null;
  quantity: number;
  distribution_date: string;
  distributed_by?: number | null;
  distributed_by_name?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RewardDistributionCreatePayload {
  item_id: number;
  employee_id: number;
  quantity?: number;
  distribution_date?: string;
  notes?: string;
  override_duplicate?: boolean;
}

export interface BulkRewardDistributionPayload {
  item_id: number;
  employee_ids: number[];
  quantity_per_employee?: number;
  distribution_date?: string;
  notes?: string;
  skip_existing?: boolean;
}

export interface BulkDistributionResponse {
  success: boolean;
  item_id: number;
  reward_name: string;
  program_name: string;
  distributed_count: number;
  total_quantity_distributed: number;
  remaining_quantity: number;
}

export interface MyReward {
  id: number;
  distribution_id: string;
  program_name: string;
  program_type: ProgramType;
  reward_name: string;
  category: RewardCategory;
  description?: string;
  quantity: number;
  distribution_date: string;
  notes?: string;
}

export interface RewardCategoryCount {
  category: RewardCategory;
  items_count: number;
  total_received: number;
}

export interface RewardStats {
  total_programs: number;
  active_programs: number;
  completed_programs: number;
  planned_programs: number;
  total_items: number;
  total_units_received: number;
  total_units_distributed: number;
  total_units_remaining: number;
  category_breakdown: RewardCategoryCount[];
}

export interface DuplicateCheckResult {
  item_id: number;
  reward_name: string;
  employee_id: number;
  employee_name: string;
  already_received: boolean;
  total_quantity_received: number;
  previous_distribution_dates: string[];
}
