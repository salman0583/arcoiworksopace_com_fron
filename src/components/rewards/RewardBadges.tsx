import React from 'react';
import type { ProgramStatus, ProgramType, RewardCategory } from '../../types/rewards';

interface StatusBadgeProps {
  status: ProgramStatus | string;
  size?: 'sm' | 'md';
}

export const ProgramStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const configs: Record<string, { bg: string; color: string; label: string; border: string }> = {
    planned: {
      bg: '#F8FAFC',
      color: '#667085',
      border: '#E5E9F0',
      label: 'Planned',
    },
    active: {
      bg: '#ECFDF3',
      color: '#15803D',
      border: '#D1FADF',
      label: 'Active',
    },
    partially_distributed: {
      bg: '#FFFAEB',
      color: '#B54708',
      border: '#FEDF89',
      label: 'Partially Distributed',
    },
    completed: {
      bg: '#ECFDF3',
      color: '#15803D',
      border: '#D1FADF',
      label: 'Completed',
    },
    cancelled: {
      bg: '#FEF2F2',
      color: '#B42318',
      border: '#FECDCA',
      label: 'Cancelled',
    },
  };

  const config = configs[status] || {
    bg: '#F8FAFC',
    color: '#667085',
    border: '#E5E9F0',
    label: status,
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: isSmall ? '2px 8px' : '3px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: '12px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.2px',
        lineHeight: 1.3,
      }}
    >
      {config.label}
    </span>
  );
};

interface TypeBadgeProps {
  type: ProgramType | string;
  size?: 'sm' | 'md';
}

export const ProgramTypeBadge: React.FC<TypeBadgeProps> = ({ type, size = 'sm' }) => {
  const labels: Record<string, string> = {
    festival: 'Festival & Holiday',
    recognition: 'Employee Recognition',
    performance: 'Performance Award',
    appreciation: 'Appreciation Day',
    company_event: 'Company Event',
    engagement: 'Employee Engagement',
    other: 'General Program',
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: isSmall ? '2px 8px' : '3px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 500,
        borderRadius: '6px',
        backgroundColor: '#F8FAFC',
        color: '#172033',
        border: '1px solid #E5E9F0',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {labels[type] || type}
    </span>
  );
};

interface CategoryBadgeProps {
  category: RewardCategory | string;
  size?: 'sm' | 'md';
}

export const RewardCategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'sm' }) => {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    physical: { bg: '#EFF6FF', color: '#175CD3', label: 'Physical Item' },
    voucher: { bg: '#FDF4FF', color: '#A21CAF', label: 'Voucher' },
    digital: { bg: '#ECFDF3', color: '#15803D', label: 'Digital Reward' },
    merchandise: { bg: '#FFFAEB', color: '#B54708', label: 'Merchandise' },
    gift: { bg: '#FFFAEB', color: '#B54708', label: 'Gourmet / Gift' },
    other: { bg: '#F8FAFC', color: '#475467', label: 'Other' },
  };

  const config = configs[category] || { bg: '#F8FAFC', color: '#667085', label: category };
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: isSmall ? '2px 8px' : '3px 9px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 500,
        borderRadius: '6px',
        backgroundColor: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {config.label}
    </span>
  );
};
