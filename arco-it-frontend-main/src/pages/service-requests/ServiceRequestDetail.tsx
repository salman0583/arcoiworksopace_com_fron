import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserPlus,
  Clock,
  Play,
  HelpCircle,
  CheckCheck,
  AlertTriangle,
  Upload,
  Link2,
  ExternalLink,
  Lock,
  MessageSquare,
  FileText,
  Building,
  Calendar,
  Layers,
  Laptop,
  Ticket,
  ShoppingCart,
  Send,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDate, formatDateTime } from '../../utils/formatters';

import { serviceRequestsApi } from '../../api/serviceRequests';
import { getTechnicians, getTickets } from '../../api/tickets';
import { assetsApi } from '../../api/assets';
import { softwareApi } from '../../api/software';
import { procurementApi } from '../../api/procurement';
import { ServiceRequest, ServiceRequestComment } from '../../types/serviceRequests';
import {
  ServiceDeskTrackingTimeline,
  type ServiceDeskTrackingItem,
} from '../../components/service-desk/ServiceDeskTrackingTimeline';

import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';

export const ServiceRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isITAdmin = user ? isAdminOrAbove(user.role) : false;
  const isITStaff = user?.role === 'it_support' || isITAdmin;
  const isEmployee = user?.role === 'employee';

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [comments, setComments] = useState<ServiceRequestComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Modals state
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [technicians, setTechnicians] = useState<Array<{ id: number; full_name: string; email: string }>>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [respondMessage, setRespondMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkType, setLinkType] = useState<'ticket' | 'asset' | 'software' | 'procurement'>('ticket');
  const [availableItems, setAvailableItems] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [isLinking, setIsLinking] = useState(false);

  // File upload
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, commentsData] = await Promise.all([
        serviceRequestsApi.get(id),
        serviceRequestsApi.listComments(id),
      ]);
      setRequest(data);
      setComments(commentsData);
    } catch (err: unknown) {
      setError('Failed to load service request details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load technicians for assignment
  useEffect(() => {
    if (isITAdmin) {
      getTechnicians().then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTechnicians(list.map(t => ({
          id: t.id,
          full_name: t.full_name,
          email: t.email,
        })));
      }).catch(() => {});
    }
  }, [isITAdmin]);


  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;

    setSubmittingComment(true);
    try {
      const added = await serviceRequestsApi.addComment(
        id,
        newComment.trim(),
        isInternalNote ? 'internal' : 'public'
      );
      setComments(prev => [...prev, added]);
      setNewComment('');
      setIsInternalNote(false);
    } catch {
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      await serviceRequestsApi.uploadAttachment(id, file);
      loadData();
    } catch {
      alert('Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setIsApproving(true);
    try {
      await serviceRequestsApi.approve(id, approveComment.trim());
      setIsApproveModalOpen(false);
      setApproveComment('');
      loadData();
    } catch {
      alert('Failed to approve request.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await serviceRequestsApi.reject(id, rejectReason.trim());
      setIsRejectModalOpen(false);
      setRejectReason('');
      loadData();
    } catch {
      alert('Failed to reject request.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !assigneeId) return;
    setIsAssigning(true);
    try {
      await serviceRequestsApi.assign(id, Number(assigneeId));
      setIsAssignModalOpen(false);
      loadData();
    } catch {
      alert('Failed to assign technician.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartProgress = async () => {
    if (!id) return;
    try {
      await serviceRequestsApi.updateStatus(id, 'in_progress');
      loadData();
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleNeedInfo = async () => {
    if (!id) return;
    try {
      await serviceRequestsApi.updateStatus(id, 'waiting_for_user');
      loadData();
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      await serviceRequestsApi.complete(id);
      setIsCompleteModalOpen(false);
      loadData();
    } catch {
      alert('Failed to complete request.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      await serviceRequestsApi.cancel(id, cancelReason.trim());
      setIsCancelModalOpen(false);
      setCancelReason('');
      loadData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      alert(axiosError?.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRespond = async () => {
    if (!id || !respondMessage.trim()) return;
    setIsResponding(true);
    try {
      await serviceRequestsApi.respond(id, respondMessage.trim());
      setIsRespondModalOpen(false);
      setRespondMessage('');
      loadData();
    } catch {
      alert('Failed to send response.');
    } finally {
      setIsResponding(false);
    }
  };

  const openLinkModal = async (type: 'ticket' | 'asset' | 'software' | 'procurement') => {
    setLinkType(type);
    setSelectedItemId('');
    setAvailableItems([]);
    setIsLinkModalOpen(true);

    try {
      if (type === 'ticket') {
        const res = await getTickets();
        const list = Array.isArray(res.data?.results) ? res.data.results : [];
        setAvailableItems(list.map(t => ({
          id: t.id,
          label: `${t.ticket_number} - ${t.subject || 'Ticket'}`,
        })));
      } else if (type === 'asset') {
        const res = await assetsApi.listAssets({ page_size: 50, status: 'available' });
        setAvailableItems(res.results.map(a => ({
          id: a.id,
          label: `${a.asset_tag} - ${a.model} (${a.manufacturer || 'Asset'})`,
        })));
      } else if (type === 'software') {
        const res = await softwareApi.getSoftwareList({ page_size: 50 });
        setAvailableItems(res.results.map(s => ({
          id: s.id,
          label: `${s.software_id} - ${s.name}`,
        })));
      } else if (type === 'procurement') {
        const res = await procurementApi.list({ page: 1 });
        setAvailableItems(res.results.map(p => ({
          id: p.id,
          label: `${p.request_id} - ${p.item_name} (${p.status})`,
        })));
      }
    } catch {
      // ignore
    }
  };

  const handleLinkSave = async () => {
    if (!id) return;
    setIsLinking(true);
    try {
      const payload: Record<string, number | null> = {};
      if (linkType === 'ticket') payload.ticket_id = selectedItemId ? Number(selectedItemId) : null;
      if (linkType === 'asset') payload.asset_id = selectedItemId ? Number(selectedItemId) : null;
      if (linkType === 'software') payload.software_id = selectedItemId ? Number(selectedItemId) : null;
      if (linkType === 'procurement') payload.procurement_id = selectedItemId ? Number(selectedItemId) : null;

      await serviceRequestsApi.linkItems(id, payload);
      setIsLinkModalOpen(false);
      loadData();
    } catch {
      alert('Failed to update link.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (type: 'ticket' | 'asset' | 'software' | 'procurement') => {
    if (!id || !window.confirm(`Unlink this ${type}?`)) return;
    try {
      const payload: Record<string, null> = { [`${type}_id`]: null };
      await serviceRequestsApi.linkItems(id, payload);
      loadData();
    } catch {
      alert(`Failed to unlink ${type}.`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }


  if (error || !request) {
    return (
      <div style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#DC2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', marginBottom: '8px' }}>
          Service Request Not Found
        </h2>
        <p style={{ color: '#667085', marginBottom: '24px' }}>
          {error || 'The requested service request does not exist or you do not have permission to view it.'}
        </p>
        <Button variant="primary" onClick={() => navigate('/service-requests')}>
          Back to Requests
        </Button>
      </div>
    );
  }

  const canApprove = isITAdmin && ['submitted', 'under_review', 'pending_approval'].includes(request.status);
  const canAssign = isITAdmin && !['completed', 'cancelled', 'rejected'].includes(request.status);
  const canStartProgress = isITStaff && ['submitted', 'approved'].includes(request.status);
  const canNeedInfo = isITStaff && request.status === 'in_progress';
  const canComplete = isITStaff && !['completed', 'cancelled', 'rejected'].includes(request.status);
  const canRespond = isEmployee && request.status === 'waiting_for_user' && request.requester.id === user?.id;
  const canCancel = !['completed', 'cancelled'].includes(request.status) && (isITAdmin || (isEmployee && request.requester.id === user?.id));

  const getPriorityBadge = (p: string) => {
    const config: Record<string, { bg: string; color: string; border: string; label: string; dot?: boolean }> = {
      urgent: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Urgent', dot: true },
      critical: { bg: '#FEF2F2', color: '#B42318', border: '#FECDCA', label: 'Critical', dot: true },
      high: { bg: '#FFF7ED', color: '#9A3412', border: '#FFEDD5', label: 'High' },
      medium: { bg: '#EFF6FF', color: '#1E40AF', border: '#B2CCFF', label: 'Medium' },
      low: { bg: '#F8FAFC', color: '#475569', border: '#E5E9F0', label: 'Low' },
    };
    const c = config[p] || config.low;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1.3,
          backgroundColor: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {c.dot && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#DC2626',
              display: 'inline-block',
            }}
          />
        )}
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/service-requests')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Service Requests</span>
        </button>
      </div>

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.3px', fontFamily: 'monospace' }}>
                {request.request_id}
              </span>
              <Badge variant={request.status === 'completed' ? 'success' : request.status === 'rejected' ? 'danger' : 'primary'}>
                {request.status_display}
              </Badge>
              {request.is_overdue && (
                <span
                  style={{
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={12} /> OVERDUE
                </span>
              )}
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#172033', lineHeight: 1.2 }}>
              {request.subject}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#667085' }}>
              Category:{' '}
              <strong style={{ color: '#475467' }}>{request.request_type_display}</strong> • Submitted{' '}
              {formatDateTime(request.created_at)}
            </p>
          </div>


          {/* Action Buttons Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {canApprove && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsApproveModalOpen(true)}
                  leftIcon={<CheckCircle2 size={14} />}
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  Approve Request
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  leftIcon={<XCircle size={14} />}
                >
                  Reject
                </Button>
              </>
            )}

            {canAssign && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAssigneeId(request.assigned_to?.id || '');
                  setIsAssignModalOpen(true);
                }}
                leftIcon={<UserPlus size={14} />}
              >
                {request.assigned_to ? 'Reassign' : 'Assign'}
              </Button>
            )}

            {canStartProgress && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartProgress}
                leftIcon={<Play size={14} />}
              >
                Start Progress
              </Button>
            )}

            {canNeedInfo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNeedInfo}
                leftIcon={<HelpCircle size={14} />}
              >
                Request User Info
              </Button>
            )}

            {canRespond && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRespondModalOpen(true)}
                leftIcon={<Send size={14} />}
                style={{ backgroundColor: '#D97706', borderColor: '#D97706' }}
              >
                Respond to IT
              </Button>
            )}

            {canComplete && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                leftIcon={<CheckCheck size={14} />}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                Complete Request
              </Button>
            )}

            {canCancel && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
              >
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Metadata/Fulfillment */}
      <div className="detail-grid-service-request">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Request Information Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#172033' }}>
              Request Information
            </h3>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: '4px' }}>
                Description & Specifications
              </label>
              <div style={{ fontSize: '14px', color: '#172033', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {request.description}
              </div>
            </div>

            {request.business_justification && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Business Justification
                </label>
                <div style={{ fontSize: '14px', color: '#475467', backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #F5F7FA' }}>
                  {request.business_justification}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: '1px solid #F5F7FA' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#667085' }}>Requester:</span>
                <div style={{ fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {request.requester_name || request.requester.email}
                </div>
                <div style={{ fontSize: '12px', color: '#667085' }}>{request.requester_email}</div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#667085' }}>Department:</span>
                <div style={{ fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {request.department_name || '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#667085' }}>Required By Date:</span>
                <div style={{ fontWeight: 600, color: request.is_overdue ? '#DC2626' : '#172033', marginTop: '2px' }}>
                  {request.required_by_date ? formatDate(request.required_by_date) : 'None'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '4px' }}>Priority:</span>
                {getPriorityBadge(request.priority)}
              </div>
            </div>
          </div>


          {/* Activity & Comments */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <MessageSquare size={18} color="#172033" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#172033' }}>
                Activity & Discussion ({comments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {comments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#98A2B3', fontSize: '13px' }}>
                  No comments yet. Start the conversation below.
                </div>
              ) : (
                comments.map(c => {
                  const isInternal = c.comment_type === 'internal';
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        backgroundColor: isInternal ? '#FFFAEB' : '#F8FAFC',
                        border: isInternal ? '1px solid #FEDF89' : '1px solid #F5F7FA',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#172033' }}>
                            {c.author.full_name || c.author.email}
                          </strong>
                          {isInternal && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                backgroundColor: '#FEF3C7',
                                color: '#B54708',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              <Lock size={10} /> INTERNAL NOTE
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#98A2B3' }}>
                          {formatDateTime(c.created_at)}
                        </span>

                      </div>
                      <div style={{ fontSize: '13px', color: '#475467', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {c.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Comment Form */}
            <form onSubmit={handleAddComment}>
              <textarea
                rows={3}
                placeholder={isInternalNote ? 'Write an internal note (only visible to IT Staff)...' : 'Write a comment or response...'}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: isInternalNote ? '1px solid #F59E0B' : '1px solid #E5E9F0',
                  backgroundColor: isInternalNote ? '#FFFDF5' : '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  marginBottom: '10px',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isITStaff ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={e => setIsInternalNote(e.target.checked)}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={13} color="#D97706" /> Internal Note (Hidden from employee)
                    </span>
                  </label>
                ) : <div />}

                <Button variant="primary" size="sm" type="submit" isLoading={submittingComment} leftIcon={<Send size={14} />}>
                  Post Comment
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Status, Approvals, Fulfillment Links & Attachments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Progressive Lifecycle Tracking Timeline */}
          <ServiceDeskTrackingTimeline
            item={{
              id: request.id,
              type: 'service_request',
              request_id: request.request_id,
              subject: request.subject,
              status: request.status,
              priority: request.priority,
              created_at: request.created_at,
              resolved_at: request.completed_date || null,
              requester_name: request.requester_name || request.requester.email,
              requester_email: request.requester_email,
              department_name: request.department_name,
              category_name: request.request_type_display,
              assigned_to_name: request.assigned_to_name,
              business_justification: request.business_justification,
              linked_asset: request.linked_asset
                ? {
                    asset_tag: request.linked_asset.asset_tag,
                    type_name: request.linked_asset.type_name,
                    model: request.linked_asset.model,
                  }
                : null,
              linked_software: request.linked_software
                ? { name: request.linked_software.name }
                : null,
              comments_count: comments.length,
              attachments_count: request.attachments?.length || 0,
            }}
          />

          {/* Status & Approvals Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#172033' }}>
              Workflow & Approvals
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#667085' }}>Assigned Technician:</span>
                <div style={{ fontWeight: 600, color: '#172033', marginTop: '2px' }}>
                  {request.assigned_to_name ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UserPlus size={14} color="#2563EB" />
                      {request.assigned_to_name}
                    </span>
                  ) : (
                    <span style={{ color: '#98A2B3', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </div>
                {request.assigned_date && (
                  <div style={{ fontSize: '11px', color: '#98A2B3' }}>
                    Assigned on {new Date(request.assigned_date).toLocaleString()}
                  </div>
                )}
              </div>

              {request.approved_by && (
                <div style={{ padding: '10px', backgroundColor: '#ECFDF3', borderRadius: '6px', border: '1px solid #D1FADF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065F46', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Approved by {request.approved_by_name}
                  </div>
                  {request.approved_date && (
                    <div style={{ fontSize: '11px', color: '#047857' }}>
                      {new Date(request.approved_date).toLocaleString()}
                    </div>
                  )}
                  {request.approval_comment && (
                    <div style={{ fontSize: '12px', color: '#065F46', marginTop: '4px', fontStyle: 'italic' }}>
                      "{request.approval_comment}"
                    </div>
                  )}
                </div>
              )}

              {request.rejected_by && (
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECDCA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B42318', fontWeight: 600 }}>
                    <XCircle size={14} /> Rejected by {request.rejected_by.full_name}
                  </div>
                  {request.rejection_reason && (
                    <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                      Reason: {request.rejection_reason}
                    </div>
                  )}
                </div>
              )}

              {request.completed_by && (
                <div style={{ padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #D1FADF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600 }}>
                    <CheckCheck size={14} /> Completed by {request.completed_by.full_name}
                  </div>
                  {request.completed_date && (
                    <div style={{ fontSize: '11px', color: '#15803D' }}>
                      {formatDateTime(request.completed_date)}
                    </div>
                  )}
                </div>
              )}

              {request.cancelled_date && (
                <div style={{ padding: '10px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#475569' }}>
                  <div style={{ fontWeight: 600 }}>Cancelled on {formatDate(request.cancelled_date)}</div>
                  {request.cancellation_reason && (
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>Reason: {request.cancellation_reason}</div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Cross-Module Fulfillment Links Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#172033' }}>
                Fulfillment & Integrations
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Linked Ticket */}
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Ticket size={14} color="#2563EB" /> Linked Ticket
                  </span>
                  {isITStaff && (
                    <button
                      onClick={() => request.linked_ticket ? handleUnlink('ticket') : openLinkModal('ticket')}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {request.linked_ticket ? 'Unlink' : 'Link Ticket'}
                    </button>
                  )}
                </div>
                {request.linked_ticket ? (
                  <div style={{ marginTop: '6px' }}>
                    <Link
                      to={`/tickets/${request.linked_ticket.id}`}
                      style={{ color: '#2563EB', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {request.linked_ticket.ticket_number} <ExternalLink size={12} />
                    </Link>
                    <div style={{ fontSize: '12px', color: '#667085' }}>{request.linked_ticket.subject}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>No ticket linked</div>
                )}
              </div>

              {/* Linked Asset */}
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Laptop size={14} color="#059669" /> Linked Hardware Asset
                  </span>
                  {isITStaff && (
                    <button
                      onClick={() => request.linked_asset ? handleUnlink('asset') : openLinkModal('asset')}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {request.linked_asset ? 'Unlink' : 'Link Asset'}
                    </button>
                  )}
                </div>
                {request.linked_asset ? (
                  <div style={{ marginTop: '6px' }}>
                    <Link
                      to={`/assets/${request.linked_asset.id}`}
                      style={{ color: '#059669', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {request.linked_asset.asset_tag} <ExternalLink size={12} />
                    </Link>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {request.linked_asset.model} • {request.linked_asset.status}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>No asset linked</div>
                )}
              </div>

              {/* Linked Software */}
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="#7C3AED" /> Linked Software
                  </span>
                  {isITStaff && (
                    <button
                      onClick={() => request.linked_software ? handleUnlink('software') : openLinkModal('software')}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {request.linked_software ? 'Unlink' : 'Link Software'}
                    </button>
                  )}
                </div>
                {request.linked_software ? (
                  <div style={{ marginTop: '6px' }}>
                    <Link
                      to={`/software/${request.linked_software.id}`}
                      style={{ color: '#7C3AED', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {request.linked_software.name} <ExternalLink size={12} />
                    </Link>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {request.linked_software.category_name} • {request.linked_software.status}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>No software linked</div>
                )}
              </div>

              {/* Linked Procurement */}
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingCart size={14} color="#EA580C" /> Linked Procurement
                  </span>
                  {isITStaff && (
                    <button
                      onClick={() => request.linked_procurement ? handleUnlink('procurement') : openLinkModal('procurement')}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {request.linked_procurement ? 'Unlink' : 'Link Procurement'}
                    </button>
                  )}
                </div>
                {request.linked_procurement ? (
                  <div style={{ marginTop: '6px' }}>
                    <Link
                      to={`/procurement/${request.linked_procurement.id}`}
                      style={{ color: '#EA580C', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {request.linked_procurement.request_id} <ExternalLink size={12} />
                    </Link>
                    <div style={{ fontSize: '12px', color: '#667085' }}>
                      {request.linked_procurement.item_name} • {request.linked_procurement.status}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#98A2B3', marginTop: '4px' }}>No procurement linked</div>
                )}
              </div>
            </div>
          </div>

          {/* Attachments Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#172033' }}>
                Attachments ({request.attachments?.length || 0})
              </h4>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isUploading ? 'wait' : 'pointer',
                }}
              >
                <Upload size={13} /> {isUploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {!request.attachments || request.attachments.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#98A2B3' }}>No attachments uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {request.attachments.map(att => (
                  <div
                    key={att.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #F5F7FA',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      <span style={{ fontWeight: 500, color: '#475467' }}>{att.original_filename}</span>
                      <span style={{ color: '#98A2B3', marginLeft: '6px' }}>
                        ({(att.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {att.file_url ? (
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {isApproveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Approve Service Request</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Confirm approval of request {request.request_id} for {request.requester_name}.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Approval Comment (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g., Approved standard hardware replacement..."
                value={approveComment}
                onChange={e => setApproveComment(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsApproveModalOpen(false)} disabled={isApproving}>Cancel</Button>
              <Button variant="primary" onClick={handleApprove} isLoading={isApproving} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Reject Service Request</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Provide a clear reason for rejecting request {request.request_id}. The requester will receive this notification.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Rejection Reason <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea
                rows={3}
                placeholder="e.g., Does not comply with standard peripheral policy..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)} disabled={isRejecting}>Cancel</Button>
              <Button variant="danger" onClick={handleReject} isLoading={isRejecting} disabled={!rejectReason.trim()}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Assign Technician</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Select an IT staff member to handle request {request.request_id}.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Technician</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px' }}
              >
                <option value="">Select IT staff...</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)} disabled={isAssigning}>Cancel</Button>
              <Button variant="primary" onClick={handleAssign} isLoading={isAssigning} disabled={!assigneeId}>
                Assign Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {isCompleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Complete Request?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#667085', lineHeight: '1.5' }}>
              Mark this service request as completed? The requester ({request.requester_name}) will be notified that their request has been fulfilled.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)} disabled={isCompleting}>Cancel</Button>
              <Button variant="primary" onClick={handleComplete} isLoading={isCompleting} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                Confirm Completion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Cancel Service Request</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Are you sure you want to cancel request {request.request_id}?
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Cancellation Reason</label>
              <textarea
                rows={2}
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>Back</Button>
              <Button variant="danger" onClick={handleCancel} isLoading={isCancelling}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Respond to IT Modal (when waiting for user) */}
      {isRespondModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>Respond to IT</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Provide the requested details to move your service request back into progress.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Your Response <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea
                rows={4}
                placeholder="Type your response here..."
                value={respondMessage}
                onChange={e => setRespondMessage(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsRespondModalOpen(false)} disabled={isResponding}>Cancel</Button>
              <Button variant="primary" onClick={handleRespond} isLoading={isResponding} disabled={!respondMessage.trim()} style={{ backgroundColor: '#D97706', borderColor: '#D97706' }}>
                Submit Response
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Module Linking Modal */}
      {isLinkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 23, 57, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#172033' }}>
              Link {linkType === 'ticket' ? 'Ticket' : linkType === 'asset' ? 'Hardware Asset' : linkType === 'software' ? 'Software' : 'Procurement Order'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#667085' }}>
              Connect this request to existing system inventory or tracking records.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>Select Record</label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value ? Number(e.target.value) : '')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '13px' }}
              >
                <option value="">Select from list...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)} disabled={isLinking}>Cancel</Button>
              <Button variant="primary" onClick={handleLinkSave} isLoading={isLinking} disabled={!selectedItemId}>
                Save Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
