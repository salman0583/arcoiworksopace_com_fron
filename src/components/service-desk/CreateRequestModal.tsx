import React, { useState, useEffect } from 'react';
import { Flame, ClipboardList, Upload, X, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { createTicket, getCategories, uploadAttachment as uploadTicketAttachment } from '../../api/tickets';
import { serviceRequestsApi } from '../../api/serviceRequests';
import type { TicketCategory } from '../../types/tickets';
import type { ServiceDeskType, ServiceDeskItem } from '../../types/serviceDesk';
import { useAuth } from '../../context/AuthContext';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdItem: { id: number; request_id: string; type: ServiceDeskType; subject: string }) => void;
  initialType?: ServiceDeskType;
}

const SERVICE_REQUEST_TYPES = [
  { value: 'software_access', label: 'Software Access / License' },
  { value: 'hardware_request', label: 'Hardware Request (Monitor, Dock, PC)' },
  { value: 'access_request', label: 'System / Portal Access' },
  { value: 'vpn_request', label: 'VPN & Remote Access' },
  { value: 'account_permission', label: 'Account / Role Permissions' },
  { value: 'equipment_replacement', label: 'Equipment Replacement' },
  { value: 'new_equipment', label: 'New Employee Equipment' },
  { value: 'peripheral_request', label: 'Peripherals (Mouse, Keyboard, Headset)' },
  { value: 'it_service', label: 'General IT Service' },
  { value: 'other', label: 'Other Request' },
];

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType,
}) => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<ServiceDeskType | null>(initialType || null);

  // Common fields
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [attachment, setAttachment] = useState<File | null>(null);

  // Incident fields
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('');

  // Service Request fields
  const [requestType, setRequestType] = useState('software_access');
  const [justification, setJustification] = useState('');
  const [requiredDate, setRequiredDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getCategories()
        .then((res) => {
          const cats = Array.isArray(res.data) ? res.data : [];
          setCategories(cats);
        })
        .catch(() => {});
      if (initialType) {
        setSelectedType(initialType);
      }
    } else {
      // Reset form on close
      setSelectedType(initialType || null);
      setSubject('');
      setDescription('');
      setPriority('medium');
      setCategoryId('');
      setSubcategoryId('');
      setRequestType('software_access');
      setJustification('');
      setRequiredDate('');
      setAttachment(null);
      setError(null);
    }
  }, [isOpen, initialType]);

  const activeCategory = categories.find((c) => c.id === Number(categoryId));

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        setError('Selected file exceeds the 10MB limit. Please upload a smaller file.');
        return;
      }
      setError(null);
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please provide a brief summary/subject for your request.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a detailed description.');
      return;
    }

    setLoading(true);
    try {
      if (selectedType === 'incident') {
        // Create Ticket (Incident)
        const payload = {
          subject: subject.trim(),
          description: description.trim(),
          priority: priority as any,
          category_id: categoryId ? Number(categoryId) : null,
          subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        };
        const res = await createTicket(payload);
        const ticket = res.data;

        // Upload attachment if present
        if (attachment && ticket.id) {
          try {
            await uploadTicketAttachment(ticket.id, attachment);
          } catch {
            // non-fatal
          }
        }

        onSuccess({
          id: ticket.id,
          request_id: ticket.ticket_number,
          type: 'incident',
          subject: ticket.subject,
        });
      } else {
        // Create Service Request
        const payload = {
          request_type: requestType,
          subject: subject.trim(),
          description: description.trim(),
          priority: priority,
          business_justification: justification.trim(),
          required_by_date: requiredDate || null,
        };
        const sr = await serviceRequestsApi.create(payload);

        // Upload attachment if present
        if (attachment && sr.id) {
          try {
            await serviceRequestsApi.uploadAttachment(sr.id, attachment);
          } catch {
            // non-fatal
          }
        }

        onSuccess({
          id: sr.id,
          request_id: sr.request_id,
          type: 'service_request',
          subject: sr.subject,
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Failed to submit request. Please verify your inputs and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedType === 'incident'
          ? 'Report an Incident'
          : selectedType === 'service_request'
          ? 'Submit a Service Request'
          : 'Create New IT Request'
      }
      subtitle={
        selectedType === 'incident'
          ? 'Report something that is broken, unavailable, or experiencing issues.'
          : selectedType === 'service_request'
          ? 'Request hardware, software access, permissions, or IT assistance.'
          : 'Select the type of request you would like to submit to the IT Service Desk.'
      }
      size="lg"
    >
      {/* ── STEP 1: SELECT REQUEST TYPE ────────────────────────────────────────── */}
      {!selectedType ? (
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#475467', fontWeight: 500 }}>
            Select the classification that best matches your request:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {/* INCIDENT CARD */}
            <div
              role="button"
              tabIndex={0}
              className="service-desk-type-card type-incident"
              onClick={() => setSelectedType('incident')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedType('incident');
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flame size={20} />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Unplanned Issue
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                Report an Incident
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.45 }}>
                Something is broken, not working, or experiencing degradation (e.g. system outage, hardware failure, network issue).
              </div>
            </div>

            {/* SERVICE REQUEST CARD */}
            <div
              role="button"
              tabIndex={0}
              className="service-desk-type-card type-service-request"
              onClick={() => setSelectedType('service_request')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedType('service_request');
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardList size={20} />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.02em',
                  }}
                >
                  New Request / Access
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                Submit a Service Request
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.45 }}>
                Request new hardware equipment, software licenses, account permissions, peripherals, or standard workplace IT services.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── STEP 2: FORM DETAILS ─────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                color: '#B42318',
                borderRadius: '6px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Type banner with switch back option */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: selectedType === 'incident' ? '#FEF2F2' : '#EFF6FF',
              border: `1px solid ${selectedType === 'incident' ? '#FEE2E2' : '#DBEAFE'}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedType === 'incident' ? (
                <>
                  <Flame size={16} color="#DC2626" />
                  <span style={{ fontWeight: 600, color: '#B42318' }}>Incident</span>
                  <span style={{ color: '#7F1D1D' }}>— Broken equipment or outage</span>
                </>
              ) : (
                <>
                  <ClipboardList size={16} color="#2563EB" />
                  <span style={{ fontWeight: 600, color: '#1D4ED8' }}>Service Request</span>
                  <span style={{ color: '#1E40AF' }}>— Hardware, software, or permissions</span>
                </>
              )}
            </div>
            {!initialType && (
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ArrowLeft size={12} /> Change Type
              </button>
            )}
          </div>

          {selectedType === 'incident' ? (
            /* ── INCIDENT BALANCED 2-COLUMN FORM ──────────────────────────────── */
            <div className="service-desk-form-grid">
              {/* Col 1: Category */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Incident Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value ? Number(e.target.value) : '');
                    setSubcategoryId('');
                  }}
                  className="standard-select"
                  style={{ width: '100%', height: '38px' }}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 2: Subcategory */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Subcategory
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!categoryId || !activeCategory?.subcategories?.length}
                  className="standard-select"
                  style={{
                    width: '100%',
                    height: '38px',
                    backgroundColor: !categoryId ? '#F8FAFC' : '#FFFFFF',
                    cursor: !categoryId ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">Select Subcategory...</option>
                  {activeCategory?.subcategories?.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 1: Subject */}
              <div>
                <Input
                  label="Subject / Summary *"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Laptop monitor flickering constantly after update"
                />
              </div>

              {/* Col 2: Priority */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Priority Urgency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', height: '38px' }}>
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        padding: '0 4px',
                        borderRadius: '6px',
                        border: priority === p ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: priority === p ? '#EFF6FF' : '#FFFFFF',
                        color: priority === p ? '#1D4ED8' : '#475467',
                        fontSize: '12px',
                        fontWeight: priority === p ? 600 : 500,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full width: Detailed Description */}
              <div className="full-width">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Detailed Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue symptoms, steps to reproduce, error codes, or affected equipment..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Full width: Attachment */}
              <div className="full-width">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Attachment (Optional - Max 10MB)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Upload size={14} />
                    <span>{attachment ? 'Change File' : 'Attach File'}</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {attachment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0F172A', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 500, maxWidth: '240px' }} className="cell-truncate-1" title={attachment.name}>
                        {attachment.name}
                      </span>
                      <span style={{ color: '#64748B', fontSize: '12px' }}>
                        ({(attachment.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── SERVICE REQUEST BALANCED 2-COLUMN FORM ───────────────────────── */
            <div className="service-desk-form-grid">
              {/* Col 1: Request Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Request Type <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                  className="standard-select"
                  style={{ width: '100%', height: '38px' }}
                >
                  {SERVICE_REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 2: Required By Date */}
              <div>
                <Input
                  label="Required By Date (Optional)"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>

              {/* Col 1: Subject */}
              <div>
                <Input
                  label="Subject / Summary *"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Request dual monitor setup for workstation"
                />
              </div>

              {/* Col 2: Priority */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Priority Urgency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', height: '38px' }}>
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        padding: '0 4px',
                        borderRadius: '6px',
                        border: priority === p ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: priority === p ? '#EFF6FF' : '#FFFFFF',
                        color: priority === p ? '#1D4ED8' : '#475467',
                        fontSize: '12px',
                        fontWeight: priority === p ? 600 : 500,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Col 1: Detailed Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Detailed Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify the exact equipment, model preferences, software name, or access role needed..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Col 2: Business Justification */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Business Justification (Optional)
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain the project, department requirement, or business justification..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Full width: Attachment */}
              <div className="full-width">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Attachment (Optional - Max 10MB)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Upload size={14} />
                    <span>{attachment ? 'Change File' : 'Attach File'}</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {attachment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0F172A', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 500, maxWidth: '240px' }} className="cell-truncate-1" title={attachment.name}>
                        {attachment.name}
                      </span>
                      <span style={{ color: '#64748B', fontSize: '12px' }}>
                        ({(attachment.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
              {loading ? 'Submitting Request...' : 'Submit to IT Service Desk'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
