import React from 'react';
import type { Priority, TicketStatus } from '../../types/tickets';

// ── Shared pill style ─────────────────────────────────────────────────────────


const pill = (bg: string, color: string, border: string, text: string, hasDot = false) => (
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
      backgroundColor: bg,
      color,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
      lineHeight: 1.3,
    }}
  >
    {hasDot && (
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '5px',
        }}
      />
    )}
    {text}
  </span>
);

// ── Priority Badge ─────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { dot: string; color: string; label: string }> = {
  critical: { dot: '#D92D20', color: '#B42318', label: 'Critical' },
  high:     { dot: '#F79009', color: '#B54708', label: 'High' },
  medium:   { dot: '#2E90FA', color: '#175CD3', label: 'Medium' },
  low:      { dot: '#98A2B3', color: '#475467', label: 'Low' },
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] ?? { dot: '#98A2B3', color: '#475467', label: priority };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        fontWeight: 600,
        color: cfg.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TicketStatus, { bg: string; color: string; border: string; label: string }> = {
  new:                { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', label: 'New' },
  open:               { bg: '#EFF6FF', color: '#175CD3', border: '#B2CCFF', label: 'Open' },
  in_progress:        { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', label: 'In Progress' },
  waiting_for_user:   { bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', label: 'Waiting for User' },
  waiting_for_vendor: { bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE', label: 'Waiting for Vendor' },
  resolved:           { bg: '#ECFDF3', color: '#15803D', border: '#D1FADF', label: 'Resolved' },
  closed:             { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', label: 'Closed' },
  cancelled:          { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Cancelled' },
};

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { bg: '#F8FAFC', color: '#475467', border: '#E5E9F0', label: status };
  return pill(cfg.bg, cfg.color, cfg.border, cfg.label);
};

// ── Overdue Badge ─────────────────────────────────────────────────────────────

export const OverdueBadge: React.FC = () =>
  pill('#FEF2F2', '#B42318', '#FECDCA', 'Overdue', true);

