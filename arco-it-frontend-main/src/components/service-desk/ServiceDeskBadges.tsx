import React from 'react';
import { Flame, ClipboardList, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import type { ServiceDeskType } from '../../types/serviceDesk';

interface ServiceDeskTypeBadgeProps {
  type: ServiceDeskType;
  size?: 'sm' | 'md';
}

export const ServiceDeskTypeBadge: React.FC<ServiceDeskTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const isIncident = type === 'incident';
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '4px',
        padding: isSm ? '2px 8px' : '3px 10px',
        borderRadius: '12px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: isIncident ? '#FEF2F2' : '#EFF6FF',
        color: isIncident ? '#B42318' : '#175CD3',
        border: `1px solid ${isIncident ? '#FECDCA' : '#B2CCFF'}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {isIncident ? <Flame size={isSm ? 12 : 13} /> : <ClipboardList size={isSm ? 12 : 13} />}
      {isIncident ? 'Incident' : 'Service Request'}
    </span>
  );
};

export const ServiceDeskPriorityBadge: React.FC<{ priority: string; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'sm',
}) => {
  const p = (priority || 'medium').toLowerCase();
  const isSm = size === 'sm';

  let dotColor = '#98A2B3';
  let textColor = '#475467';
  let label = 'Low';

  if (p === 'critical' || p === 'urgent') {
    dotColor = '#D92D20';
    textColor = '#B42318';
    label = p === 'urgent' ? 'Urgent' : 'Critical';
  } else if (p === 'high') {
    dotColor = '#F79009';
    textColor = '#B54708';
    label = 'High';
  } else if (p === 'medium') {
    dotColor = '#2E90FA';
    textColor = '#175CD3';
    label = 'Medium';
  } else if (p === 'low') {
    dotColor = '#98A2B3';
    textColor = '#475467';
    label = 'Low';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '5px' : '6px',
        fontSize: isSm ? '11.5px' : '12.5px',
        fontWeight: 600,
        color: textColor,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: isSm ? '6px' : '7px',
          height: isSm ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
};

export const ServiceDeskStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const s = (status || 'new').toLowerCase();
  const isSm = size === 'sm';

  let bg = '#F8FAFC';
  let color = '#475467';
  let border = '#E5E9F0';
  let label = s.replace(/_/g, ' ');

  if (s === 'new') {
    bg = '#EFF6FF';
    color = '#175CD3';
    border = '#B2CCFF';
    label = 'New';
  } else if (s === 'submitted' || s === 'pending') {
    bg = '#EFF6FF';
    color = '#175CD3';
    border = '#B2CCFF';
    label = s === 'submitted' ? 'Submitted' : 'Pending';
  } else if (s === 'open') {
    bg = '#EFF6FF';
    color = '#175CD3';
    border = '#B2CCFF';
    label = 'Open';
  } else if (s === 'in_progress') {
    bg = '#FFFAEB';
    color = '#B54708';
    border = '#FEDF89';
    label = 'In Progress';
  } else if (s === 'pending_approval' || s === 'under_review') {
    bg = '#FFFAEB';
    color = '#B54708';
    border = '#FEDF89';
    label = s === 'pending_approval' ? 'Pending Approval' : 'Under Review';
  } else if (s === 'approved') {
    bg = '#ECFDF3';
    color = '#15803D';
    border = '#D1FADF';
    label = 'Approved';
  } else if (s === 'rejected') {
    bg = '#FEF2F2';
    color = '#B42318';
    border = '#FECDCA';
    label = 'Rejected';
  } else if (s === 'waiting_for_user') {
    bg = '#FFFAEB';
    color = '#B54708';
    border = '#FEDF89';
    label = 'Waiting for User';
  } else if (s === 'waiting_for_vendor') {
    bg = '#F9F5FF';
    color = '#6941C6';
    border = '#E9D7FE';
    label = 'Waiting for Vendor';
  } else if (s === 'resolved' || s === 'completed' || s === 'fulfilled') {
    bg = '#ECFDF3';
    color = '#15803D';
    border = '#D1FADF';
    label = s === 'resolved' ? 'Resolved' : s === 'fulfilled' ? 'Fulfilled' : 'Completed';
  } else if (s === 'closed') {
    bg = '#F8FAFC';
    color = '#475467';
    border = '#E5E9F0';
    label = 'Closed';
  } else if (s === 'cancelled') {
    bg = '#FEF2F2';
    color = '#B42318';
    border = '#FECDCA';
    label = 'Cancelled';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: isSm ? '2px 8px' : '3px 10px',
        borderRadius: '12px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {label}
    </span>
  );
};
