import React from 'react';
import { Lock, MessageSquare, Clock } from 'lucide-react';
import type { TicketComment, TicketHistory } from '../../types/tickets';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function historyLabel(entry: TicketHistory): string {
  switch (entry.action) {
    case 'created':            return 'Ticket created';
    case 'status_changed':     return `Status changed: ${entry.old_value} → ${entry.new_value}`;
    case 'priority_changed':   return `Priority changed: ${entry.old_value} → ${entry.new_value}`;
    case 'assigned':           return `Assigned to ${entry.new_value}`;
    case 'unassigned':         return `Unassigned`;
    case 'reassigned':         return `Reassigned to ${entry.new_value}`;
    case 'comment_added':      return 'Public comment added';
    case 'internal_note_added':return 'Internal note added';
    case 'resolved':           return 'Ticket resolved';
    case 'closed':             return 'Ticket closed';
    case 'reopened':           return 'Ticket reopened';
    case 'attachment_added':   return `Attachment added${entry.note ? ': ' + entry.note : ''}`;
    case 'field_changed':      return `${entry.field_name} changed: ${entry.old_value} → ${entry.new_value}`;
    default:                   return entry.action;
  }
}

// ── Merged timeline item ──────────────────────────────────────────────────────

type TimelineItem =
  | { kind: 'comment'; data: TicketComment; ts: number }
  | { kind: 'history'; data: TicketHistory; ts: number };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  comments: TicketComment[];
  history: TicketHistory[];
  isITStaff: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ActivityTimeline: React.FC<Props> = ({ comments, history, isITStaff }) => {
  const safeComments = Array.isArray(comments) ? comments : [];
  const safeHistory = Array.isArray(history) ? history : [];

  const items: TimelineItem[] = [
    ...safeComments
      .filter(c => isITStaff || c.comment_type === 'public')
      .map(c => ({ kind: 'comment' as const, data: c, ts: new Date(c.created_at).getTime() })),
    ...safeHistory.map(h => ({ kind: 'history' as const, data: h, ts: new Date(h.created_at).getTime() })),
  ].sort((a, b) => a.ts - b.ts);


  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#98A2B3', padding: '32px 0', fontSize: '14px' }}>
        No activity yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, idx) => {
        if (item.kind === 'history') {
          const h = item.data;
          return (
            <div
              key={`h-${h.id}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px dashed #E5E9F0',
              }}
            >
              <div
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: '#F5F7FA', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Clock size={13} color="#98A2B3" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: '#667085' }}>
                  <strong style={{ color: '#475467' }}>{h.actor_name}</strong>{' '}
                  {historyLabel(h)}
                </span>
                <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                  {formatTimeAgo(h.created_at)}
                </div>
              </div>
            </div>
          );
        }

        const c = item.data;
        const isInternal = c.comment_type === 'internal';
        return (
          <div
            key={`c-${c.id}-${idx}`}
            style={{
              backgroundColor: isInternal ? '#FFFAEB' : '#FFFFFF',
              border: `1px solid ${isInternal ? '#FEDF89' : '#E5E9F0'}`,
              borderLeft: `4px solid ${isInternal ? '#F59E0B' : '#2563EB'}`,
              borderRadius: '6px',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    backgroundColor: isInternal ? '#FEDF89' : '#DBEAFE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isInternal
                    ? <Lock size={13} color="#92400E" />
                    : <MessageSquare size={13} color="#175CD3" />
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#172033' }}>
                    {c.author_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                    {c.author_role.replace('_', ' ')}
                  </div>
                </div>
                {isInternal && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                    backgroundColor: '#FEDF89', color: '#92400E',
                    borderRadius: '4px', letterSpacing: '0.4px',
                  }}>
                    INTERNAL NOTE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#98A2B3', whiteSpace: 'nowrap' }}>
                {formatDate(c.created_at)}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#475467', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {c.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};
