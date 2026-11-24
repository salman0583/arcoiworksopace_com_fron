import React from 'react';
import type { VendorType, VendorStatus, ContractType, ContractStatus } from '../../types/vendors';

export const VendorTypeBadge: React.FC<{ type: VendorType | string }> = ({ type }) => {
  const typeMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
    hardware_supplier: { label: 'Hardware Supplier', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    software_vendor: { label: 'Software Vendor', bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE' },
    internet_network: { label: 'Internet / ISP', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    it_support: { label: 'IT Support Partner', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    printer_amc: { label: 'Printer / AMC', bg: '#FFFAEB', color: '#B54708', border: '#FEDF89' },
    telecom: { label: 'Telecom Provider', bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
    cloud_hosting: { label: 'Cloud / Hosting', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    security: { label: 'Security Provider', bg: '#FEF2F2', color: '#B42318', border: '#FECDCA' },
    office_tech: { label: 'Office Tech', bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' },
    other: { label: 'Other', bg: '#F8FAFC', color: '#667085', border: '#E5E9F0' },
  };

  const config = typeMap[type] || { label: type, bg: '#F8FAFC', color: '#667085', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {config.label}
    </span>
  );
};

export const VendorStatusBadge: React.FC<{ status: VendorStatus | string }> = ({ status }) => {
  const statusMap: Record<string, { label: string; bg: string; color: string; dot: string; border: string }> = {
    active: { label: 'Active', bg: '#ECFDF3', color: '#15803D', dot: '#16A34A', border: '#D1FADF' },
    inactive: { label: 'Inactive', bg: '#F8FAFC', color: '#667085', dot: '#98A2B3', border: '#E5E9F0' },
    on_hold: { label: 'On Hold', bg: '#FFFAEB', color: '#B54708', dot: '#D97706', border: '#FEDF89' },
    blocked: { label: 'Blocked', bg: '#FEF2F2', color: '#B42318', dot: '#DC2626', border: '#FECDCA' },
  };

  const config = statusMap[status] || { label: status, bg: '#F8FAFC', color: '#475467', dot: '#98A2B3', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.dot }} />
      {config.label}
    </span>
  );
};

export const ContractTypeBadge: React.FC<{ type: ContractType | string }> = ({ type }) => {
  const typeMap: Record<string, string> = {
    amc: 'Annual Maintenance (AMC)',
    support: 'Support Agreement',
    software_sub: 'Software Subscription',
    internet: 'Internet / Telecom',
    hardware_maint: 'Hardware Maintenance',
    cloud: 'Cloud / Hosting',
    other: 'Service Agreement',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: '#F8FAFC',
        color: '#172033',
        border: '1px solid #E5E9F0',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {typeMap[type] || type}
    </span>
  );
};

export const ContractStatusBadge: React.FC<{ status: ContractStatus | string; daysRemaining?: number }> = ({
  status,
  daysRemaining,
}) => {
  const statusMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
    active: { label: 'Active', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    expiring_soon: {
      label: daysRemaining !== undefined && daysRemaining >= 0 ? `Expiring Soon (${daysRemaining}d)` : 'Expiring Soon',
      bg: '#FFFAEB',
      color: '#B54708',
      border: '#FEDF89',
    },
    expired: { label: 'Expired', bg: '#FEF2F2', color: '#B42318', border: '#FECDCA' },
    terminated: { label: 'Terminated', bg: '#F8FAFC', color: '#667085', border: '#E5E9F0' },
    draft: { label: 'Draft', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
  };

  const config = statusMap[status] || { label: status, bg: '#F8FAFC', color: '#667085', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {config.label}
    </span>
  );
};

