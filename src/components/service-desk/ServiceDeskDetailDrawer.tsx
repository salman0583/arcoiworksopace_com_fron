import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Paperclip,
  Send,
  RotateCcw,
  Download,
  Loader2,
  Laptop,
  Layers,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
  Flame,
  ClipboardList,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  ServiceDeskTypeBadge,
  ServiceDeskPriorityBadge,
  ServiceDeskStatusBadge,
} from './ServiceDeskBadges';
import {
  ServiceDeskTrackingTimeline,
  type ServiceDeskTrackingItem,
} from './ServiceDeskTrackingTimeline';
import {
  getTicket,
  getComments as getTicketComments,
  getHistory as getTicketHistory,
  getAttachments as getTicketAttachments,
  getTechnicians,
  addComment as addTicketComment,
  assignTicket,
  changeTicketStatus,
  resolveTicket,
  closeTicket,
  uploadAttachment as uploadTicketAttachment,
  downloadAttachment as downloadTicketAttachment,
} from '../../api/tickets';
import { serviceRequestsApi } from '../../api/serviceRequests';
import type {
  TicketDetail,
  TicketComment,
  TicketHistory as TTicketHistory,
  TicketAttachment,
  Technician,
} from '../../types/tickets';
import type { ServiceRequest, ServiceRequestComment, ServiceRequestAttachment } from '../../types/serviceRequests';
import type { ServiceDeskItem, ServiceDeskType } from '../../types/serviceDesk';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';
import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/formatters';

interface ServiceDeskDetailDrawerProps {
  item: ServiceDeskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const TICKET_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'waiting_for_vendor', label: 'Waiting for Vendor' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SR_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ServiceDeskDetailDrawer: React.FC<ServiceDeskDetailDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  const isEmployee = user?.role === 'employee';
  const isITStaff = user?.role !== 'employee';
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [srDetail, setSrDetail] = useState<ServiceRequest | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Comments, history, attachments
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Actions
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');

  const [uploading, setUploading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load record details
  const loadData = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      if (isITStaff) {
        getTechnicians()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            const uniqueMap = new Map<number, Technician>();
            list.forEach((t: Technician) => {
              if (t && t.id && !uniqueMap.has(t.id)) {
                uniqueMap.set(t.id, t);
              }
            });
            setTechnicians(Array.from(uniqueMap.values()));
          })
          .catch(() => {});
      }

      if (item.type === 'incident') {
        const [ticketRes, commentsRes, historyRes, attRes] = await Promise.all([
          getTicket(item.rawId),
          getTicketComments(item.rawId),
          getTicketHistory(item.rawId),
          getTicketAttachments(item.rawId),
        ]);
        setTicketDetail(ticketRes.data);
        setComments(commentsRes.data.results ?? []);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        setAttachments(Array.isArray(attRes.data) ? attRes.data : []);
      } else {
        const [srRes, commentsRes] = await Promise.all([
          serviceRequestsApi.get(item.rawId),
          serviceRequestsApi.listComments(item.rawId),
        ]);
        setSrDetail(srRes);
        setComments(commentsRes || []);
        setAttachments(srRes.attachments || []);
        setHistory([]);
      }
    } catch (err: any) {
      setError('Unable to load request details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [item, isITStaff]);

  useEffect(() => {
    if (isOpen && item) {
      loadData();
    } else {
      setTicketDetail(null);
      setSrDetail(null);
      setComments([]);
      setHistory([]);
      setAttachments([]);
      setCommentText('');
      setActionMessage(null);
    }
  }, [isOpen, item, loadData]);

  const extractErrorMessage = (err: any, defaultMsg: string): string => {
    if (!err?.response?.data) return err?.message || defaultMsg;
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const firstVal = data[keys[0]];
      if (Array.isArray(firstVal) && firstVal.length > 0) return `${firstVal[0]}`;
      if (typeof firstVal === 'string') return `${firstVal}`;
    }
    return defaultMsg;
  };

  // Handle Assignment
  const handleAssign = async (techId: number | null) => {
    if (!item) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      if (item.type === 'incident') {
        await assignTicket(item.rawId, techId);
      } else {
        await serviceRequestsApi.assign(item.rawId, techId || 0);
      }
      setActionMessage('Assignment updated successfully.');
      loadData();
      onUpdated?.();
    } catch (err: any) {
      setActionMessage(extractErrorMessage(err, 'Failed to update assignment.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Change
  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      if (item.type === 'incident') {
        await changeTicketStatus(item.rawId, newStatus);
      } else {
        if (newStatus === 'completed') {
          await serviceRequestsApi.complete(item.rawId);
        } else if (newStatus === 'cancelled') {
          await serviceRequestsApi.cancel(item.rawId);
        } else {
          await serviceRequestsApi.updateStatus(item.rawId, newStatus);
        }
      }
      setActionMessage(`Status updated to ${newStatus.replace(/_/g, ' ')}.`);
      loadData();
      onUpdated?.();
    } catch (err: any) {
      setActionMessage(extractErrorMessage(err, 'Failed to update status.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resolve / Complete
  const handleResolve = async () => {
    if (!item) return;
    setActionLoading(true);
    try {
      if (item.type === 'incident') {
        await resolveTicket(item.rawId, resolutionSummary);
      } else {
        await serviceRequestsApi.complete(item.rawId);
      }
      setShowResolveModal(false);
      setResolutionSummary('');
      setActionMessage('Request resolved successfully.');
      loadData();
      onUpdated?.();
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || 'Failed to resolve request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Close
  const handleClose = async () => {
    if (!item) return;
    if (!window.confirm('Are you sure you want to close this request?')) return;
    setActionLoading(true);
    try {
      if (item.type === 'incident') {
        await closeTicket(item.rawId);
      } else {
        await serviceRequestsApi.cancel(item.rawId, 'Closed by user');
      }
      setActionMessage('Request closed.');
      loadData();
      onUpdated?.();
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || 'Failed to close request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      if (item.type === 'incident') {
        await addTicketComment(item.rawId, { message: commentText.trim(), comment_type: commentType });
      } else {
        await serviceRequestsApi.addComment(item.rawId, commentText.trim(), commentType);
      }
      setCommentText('');
      loadData();
    } catch (err: any) {
      setActionMessage('Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      if (item.type === 'incident') {
        await uploadTicketAttachment(item.rawId, file);
      } else {
        await serviceRequestsApi.uploadAttachment(item.rawId, file);
      }
      loadData();
      onUpdated?.();
    } catch {
      setActionMessage('Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen || !item) return null;

  const currentSubject = ticketDetail?.subject || srDetail?.subject || item.subject;
  const currentDesc = ticketDetail?.description || srDetail?.description || item.description;
  const currentStatus = ticketDetail?.status || srDetail?.status || item.status;
  const currentPriority = ticketDetail?.priority || srDetail?.priority || item.priority;
  const currentAssignedTo = ticketDetail?.assigned_to || srDetail?.assigned_to || null;
  const currentRequester = ticketDetail?.requester || srDetail?.requester || null;

  const isResolvedOrClosed = ['resolved', 'closed', 'completed', 'cancelled', 'rejected'].includes(
    currentStatus.toLowerCase()
  );

  const trackingItem: ServiceDeskTrackingItem = {
    id: Number(item.rawId),
    type: item.type,
    request_id: item.request_id,
    subject: currentSubject,
    status: currentStatus,
    priority: currentPriority,
    created_at: item.created_at,
    due_date: ticketDetail?.due_date || item.due_date || null,
    resolved_at: ticketDetail?.resolved_at || srDetail?.completed_date || null,
    closed_at: ticketDetail?.closed_at || null,
    requester_name: item.requester_name,
    requester_email: item.requester_email,
    department_name: item.department_name,
    category_name:
      ticketDetail?.category?.name ||
      srDetail?.request_type_display ||
      (srDetail?.request_type
        ? srDetail.request_type
            .split('_')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        : null) ||
      item.category_name,
    assigned_to_name: currentAssignedTo?.full_name || item.assigned_to_name,
    assigned_to_role: currentAssignedTo?.role,
    resolution_summary: ticketDetail?.resolution_summary || srDetail?.notes || null,
    business_justification: srDetail?.business_justification || null,
    linked_asset: ticketDetail?.asset
      ? { asset_tag: ticketDetail.asset.asset_tag, name: ticketDetail.asset.name }
      : srDetail?.linked_asset
      ? {
          asset_tag: srDetail.linked_asset.asset_tag,
          type_name: srDetail.linked_asset.type_name,
          model: srDetail.linked_asset.model,
        }
      : null,
    linked_software: ticketDetail?.software
      ? { name: ticketDetail.software.name }
      : srDetail?.linked_software
      ? { name: srDetail.linked_software.name }
      : null,
    vendor_support: ticketDetail?.vendor
      ? { name: ticketDetail.vendor.name, case_number: ticketDetail.vendor_case_number }
      : null,
    history: history,
    comments_count: comments.length,
    attachments_count: attachments.length,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(7, 26, 59, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 990,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── SLIDING RIGHT-SIDE DRAWER ────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        className="service-desk-drawer"
        style={{
          width: '580px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── DRAWER HEADER ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                fontWeight: 700,
                color: '#172033',
                letterSpacing: '0.3px',
              }}
            >
              {item.request_id}
            </span>
            <ServiceDeskTypeBadge type={item.type} size="sm" />
            <ServiceDeskStatusBadge status={currentStatus} size="sm" />
            <ServiceDeskPriorityBadge priority={currentPriority} size="sm" />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            style={{
              background: 'none',
              border: 'none',
              color: '#667085',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E9F0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action alert / notification message */}
        {actionMessage && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#EFF6FF',
              borderBottom: '1px solid #B2CCFF',
              color: '#175CD3',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', border: 'none', color: '#175CD3', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── SCROLLABLE DRAWER BODY ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
              <AlertCircle size={32} style={{ marginBottom: '8px' }} />
              <p>{error}</p>
              <Button size="sm" variant="secondary" onClick={loadData} style={{ marginTop: '12px' }}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* 1. Request Subject & Core Overview */}
              <div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#172033',
                    lineHeight: 1.35,
                    marginBottom: currentDesc && currentDesc.trim() ? '10px' : '0px',
                  }}
                >
                  {currentSubject}
                </h3>
                {currentDesc && currentDesc.trim() ? (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E5E9F0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '14px',
                      color: '#475467',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {currentDesc.trim()}
                  </div>
                ) : null}
              </div>

              {/* 2. Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E9F0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Category / Type
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                    {ticketDetail?.category?.name ||
                      srDetail?.request_type_display ||
                      (srDetail?.request_type
                        ? srDetail.request_type
                            .split('_')
                            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ')
                        : '') ||
                      item.category_name ||
                      'General'}
                  </div>
                  {ticketDetail?.subcategory && (
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      ↳ {ticketDetail.subcategory.name}
                    </div>
                  )}
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                    Created
                  </span>
                  <div style={{ fontSize: '13px', color: '#172033', marginTop: '2px' }}>
                    {formatDateTime(item.created_at)}
                  </div>
                </div>

                {item.due_date && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Target SLA Due Date
                    </span>
                    <div style={{ fontSize: '13px', color: item.is_overdue ? '#DC2626' : '#172033', fontWeight: item.is_overdue ? 600 : 400, marginTop: '2px' }}>
                      {formatDateTime(item.due_date)} {item.is_overdue && '(Overdue)'}
                    </div>
                  </div>
                )}

                {srDetail?.business_justification && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>
                      Business Justification
                    </span>
                    <div style={{ fontSize: '13px', color: '#475467', marginTop: '2px' }}>
                      {srDetail.business_justification}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Requester Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E9F0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.4px' }}>
                  Requester Details
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar name={item.requester_name} size="md" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>
                      {item.requester_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {item.requester_email}
                      {item.department_name && ` • ${item.department_name}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Flipkart-Style Progressive Request Lifecycle Tracking Timeline */}
              <ServiceDeskTrackingTimeline item={trackingItem} />

              {/* 5. Assignment & Staff Controls (IT Staff & Admin) */}
              {isITStaff && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E5E9F0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#172033', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Technician Assignment
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                      value={selectedTechId !== '' ? selectedTechId : currentAssignedTo?.id || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        handleAssign(val);
                      }}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: '1px solid #E5E9F0',
                        fontSize: '13px',
                        color: '#172033',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value="">Unassigned</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.role === 'it_admin' ? 'IT Admin' : t.role === 'it_support' ? 'IT Support' : t.role})
                        </option>
                      ))}
                    </select>

                    {user && currentAssignedTo?.id !== user.id && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAssign(user.id)}
                        disabled={actionLoading}
                      >
                        Assign to me
                      </Button>
                    )}
                  </div>

                  {/* Status update controls */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #E5E9F0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Update Workflow Status
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(item.type === 'incident' ? TICKET_STATUSES : SR_STATUSES)
                        .filter((s) => s.value !== currentStatus)
                        .slice(0, 4)
                        .map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => handleStatusChange(s.value)}
                            disabled={actionLoading}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #E5E9F0',
                              backgroundColor: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#475467',
                              cursor: 'pointer',
                            }}
                          >
                            Mark {s.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Resolution Details (if resolved) */}
              {ticketDetail?.resolution_summary && (
                <div
                  style={{
                    backgroundColor: '#ECFDF3',
                    border: '1px solid #D1FADF',
                    borderRadius: '8px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Resolution Summary
                  </div>
                  <div style={{ fontSize: '13px', color: '#047857', lineHeight: 1.5 }}>
                    {ticketDetail.resolution_summary}
                  </div>
                  {ticketDetail.resolved_at && (
                    <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px' }}>
                      Resolved on {formatDateTime(ticketDetail.resolved_at)}
                    </div>
                  )}
                </div>
              )}

              {/* 6. Related Assets / Software / Vendors */}
              {(ticketDetail?.asset || ticketDetail?.software || ticketDetail?.vendor || srDetail?.linked_asset || srDetail?.linked_software) && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E9F0',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.4px' }}>
                    Related Workplace Assets & Systems
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(ticketDetail?.asset || srDetail?.linked_asset) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475467' }}>
                        <Laptop size={16} color="#2563EB" />
                        <span>Asset: <strong>{ticketDetail?.asset?.name || (srDetail?.linked_asset ? `${srDetail.linked_asset.type_name} - ${srDetail.linked_asset.model}` : '')}</strong> ({ticketDetail?.asset?.asset_tag || srDetail?.linked_asset?.asset_tag})</span>
                      </div>
                    )}
                    {(ticketDetail?.software || srDetail?.linked_software) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475467' }}>
                        <Layers size={16} color="#2563EB" />
                        <span>Software: <strong>{ticketDetail?.software?.name || srDetail?.linked_software?.name}</strong></span>
                      </div>
                    )}
                    {ticketDetail?.vendor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475467' }}>
                        <Building2 size={16} color="#2563EB" />
                        <span>Vendor Support: <strong>{ticketDetail.vendor.name}</strong> {ticketDetail.vendor_case_number && `(Case: ${ticketDetail.vendor_case_number})`}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7. Attachments Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E9F0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Attachments ({attachments.length})
                  </div>
                  <label
                    style={{
                      fontSize: '12px',
                      color: '#2563EB',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Paperclip size={13} />
                    <span>{uploading ? 'Uploading...' : '+ Upload'}</span>
                    <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#98A2B3', fontStyle: 'italic' }}>
                    No attachments uploaded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {attachments.map((att: any) => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E5E9F0',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <Paperclip size={14} color="#667085" />
                          <span style={{ fontWeight: 500, color: '#172033', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {att.original_filename || att.filename || 'Attachment'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                            ({att.file_size_display || `${(att.file_size / 1024).toFixed(0)} KB`})
                          </span>
                        </div>
                        {att.file && (
                          <a
                            href={att.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{ color: '#2563EB', display: 'flex', alignItems: 'center', padding: '4px' }}
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 8. Activity & Audit History (Incidents) */}
              {history.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E9F0',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.4px' }}>
                    Activity History
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                    {history.map((h: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                        <div style={{ color: '#2563EB', paddingTop: '2px' }}>
                          <History size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#172033', fontWeight: 500 }}>
                            {h.action || 'Activity recorded'}
                          </div>
                          {h.note && <div style={{ fontSize: '12px', color: '#667085' }}>{h.note}</div>}
                          <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px' }}>
                            {h.actor_name || 'System'} • {formatRelativeTime(h.created_at || h.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. Comments & Communication Feed */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E9F0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.4px' }}>
                  Comments & Updates ({comments.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#98A2B3', fontStyle: 'italic' }}>
                      No comments posted yet.
                    </div>
                  ) : (
                    comments.map((c: any) => {
                      const isInternal = c.comment_type === 'internal';
                      return (
                        <div
                          key={c.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: isInternal ? '#FFFAEB' : '#F8FAFC',
                            border: `1px solid ${isInternal ? '#FEDF89' : '#E5E9F0'}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                                {c.author_name || c.author?.full_name || 'User'}
                              </span>
                              {isInternal && (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#B54708', backgroundColor: '#FEF3C7', padding: '1px 6px', borderRadius: '4px' }}>
                                  INTERNAL NOTE
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                              {formatRelativeTime(c.created_at)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#475467', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {c.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Comment Box */}
                {!isResolvedOrClosed && (
                  <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isITStaff && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: commentType === 'public' ? '#172033' : '#667085', fontWeight: commentType === 'public' ? 600 : 400 }}>
                          <input
                            type="radio"
                            name="comment_type"
                            value="public"
                            checked={commentType === 'public'}
                            onChange={() => setCommentType('public')}
                          />
                          Public Reply
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: commentType === 'internal' ? '#B54708' : '#667085', fontWeight: commentType === 'internal' ? 600 : 400 }}>
                          <input
                            type="radio"
                            name="comment_type"
                            value="internal"
                            checked={commentType === 'internal'}
                            onChange={() => setCommentType('internal')}
                          />
                          Internal Note (Staff only)
                        </label>
                      </div>
                    )}
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={commentType === 'internal' ? 'Add internal troubleshooting note...' : 'Type a reply to the requester...'}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E5E9F0',
                        fontSize: '13px',
                        color: '#172033',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        type="submit"
                        disabled={submittingComment || !commentText.trim()}
                        isLoading={submittingComment}
                        leftIcon={<Send size={13} />}
                      >
                        Post {commentType === 'internal' ? 'Note' : 'Reply'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── DRAWER FOOTER / PRIMARY ACTIONS ────────────────────────────────── */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E9F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>

          {isITStaff && !isResolvedOrClosed && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowResolveModal(true)}
                disabled={actionLoading}
              >
                Resolve Request
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── RESOLVE MODAL ────────────────────────────────────────────────────── */}
      {showResolveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 23, 57, 0.45)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
              Resolve Request: {item.request_id}
            </h3>
            <p style={{ fontSize: '13px', color: '#667085', marginBottom: '16px' }}>
              Please provide a brief explanation of how this request or incident was resolved.
            </p>

            <textarea
              rows={4}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="e.g. Replaced RAM module, tested and verified system stability..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                color: '#172033',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleResolve} isLoading={actionLoading}>
                Confirm Resolution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
