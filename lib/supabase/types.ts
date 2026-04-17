export type UserRole = 'consumer' | 'merchant' | 'ngo_admin' | 'platform_admin';

export type ReceiptStatus = 'pending' | 'approved' | 'rejected' | 'suspicious';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Merchant {
  id: string;
  profile_id: string | null;
  business_name: string;
  document: string | null;
  business_type: string;
  neighborhood: string;
  city: string;
  cashback_rate: number;
  status: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  consumer_id: string;
  merchant_id: string | null;
  image_url: string;
  image_hash: string;
  extracted_cnpj: string | null;
  extracted_merchant_name: string | null;
  extracted_amount: number | null;
  extracted_date: string | null;
  confidence_score: number | null;
  status: ReceiptStatus;
  rejection_reason: string | null;
  credits_generated: number;
  vision_raw: unknown;
  created_at: string;
}

export interface CreditWallet {
  id: string;
  consumer_id: string;
  total_earned: number;
  total_allocated: number;
  balance: number;
  total_seeds_earned: number;
  seeds_allocated: number;
  updated_at: string;
}

export interface Project {
  id: string;
  ngo_admin_id: string;
  title: string;
  description: string;
  category: 'saude' | 'educacao' | 'alimentacao' | 'cultura' | 'meio_ambiente' | string;
  image_url: string | null;
  cover_image_url: string | null;
  goal_amount: number;
  current_amount: number;
  goal_seeds?: number;
  current_seeds?: number;
  beneficiaries_count: number;
  neighborhood: string | null;
  status: string;
  story: string | null;
  impact_unit: string | null;
  impact_per_seed: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export interface Allocation {
  id: string;
  consumer_id: string;
  project_id: string;
  receipt_id: string | null;
  amount: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  condition_type: 'receipt_count' | 'total_amount' | 'streak_days' | 'projects_supported' | 'all_projects';
  condition_value: number;
}

export interface UserAchievement {
  id: string;
  consumer_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Invoice {
  id: string;
  merchant_id: string;
  period_start: string;
  period_end: string;
  total_scanned_amount: number;
  cashback_rate: number;
  invoice_amount: number;
  status: 'pending' | 'paid' | 'overdue' | string;
  paid_at: string | null;
  created_at: string;
}
