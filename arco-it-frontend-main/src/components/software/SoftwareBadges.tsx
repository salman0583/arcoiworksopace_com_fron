import React from 'react';
import type { SoftwareStatus, SoftwareCategory, LicenseType, AllocationScope } from '../../types';

export const SoftwareStatusBadge: React.FC<{ status: SoftwareStatus }> = ({ status }) => {
  const config: Record<SoftwareStatus, { label: string; bg: string; text: string; border: string }> = {
    active: { label: 'Active', bg: '#ECFDF3', text: '#15803D', border: '#D1FADF' },
    expiring_soon: { label: 'Expiring Soon', bg: '#FFFAEB', text: '#B54708', border: '#FEDF89' },
    expired: { label: 'Expired', bg: '#FEF2F2', text: '#B42318', border: '#FECDCA' },
    suspended: { label: 'Suspended', bg: '#F8FAFC', text: '#475467', border: '#E5E9F0' },
    retired: { label: 'Retired', bg: '#F8FAFC', text: '#667085', border: '#E5E9F0' },
  };

  const item = config[status] || config.active;

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
        backgroundColor: item.bg,
        color: item.text,
        border: `1px solid ${item.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: item.text,
          marginRight: '6px',
        }}
      />
      {item.label}
    </span>
  );
};

export const AllocationScopeBadge: React.FC<{ scope?: AllocationScope | string }> = ({ scope }) => {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    company_wide: { label: 'Company-Wide', bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
    user_specific: { label: 'User-Specific', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    infrastructure: { label: 'Infrastructure', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    device_specific: { label: 'Device-Specific', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  };

  const item = (scope && config[scope]) ? config[scope] : config.user_specific;

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
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: item.bg,
        color: item.text,
        border: `1px solid ${item.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {item.label}
    </span>
  );
};

export const SoftwareCategoryBadge: React.FC<{ category: SoftwareCategory | string }> = ({ category }) => {
  const labels: Record<string, string> = {
    operating_system: 'Operating System',
    productivity: 'Productivity',
    security: 'Security',
    development: 'Development',
    communication: 'Communication',
    design: 'Design',
    database: 'Database',
    vpn_remote: 'VPN / Remote Access',
    hosting_infrastructure: 'Hosting / Infrastructure',
    other: 'Other',
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
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: category === 'hosting_infrastructure' ? '#F0FDF4' : '#F8FAFC',
        color: category === 'hosting_infrastructure' ? '#166534' : '#172033',
        border: category === 'hosting_infrastructure' ? '1px solid #BBF7D0' : '1px solid #E5E9F0',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {labels[category] || category}
    </span>
  );
};

export const LicenseTypeBadge: React.FC<{ type: LicenseType }> = ({ type }) => {
  const labels: Record<LicenseType, string> = {
    subscription: 'Subscription',
    per_user: 'Per User',
    per_device: 'Per Device',
    perpetual: 'Perpetual',
    trial: 'Trial',
    open_source: 'Free / Open Source',
    other: 'Other',
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
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: '#EFF6FF',
        color: '#175CD3',
        border: '1px solid #B2CCFF',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {labels[type] || type}
    </span>
  );
};

export const LicenseUtilizationBar: React.FC<{
  used: number;
  total: number;
  showText?: boolean;
  showNumbers?: boolean;
}> = ({
  used,
  total,
  showText = true,
  showNumbers,
}) => {
  const displayNumbers = showNumbers !== undefined ? showNumbers : showText;
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = percent >= 90 ? '#DC2626' : percent >= 75 ? '#D97706' : '#16A34A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E9F0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      {displayNumbers && (
        <span style={{ fontSize: '11px', color: '#667085' }}>
          {used} / {total} ({percent}%)
        </span>
      )}
    </div>
  );
};
