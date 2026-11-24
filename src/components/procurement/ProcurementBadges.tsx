import React from 'react';
import type { ProcurementStatus, RequestType, ProcurementPriority, ReceivingCondition } from '../../types/procurement';

interface BadgeProps {
  size?: 'sm' | 'md';
}

export const ProcurementStatusBadge: React.FC<{ status: ProcurementStatus } & BadgeProps> = ({ status, size = 'sm' }) => {
  const configs: Record<ProcurementStatus, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: 'Draft', bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' },
    submitted: { label: 'Submitted', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    under_review: { label: 'Under Review', bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE' },
    quotations_received: { label: 'Quotations Received', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    pending_approval: { label: 'Pending Approval', bg: '#FFFAEB', color: '#B54708', border: '#FEDF89' },
    approved: { label: 'Approved', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    rejected: { label: 'Rejected', bg: '#FEF2F2', color: '#B42318', border: '#FECDCA' },
    ordered: { label: 'Order Placed', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    partially_received: { label: 'Partially Received', bg: '#FFFAEB', color: '#B54708', border: '#FEDF89' },
    received: { label: 'Received', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    completed: { label: 'Completed', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    cancelled: { label: 'Cancelled', bg: '#F8FAFC', color: '#667085', border: '#E5E9F0' },
  };

  const c = configs[status] || { label: status, bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        whiteSpace: 'nowrap',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '12px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        lineHeight: 1.2,
      }}
    >
      {c.label}
    </span>
  );
};

export const RequestTypeBadge: React.FC<{ type: RequestType } & BadgeProps> = ({ type, size = 'sm' }) => {
  const configs: Record<RequestType, { label: string; bg: string; color: string; border: string }> = {
    hardware: { label: 'Hardware', bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF' },
    software: { label: 'Software', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    license: { label: 'License / Subs', bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE' },
    it_service: { label: 'IT Service', bg: '#FFFAEB', color: '#B54708', border: '#FEDF89' },
    network: { label: 'Network', bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
    accessories: { label: 'Accessories', bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' },
    office_supplies: { label: 'Office Supplies', bg: '#FEF6EE', color: '#B93815', border: '#F9DBAF' },
    other: { label: 'Other', bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' },
  };

  const c = configs[type] || { label: type, bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        whiteSpace: 'nowrap',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '12px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        lineHeight: 1.2,
      }}
    >
      {c.label}
    </span>
  );
};

export const ProcurementPriorityBadge: React.FC<{ priority: ProcurementPriority } & BadgeProps> = ({ priority, size = 'sm' }) => {
  const configs: Record<ProcurementPriority, { label: string; dot: string; color: string }> = {
    urgent: { label: 'Urgent', dot: '#D92D20', color: '#B42318' },
    high: { label: 'High', dot: '#F79009', color: '#B54708' },
    medium: { label: 'Medium', dot: '#2E90FA', color: '#175CD3' },
    low: { label: 'Low', dot: '#98A2B3', color: '#475467' },
  };

  const c = configs[priority] || { label: priority, dot: '#98A2B3', color: '#475467' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '5px' : '6px',
        fontSize: size === 'sm' ? '11.5px' : '12.5px',
        fontWeight: 600,
        color: c.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: size === 'sm' ? '6px' : '7px',
          height: size === 'sm' ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: c.dot,
          flexShrink: 0,
        }}
      />
      {c.label}
    </span>
  );
};

export const ReceivingConditionBadge: React.FC<{ condition: ReceivingCondition } & BadgeProps> = ({ condition, size = 'sm' }) => {
  const configs: Record<ReceivingCondition, { label: string; bg: string; color: string; border: string }> = {
    good: { label: 'Good Condition', bg: '#ECFDF3', color: '#15803D', border: '#D1FADF' },
    damaged: { label: 'Damaged', bg: '#FEF2F2', color: '#B42318', border: '#FECDCA' },
    acceptable: { label: 'Minor Blemish', bg: '#FFFAEB', color: '#B54708', border: '#FEDF89' },
  };

  const c = configs[condition] || { label: condition, bg: '#F8FAFC', color: '#475467', border: '#E5E9F0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        whiteSpace: 'nowrap',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '12px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        lineHeight: 1.2,
      }}
    >
      {c.label}
    </span>
  );
};
