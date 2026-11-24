export type VendorType =
  | 'hardware_supplier'
  | 'software_vendor'
  | 'internet_network'
  | 'it_support'
  | 'printer_amc'
  | 'telecom'
  | 'cloud_hosting'
  | 'security'
  | 'office_tech'
  | 'other';

export type VendorStatus = 'active' | 'inactive' | 'on_hold' | 'blocked';

export type ContactType = 'primary' | 'sales' | 'support' | 'billing' | 'technical' | 'other';

export type ContractType =
  | 'amc'
  | 'support'
  | 'software_sub'
  | 'internet'
  | 'hardware_maint'
  | 'cloud'
  | 'other';

export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'terminated' | 'draft';

export interface VendorContact {
  id: number;
  vendor: number;
  name: string;
  role_title: string;
  email: string;
  phone: string;
  contact_type: ContactType;
  is_primary: boolean;
  notes: string;
  created_at: string;
}

export interface Contract {
  id: number;
  contract_id: string;
  name: string;
  vendor: number;
  vendor_name: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string;
  renewal_date: string | null;
  contract_value: string | number | null;
  currency: string;
  status: ContractStatus;
  computed_status: ContractStatus;
  days_remaining: number;
  support_notes: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface VendorHistoryEntry {
  id: number;
  action: string;
  actor_name: string;
  details: string;
  timestamp: string;
}

export interface SuppliedAssetItem {
  id: number;
  asset_tag: string;
  name: string;
  asset_type_name: string;
  model: string;
  serial_number: string;
  status: string;
  condition: string;
  warranty_status: string;
  warranty_end_date: string | null;
}

export interface SoftwareLicenseItem {
  id: number;
  software_id: string;
  name: string;
  publisher: string;
  version: string;
  category: string;
  license_type: string;
  status: string;
  total_licenses: number;
  used_licenses: number;
  license_expiry_date: string | null;
}

export interface VendorListItem {
  id: number;
  vendor_id: string;
  name: string;
  vendor_type: VendorType;
  status: VendorStatus;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  support_email: string;
  support_phone: string;
  website: string;
  city: string;
  country: string;
  active_contracts_count: number;
  assets_count: number;
  software_count: number;
  created_at: string;
}

export interface VendorDetail {
  id: number;
  vendor_id: string;
  name: string;
  vendor_type: VendorType;
  status: VendorStatus;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  alternate_contact: string;
  support_email: string;
  support_phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
  contacts: VendorContact[];
  contracts: Contract[];
  history: VendorHistoryEntry[];
  supplied_assets: SuppliedAssetItem[];
  software_licenses: SoftwareLicenseItem[];
  active_contracts_count: number;
  assets_count: number;
  software_count: number;
}

export interface VendorStats {
  total_vendors: number;
  active_vendors: number;
  active_contracts: number;
  expiring_soon_contracts: number;
  expired_contracts: number;
}

export type Vendor = VendorListItem;

