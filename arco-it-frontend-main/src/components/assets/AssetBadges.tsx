import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { AssetStatus, AssetCondition, WarrantyStatus } from '../../types';

export const AssetStatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  const styles: Record<AssetStatus, { bg: string; color: string; border: string; label: string }> = {
    available: { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', label: 'Available' },
    assigned: { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', label: 'Assigned' },
    in_repair: { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', label: 'In Repair' },
    lost: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Lost' },
    damaged: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Damaged' },
    retired: { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', label: 'Retired' },
    disposed: { bg: '#F8FAFC', color: '#667085', border: '#E5E9F0', label: 'Disposed' },
  };

  const s = styles[status] || styles.available;

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
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: s.color,
          marginRight: '5px',
        }}
      />
      {s.label}
    </span>
  );
};

export const AssetConditionBadge: React.FC<{ condition: AssetCondition }> = ({ condition }) => {
  const styles: Record<AssetCondition, { bg: string; color: string; border: string; label: string }> = {
    new: { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', label: 'New' },
    good: { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', label: 'Good' },
    fair: { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', label: 'Fair' },
    damaged: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Damaged' },
  };

  const c = styles[condition] || styles.good;

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
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {c.label}
    </span>
  );
};


export const WarrantyBadge: React.FC<{ status: WarrantyStatus; endDate?: string | null }> = ({
  status,
  endDate,
}) => {
  if (status === 'active') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          flexShrink: 0,
          boxSizing: 'border-box',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#ECFDF3',
          color: '#15803D',
          border: '1px solid #D1FADF',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}
        title={endDate ? `Expires: ${endDate}` : undefined}
      >
        <ShieldCheck size={12} /> Active
      </span>
    );
  }

  if (status === 'expiring_soon') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          flexShrink: 0,
          boxSizing: 'border-box',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#FFFAEB',
          color: '#B54708',
          border: '1px solid #FEDF89',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}
        title={endDate ? `Expires: ${endDate}` : undefined}
      >
        <Clock size={12} /> Expiring Soon
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          flexShrink: 0,
          boxSizing: 'border-box',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#FEF2F2',
          color: '#B42318',
          border: '1px solid #FECDCA',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}
        title={endDate ? `Expired: ${endDate}` : undefined}
      >
        <ShieldX size={12} /> Expired
      </span>
    );
  }

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
        color: '#667085',
        border: '1px solid #E5E9F0',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      None
    </span>
  );
};

export const AssetAcknowledgementBadge: React.FC<{
  status?: string;
  isAcknowledged?: boolean;
}> = ({ status, isAcknowledged }) => {
  // Derive effective status
  let effectiveStatus = status || (isAcknowledged ? 'acknowledged' : 'pending');

  if (effectiveStatus === 'acknowledged' || isAcknowledged) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#ECFDF3',
          color: '#15803D',
          border: '1px solid #D1FADF',
          whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle2 size={12} color="#16A34A" />
        <span>Acknowledged</span>
      </span>
    );
  }

  if (effectiveStatus === 'issue_reported') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#FEF2F2',
          color: '#B42318',
          border: '1px solid #FECDCA',
          whiteSpace: 'nowrap',
        }}
      >
        <AlertTriangle size={12} color="#DC2626" />
        <span>Issue Reported</span>
      </span>
    );
  }

  if (effectiveStatus === 'returned') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 500,
          backgroundColor: '#F8FAFC',
          color: '#475467',
          border: '1px solid #E5E9F0',
          whiteSpace: 'nowrap',
        }}
      >
        <span>Returned</span>
      </span>
    );
  }

  if (effectiveStatus === 'pending') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#FFFAEB',
          color: '#B54708',
          border: '1px solid #FEDF89',
          whiteSpace: 'nowrap',
        }}
      >
        <Clock size={12} color="#D97706" />
        <span>Pending Acknowledgement</span>
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: '#F8FAFC',
        color: '#667085',
        border: '1px solid #E5E9F0',
        whiteSpace: 'nowrap',
      }}
    >
      Unassigned
    </span>
  );
};

