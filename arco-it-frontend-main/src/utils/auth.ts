// Token storage keys
const ACCESS_TOKEN_KEY = 'arco_access_token';
const REFRESH_TOKEN_KEY = 'arco_refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const roleLabels: Record<string, string> = {
  employee: 'Employee',
  hr: 'HR',
  it_support: 'IT Support',
  it_admin: 'IT Admin',
  super_admin: 'Super Admin',
};

export const canManageEmployees = (role: string) =>
  ['it_admin', 'super_admin', 'hr'].includes(role);

export const canViewAllEmployees = (role: string) =>
  ['it_support', 'it_admin', 'super_admin', 'hr'].includes(role);

export const isHROrAbove = (role: string) =>
  ['hr', 'it_admin', 'super_admin'].includes(role);

export const isAdminOrAbove = (role: string) =>
  ['it_admin', 'super_admin'].includes(role);

export const isITStaff = (role: string) =>
  ['it_support', 'it_admin', 'super_admin'].includes(role);

export const canAccessPurchasing = (role: string) =>
  ['it_admin', 'super_admin'].includes(role);

export const canAccessAuditLogs = (role: string) =>
  ['it_admin', 'super_admin'].includes(role);

export const canAccessAssetCatalog = (role: string) =>
  ['it_support', 'it_admin', 'super_admin'].includes(role);

export const canAccessSoftwareCatalog = (role: string) =>
  ['it_support', 'it_admin', 'super_admin'].includes(role);

export const canAccessVendors = (role: string) =>
  ['it_support', 'it_admin', 'super_admin'].includes(role);

export const canManageRewards = (role: string) =>
  ['hr', 'it_admin', 'super_admin'].includes(role);

export const canViewRewardsAdmin = (role: string) =>
  ['hr', 'it_admin', 'super_admin'].includes(role);

export const canAccessOfficeExpenses = (role: string) =>
  ['it_admin', 'super_admin'].includes(role);

export const canOperateOfficeExpenses = (role: string) =>
  ['it_admin', 'super_admin'].includes(role);


