import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, Clock, Tag, AlertCircle,
  CheckCircle, UserCheck, Paperclip, Send, ChevronDown, RotateCcw,
  Download, Loader2, Laptop, Layers, Building2, ExternalLink,
  Lock, MessageSquare, AlertTriangle, X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import { logger } from '../../utils/logger';
import { vendorsApi } from '../../api/vendors';


import {
  getTicket, getComments, getHistory, getAttachments, getTechnicians,
  addComment, assignTicket, changeTicketStatus, resolveTicket,
  closeTicket, uploadAttachment, downloadAttachment,
} from '../../api/tickets';
import { PriorityBadge, StatusBadge, OverdueBadge } from '../../components/tickets/TicketBadges';
import { ActivityTimeline } from '../../components/tickets/ActivityTimeline';
import {
  ServiceDeskTrackingTimeline,
  type ServiceDeskTrackingItem,
} from '../../components/service-desk/ServiceDeskTrackingTimeline';
import type {
  TicketDetail as TTicketDetail,
  TicketComment, TicketHistory, TicketAttachment, TicketStatus, Technician,
} from '../../types/tickets';

import { Card, Button } from '../../components/ui';
import { formatDate, formatDateTime } from '../../utils/formatters';

const ALL_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'waiting_for_vendor', label: 'Waiting for Vendor' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Info row ──────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
    <span style={{ fontSize: '12px', color: '#98A2B3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', minWidth: '120px', paddingTop: '2px' }}>{label}</span>
    <span style={{ fontSize: '14px', color: '#475467', flex: 1 }}>{value}</span>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isITStaff = user?.role !== 'employee';
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;

  const [ticket, setTicket] = useState<TTicketDetail | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment state
  const [commentMsg, setCommentMsg] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Action state (IT only)
  const [newStatus, setNewStatus] = useState('');
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [resolutionText, setResolutionText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  // Attachment state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [downloadingAttId, setDownloadingAttId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [ticketResp, commentsResp, historyResp, attachmentsResp] = await Promise.all([
        getTicket(id),
        getComments(id),
        getHistory(id),
        getAttachments(id),
      ]);
      setTicket(ticketResp.data);
      setComments(commentsResp.data.results ?? []);
      setHistory(Array.isArray(historyResp.data) ? historyResp.data : []);
      setAttachments(Array.isArray(attachmentsResp.data) ? attachmentsResp.data : []);
      setSelectedTechId(ticketResp.data.assigned_to?.id ?? '');
    } catch {
      setError('Failed to load ticket. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isITStaff) {
      getTechnicians()
        .then(r => setTechnicians(Array.isArray(r.data) ? r.data : []))
        .catch(err => logger.error('Tickets', 'Failed to load technicians list', err));
    }
  }, [isITStaff]);

  // Vendor Support state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorModalLoading, setVendorModalLoading] = useState(false);
  const [vendorModalError, setVendorModalError] = useState<string | null>(null);
  const [availableVendors, setAvailableVendors] = useState<{ id: number; name: string }[]>([]);
  const [vendorForm, setVendorForm] = useState({
    vendor_id: '',
    vendor_case_number: '',
    vendor_notes: '',
    set_waiting_for_vendor: false,
  });

  const openVendorModal = () => {
    if (ticket) {
      setVendorForm({
        vendor_id: ticket.vendor?.id ? String(ticket.vendor.id) : '',
        vendor_case_number: ticket.vendor_case_number || '',
        vendor_notes: ticket.vendor_notes || '',
        set_waiting_for_vendor: ticket.status !== 'waiting_for_vendor',
      });
      vendorsApi.list({ page_size: 100 }).then(res => {
        setAvailableVendors(res.results.map(v => ({ id: v.id, name: v.name })));
      }).catch(() => {});
      setVendorModalError(null);
      setShowVendorModal(true);
    }
  };

  const handleSaveVendorSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setVendorModalLoading(true);
    setVendorModalError(null);
    try {
      const updated = await vendorsApi.updateTicketVendorSupport(Number(id), {
        vendor_id: vendorForm.vendor_id ? Number(vendorForm.vendor_id) : null,
        vendor_case_number: vendorForm.vendor_case_number,
        vendor_notes: vendorForm.vendor_notes,
        set_waiting_for_vendor: vendorForm.set_waiting_for_vendor,
      });
      setTicket(updated);
      setShowVendorModal(false);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update vendor support reference.';
      setVendorModalError(msg);
    } finally {
      setVendorModalLoading(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStatusChange = async () => {

    if (!newStatus || !id) return;
    setActionLoading(true); setActionMsg('');
    try {
      const resp = await changeTicketStatus(id, newStatus);
      setTicket(resp.data); setNewStatus('');
      setActionMsg('Status updated.');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionMsg(msg || 'Failed to change status.');
    } finally { setActionLoading(false); }
  };

  const handleResolve = async () => {
    if (!resolutionText.trim() || !id) return;
    setActionLoading(true); setActionMsg('');
    try {
      const resp = await resolveTicket(id, resolutionText.trim());
      setTicket(resp.data); setResolutionText(''); setShowResolveForm(false);
      setActionMsg('Ticket resolved.');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionMsg(msg || 'Failed to resolve.');
    } finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    if (!id) return;
    setActionLoading(true); setActionMsg('');
    try {
      const resp = await closeTicket(id);
      setTicket(resp.data);
      setActionMsg('Ticket closed.');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionMsg(msg || 'Failed to close ticket.');
    } finally { setActionLoading(false); }
  };

  const handleAssignTicket = async () => {
    if (!id) return;
    setActionLoading(true); setActionMsg('');
    try {
      const resp = await assignTicket(id, selectedTechId ? Number(selectedTechId) : null);
      setTicket(resp.data);
      const techObj = technicians.find(tc => tc.id === Number(selectedTechId));
      setActionMsg(selectedTechId ? `Assigned to ${techObj?.full_name || 'technician'}.` : 'Ticket unassigned.');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionMsg(msg || 'Failed to update assignment.');
    } finally { setActionLoading(false); }
  };

  const handleUnassign = async () => {
    if (!id) return;
    setActionLoading(true); setActionMsg('');
    try {
      const resp = await assignTicket(id, null);
      setTicket(resp.data);
      setSelectedTechId('');
      setActionMsg('Ticket unassigned.');
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setActionMsg(msg || 'Failed to unassign ticket.');
    } finally { setActionLoading(false); }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentMsg.trim() || !id) return;
    setSubmittingComment(true);
    try {
      await addComment(id, { message: commentMsg.trim(), comment_type: commentType });
      setCommentMsg('');
      await load();
    } catch {
      // silent — the UI will show existing comments
    } finally { setSubmittingComment(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    setUploadError('');
    try {
      await uploadAttachment(id, file);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string; file?: string[] } } })?.response?.data;
      setUploadError(msg?.detail || msg?.file?.[0] || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (a: TicketAttachment) => {
    if (!ticket) return;
    setDownloadingAttId(a.id);
    setDownloadError(null);
    try {
      await downloadAttachment(ticket.id, a.id, a.original_filename);
    } catch (err: unknown) {
      logger.error('Tickets', `Failed to download attachment ${a.id}`, err);
      setDownloadError(`Failed to download ${a.original_filename}. You may not have access.`);
    } finally {
      setDownloadingAttId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#98A2B3', fontSize: '14px' }}>
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#EF4444" style={{ marginBottom: '12px' }} />
        <div style={{ color: '#EF4444', fontWeight: 600, marginBottom: '16px' }}>{error || 'Ticket not found'}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => load()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            <RotateCcw size={14} /> Try Again
          </button>
          <button
            onClick={() => navigate('/tickets')}
            style={{ padding: '8px 16px', backgroundColor: '#F5F7FA', color: '#667085', border: '1px solid #E5E9F0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const canClose = ['resolved'].includes(ticket.status) && isITStaff;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Top back nav */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Tickets</span>
        </button>
      </div>

      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>{ticket.ticket_number}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {ticket.is_overdue && <OverdueBadge />}
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', margin: 0, lineHeight: 1.2 }}>{ticket.subject}</h1>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className={isITStaff ? 'detail-grid-2col' : undefined} style={{ display: 'grid', gridTemplateColumns: isITStaff ? undefined : '1fr', gap: '12px', alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Description */}
          <Card title="Description">
            <p style={{ margin: 0, lineHeight: 1.7, color: '#475467', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
          </Card>

          {/* Resolution (if any) */}
          {ticket.resolution_summary && (
            <Card title="Resolution Summary" icon={<CheckCircle size={14} color="#10B981" />}>
              <p style={{ margin: 0, lineHeight: 1.7, color: '#475467', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {ticket.resolution_summary}
              </p>
            </Card>
          )}

          {/* Attachments */}
          <Card title={`Attachments (${attachments.length})`} icon={<Paperclip size={14} color="#667085" />}>
            {downloadError && (
              <div style={{ color: '#EF4444', fontSize: '12px', backgroundColor: '#FEE2E2', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                {downloadError}
              </div>
            )}
            {attachments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {attachments.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E5E9F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={13} color="#667085" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>{a.original_filename}</div>
                        <div style={{ fontSize: '11px', color: '#98A2B3' }}>{a.file_size_display} · {a.uploader_name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(a)}
                      disabled={downloadingAttId === a.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#2563EB',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: downloadingAttId === a.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        padding: '4px 8px',
                      }}
                    >
                      {downloadingAttId === a.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Downloading...
                        </>
                      ) : (
                        <>
                          <Download size={12} /> Download
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#98A2B3', fontSize: '13px', margin: '0 0 16px' }}>No attachments yet.</p>
            )}
            <div>
              {uploadError && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '8px' }}>{uploadError}</div>}
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', backgroundColor: '#F5F7FA', border: '1px solid #E5E9F0',
                borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475467', fontWeight: 500,
              }}>
                <Paperclip size={13} />
                {uploading ? 'Uploading...' : 'Attach File'}
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
              <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '6px' }}>
                Max 10 MB · PDF, images, Office documents, ZIP, TXT, CSV
              </div>
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card title="Activity" icon={<Clock size={14} color="#667085" />}>
            <ActivityTimeline comments={comments} history={history} isITStaff={isITStaff} />
          </Card>

          {/* Add Comment */}
          <Card title="Add Reply" icon={<Send size={14} color="#667085" />}>
            <form onSubmit={handleAddComment}>
              {isITStaff && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['public', 'internal'] as const).map(ct => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setCommentType(ct)}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: '2px solid',
                        borderColor: commentType === ct ? (ct === 'internal' ? '#F59E0B' : '#2563EB') : '#E5E9F0',
                        backgroundColor: commentType === ct ? (ct === 'internal' ? '#FEF3C7' : '#EFF6FF') : '#fff',
                        color: commentType === ct ? (ct === 'internal' ? '#92400E' : '#175CD3') : '#667085',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {ct === 'internal' ? (
                        <>
                          <Lock size={13} />
                          <span>Internal Note</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={13} />
                          <span>Public Reply</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {commentType === 'internal' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FFFAEB', borderRadius: '6px', border: '1px solid #FEDF89', marginBottom: '12px', fontSize: '12px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={13} />
                  <span>This note is only visible to IT staff. The requester will not see it.</span>
                </div>
              )}
              <textarea
                value={commentMsg}
                onChange={e => setCommentMsg(e.target.value)}
                placeholder={commentType === 'internal' ? 'Add an internal note for IT team only...' : 'Write a reply visible to the requester...'}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={!commentMsg.trim() || submittingComment}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 20px', backgroundColor: (!commentMsg.trim() || submittingComment) ? '#98A2B3' : '#2563EB',
                    color: '#fff', border: 'none', borderRadius: '6px',
                    cursor: (!commentMsg.trim() || submittingComment) ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600,
                  }}
                >
                  <Send size={13} />
                  {submittingComment ? 'Sending...' : (commentType === 'internal' ? 'Add Internal Note' : 'Send Reply')}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right column — Details & IT Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Flipkart-Style Lifecycle Tracking Timeline */}
          <ServiceDeskTrackingTimeline
            item={{
              id: ticket.id,
              type: 'incident',
              request_id: ticket.ticket_number,
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
              created_at: ticket.created_at,
              due_date: ticket.due_date,
              resolved_at: ticket.resolved_at,
              closed_at: ticket.closed_at,
              requester_name: ticket.requester.full_name,
              requester_email: ticket.requester.email,
              department_name: ticket.department_name,
              category_name: ticket.category?.name,
              assigned_to_name: ticket.assigned_to?.full_name,
              assigned_to_role: ticket.assigned_to?.role,
              resolution_summary: ticket.resolution_summary,
              linked_asset: ticket.asset
                ? { asset_tag: ticket.asset.asset_tag, name: ticket.asset.name }
                : null,
              linked_software: ticket.software
                ? { name: ticket.software.name }
                : null,
              vendor_support: ticket.vendor
                ? { name: ticket.vendor.name, case_number: ticket.vendor_case_number }
                : null,
              comments_count: comments.length,
              attachments_count: attachments.length,
            }}
          />

          {/* Quick info / Meta */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E9F0', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' }}>Ticket Details</div>
            <InfoRow label="Requester" value={`${ticket.requester.full_name} (${ticket.requester.email})`} />
            <InfoRow label="Department" value={ticket.department_name || '—'} />
            <InfoRow label="Category" value={ticket.category?.name || '—'} />
            {ticket.subcategory && <InfoRow label="Subcategory" value={ticket.subcategory.name} />}
            <InfoRow
              label="Assigned To"
              value={
                ticket.assigned_to ? (
                  <span style={{ fontWeight: 600, color: '#172033' }}>{ticket.assigned_to.full_name}</span>
                ) : (
                  <span style={{ color: '#EA580C', fontWeight: 600 }}>Unassigned</span>
                )
              }
            />
            <InfoRow label="Created" value={formatDateTime(ticket.created_at)} />
            <InfoRow
              label="SLA Due"
              value={
                ticket.due_date ? (
                  <span style={{ color: ticket.is_overdue ? '#EF4444' : '#475467', fontWeight: ticket.is_overdue ? 600 : 400 }}>
                    {formatDateTime(ticket.due_date)} {ticket.is_overdue && '(Overdue)'}
                  </span>
                ) : '—'
              }
            />
            {ticket.resolved_at && <InfoRow label="Resolved" value={formatDateTime(ticket.resolved_at)} />}
            {ticket.closed_at && <InfoRow label="Closed" value={formatDateTime(ticket.closed_at)} />}
          </div>

          {/* Associated Asset Card */}
          {ticket.asset && (
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E9F0', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Laptop size={14} color="#2563EB" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Associated Asset
                  </span>
                </div>
                {isITStaff && (
                  <button
                    onClick={() => navigate(`/assets/${ticket.asset?.id}`)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    View Asset →
                  </button>
                )}
              </div>
              <InfoRow label="Asset Tag" value={<strong style={{ color: '#175CD3' }}>{ticket.asset.asset_tag}</strong>} />
              <InfoRow label="Device" value={`${ticket.asset.manufacturer} ${ticket.asset.model}`} />
              {ticket.asset.serial_number && <InfoRow label="Serial" value={<span style={{ fontFamily: 'monospace' }}>{ticket.asset.serial_number}</span>} />}
              <InfoRow label="Type" value={ticket.asset.asset_type_name || '—'} />
              <InfoRow label="Status" value={<span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{ticket.asset.status}</span>} />
            </div>
          )}

          {ticket.software && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E9F0', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="#2563EB" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Linked Software
                  </span>
                </div>
                {isITStaff && (
                  <button
                    onClick={() => navigate(`/software/${ticket.software?.id}`)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    View Software →
                  </button>
                )}
              </div>
              <InfoRow label="Software" value={<strong style={{ color: '#175CD3' }}>{ticket.software.name}</strong>} />
              <InfoRow label="ID" value={<span style={{ fontFamily: 'monospace' }}>{ticket.software.software_id}</span>} />
              {ticket.software.version && <InfoRow label="Version" value={ticket.software.version} />}
              <InfoRow label="Publisher" value={ticket.software.publisher} />
              <InfoRow label="Status" value={<span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{ticket.software.status}</span>} />
            </div>
          )}

          {/* External Vendor Support Reference Card */}
          {isITStaff && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E9F0', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} color="#2563EB" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    External Vendor Support
                  </span>
                </div>
                <button
                  onClick={openVendorModal}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {ticket.vendor ? 'Update Ref →' : 'Link Vendor'}
                </button>
              </div>

              {ticket.vendor ? (
                <>
                  <InfoRow
                    label="Vendor Partner"
                    value={
                      <button
                        onClick={() => navigate(`/vendors/${ticket.vendor?.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#2563EB',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'underline',
                        }}
                      >
                        {ticket.vendor.name}
                        <ExternalLink size={12} />
                      </button>
                    }
                  />
                  {ticket.vendor_case_number && (
                    <InfoRow
                      label="Vendor Case #"
                      value={<strong style={{ fontFamily: 'monospace', color: '#B54708' }}>{ticket.vendor_case_number}</strong>}
                    />
                  )}
                  {ticket.vendor.support_phone && (
                    <InfoRow label="Support Phone" value={ticket.vendor.support_phone} />
                  )}
                  {ticket.vendor.support_email && (
                    <InfoRow label="Support Email" value={ticket.vendor.support_email} />
                  )}
                  {ticket.vendor_notes && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
                      <strong>Vendor Notes:</strong> {ticket.vendor_notes}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#98A2B3', textAlign: 'center', padding: '8px 0' }}>
                  No external vendor support ticket linked.
                </div>
              )}
            </div>
          )}

          {/* IT Staff Actions Panel */}
          {isITStaff && (


            <Card title="IT Actions" icon={<UserCheck size={14} color="#667085" />}>
              {actionMsg && (
                <div style={{ padding: '8px 12px', backgroundColor: actionMsg.includes('Failed') ? '#FEE2E2' : '#F0FDF4', borderRadius: '6px', color: actionMsg.includes('Failed') ? '#B42318' : '#166534', fontSize: '13px', marginBottom: '14px' }}>
                  {actionMsg}
                </div>
              )}

              {/* Assignment (IT Admin & Super Admin only) */}
              {isITAdmin ? (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                    Assign / Dispatch Technician
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={selectedTechId}
                      onChange={e => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', color: '#475467', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Unassigned --</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.full_name} ({tech.role.replace('_', ' ').toUpperCase()}) — {tech.open_tickets_count} open
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleAssignTicket}
                        disabled={actionLoading}
                        style={{ flex: 2, padding: '8px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        {ticket.assigned_to ? 'Reassign' : 'Assign Ticket'}
                      </button>
                      {ticket.assigned_to && (
                        <button
                          onClick={handleUnassign}
                          disabled={actionLoading}
                          style={{ flex: 1, padding: '8px', backgroundColor: '#FEF2F2', color: '#B42318', border: '1px solid #FECDCA', borderRadius: '6px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '16px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E5E9F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase', marginBottom: '2px' }}>Assigned Technician</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                    {ticket.assigned_to ? ticket.assigned_to.full_name : 'Unassigned (Awaiting IT Admin Dispatch)'}
                  </div>
                </div>
              )}

              {/* Status change */}
              <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                  Change Status
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', color: '#475467', appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— Select status —</option>
                    {ALL_STATUSES.filter(s => s.value !== ticket.status).map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusChange}
                    disabled={!newStatus || actionLoading}
                    style={{ padding: '8px 14px', backgroundColor: !newStatus ? '#E5E9F0' : '#2563EB', color: !newStatus ? '#98A2B3' : '#fff', border: 'none', borderRadius: '6px', cursor: !newStatus || actionLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    <ChevronDown size={13} style={{ verticalAlign: 'middle' }} /> Apply
                  </button>
                </div>
              </div>

              {/* Resolve */}
              {!['resolved', 'closed', 'cancelled'].includes(ticket.status) && (
                <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                    Resolve Ticket
                  </div>
                  {!showResolveForm ? (
                    <button
                      onClick={() => setShowResolveForm(true)}
                      style={{ width: '100%', padding: '9px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #D1FADF', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                      <CheckCircle size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Mark as Resolved
                    </button>
                  ) : (
                    <div>
                      <textarea
                        value={resolutionText}
                        onChange={e => setResolutionText(e.target.value)}
                        placeholder="Describe how this issue was resolved..."
                        rows={4}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', marginBottom: '8px', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setShowResolveForm(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#F5F7FA', border: '1px solid #E5E9F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#667085' }}>
                          Cancel
                        </button>
                        <button onClick={handleResolve} disabled={!resolutionText.trim() || actionLoading} style={{ flex: 2, padding: '8px', backgroundColor: !resolutionText.trim() ? '#E5E9F0' : '#10B981', color: !resolutionText.trim() ? '#98A2B3' : '#fff', border: 'none', borderRadius: '6px', cursor: !resolutionText.trim() || actionLoading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          Confirm Resolve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close */}
              {canClose && (
                <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                    Close Ticket
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={actionLoading}
                    style={{ width: '100%', padding: '9px', backgroundColor: '#F5F7FA', color: '#475569', border: '1px solid #E5E9F0', borderRadius: '6px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    Close Ticket
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Vendor Support Reference Modal */}
      {showVendorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowVendorModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    External Vendor Support Reference
                  </h2>
                  <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                    {ticket.ticket_number} — Associate vendor dispatch / case details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveVendorSupport} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {vendorModalError && (
                <div style={{ padding: '10px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: '6px', color: '#B42318', fontSize: '13px' }}>
                  {vendorModalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  External Vendor Partner
                </label>
                <select
                  value={vendorForm.vendor_id}
                  onChange={e => setVendorForm(f => ({ ...f, vendor_id: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    color: '#172033',
                  }}
                >
                  <option value="">-- No Vendor Linked --</option>
                  {availableVendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Vendor Case / Ticket / RMA #
                </label>
                <input
                  type="text"
                  placeholder="e.g. DELL-SR-884920, HP-INC-9910"
                  value={vendorForm.vendor_case_number}
                  onChange={e => setVendorForm(f => ({ ...f, vendor_case_number: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Vendor Support Notes & Dispatch Schedule
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Dispatched replacement motherboard with on-site technician scheduled for Thursday morning."
                  value={vendorForm.vendor_notes}
                  onChange={e => setVendorForm(f => ({ ...f, vendor_notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {ticket.status !== 'waiting_for_vendor' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#FFFAEB', borderRadius: '6px', border: '1px solid #FEDF89' }}>
                  <input
                    type="checkbox"
                    id="set_waiting_for_vendor"
                    checked={vendorForm.set_waiting_for_vendor}
                    onChange={e => setVendorForm(f => ({ ...f, set_waiting_for_vendor: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="set_waiting_for_vendor" style={{ fontSize: '12px', color: '#92400E', cursor: 'pointer', fontWeight: 500 }}>
                    Automatically set ticket status to "Waiting for Vendor"
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E5E9F0' }}>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  disabled={vendorModalLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#667085',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vendorModalLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#fff',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {vendorModalLoading ? 'Saving...' : 'Save Reference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

