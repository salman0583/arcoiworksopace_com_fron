import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Ticket as TicketIcon, RotateCcw } from 'lucide-react';
import { getTickets } from '../../api/tickets';
import { PriorityBadge, StatusBadge } from '../../components/tickets/TicketBadges';
import type { TicketListItem } from '../../types/tickets';
import { logger } from '../../utils/logger';

import { Button, PageHeader } from '../../components/ui';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export const MyTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await getTickets({ page_size: 100 });
      const rawResults = resp.data?.results;
      const results = Array.isArray(rawResults) ? rawResults : (Array.isArray(resp.data) ? resp.data : []);
      setTickets(results);
    } catch (err: unknown) {
      logger.error('Tickets', 'Failed to load tickets in MyTickets', err);
      setError('Failed to load tickets. Please check your connection or try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <PageHeader
        title="My Tickets"
        description="Your IT support requests and ticket lifecycle updates"
      />

      {/* Content */}
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E9F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#98A2B3' }}>
            Loading your tickets...
          </div>
        ) : error ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#FEE2E2' }}>
            <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>
              {error}
            </div>
            <button
              onClick={() => load()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', backgroundColor: '#2563EB', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        ) : safeTickets.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TicketIcon size={28} color="#2563EB" />
              </div>
            </div>
            <div style={{ fontWeight: 600, color: '#475467', marginBottom: '8px', fontSize: '16px' }}>No tickets yet</div>
            <div style={{ color: '#667085', fontSize: '14px' }}>
              You have no active or historical IT support tickets.
            </div>
          </div>
        ) : (
          <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="My Tickets Table">
            <table style={{ width: '100%', minWidth: '870px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, backgroundColor: '#F8FAFC', width: '130px', minWidth: '130px', maxWidth: '130px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                    Ticket #
                  </th>
                  <th style={{ position: 'sticky', top: 0, left: '130px', zIndex: 20, backgroundColor: '#F8FAFC', width: '280px', minWidth: '280px', maxWidth: '280px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                    Subject
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '130px', minWidth: '130px', maxWidth: '130px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                    Status
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                    Priority
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                    Created
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E9F0' }}>
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {safeTickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    style={{ backgroundColor: '#FFFFFF', cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '130px', minWidth: '130px', maxWidth: '130px', padding: '10px 14px', fontWeight: 600, color: '#2563EB', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontFamily: 'monospace' }}>
                      {t.ticket_number}
                    </td>
                    <td style={{ position: 'sticky', left: '130px', zIndex: 4, backgroundColor: 'inherit', width: '280px', minWidth: '280px', maxWidth: '280px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 500, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={t.subject}>
                        {t.subject}
                      </div>
                      {t.category_name && (
                        <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }} className="cell-truncate-1">{t.category_name}</div>
                      )}
                    </td>
                    <td style={{ width: '130px', minWidth: '130px', maxWidth: '130px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}><StatusBadge status={t.status} /></td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', color: '#667085', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontSize: '12px' }}>{formatDate(t.created_at)}</td>
                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px', padding: '10px 14px', color: '#667085', whiteSpace: 'nowrap', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', fontSize: '12px' }}>{formatDate(t.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
