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
          <div style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>
            What type of assistance do you need?
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* INCIDENT CARD */}
            <button
              type="button"
              onClick={() => setSelectedType('incident')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #FECDCA',
                backgroundColor: '#FFFBFB',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#EF4444';
                e.currentTarget.style.backgroundColor = '#FEF2F2';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#FECDCA';
                e.currentTarget.style.backgroundColor = '#FFFBFB';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Flame size={22} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '4px' }}>
                Incident
              </div>
              <div style={{ fontSize: '13px', color: '#667085', lineHeight: 1.4 }}>
                Something is broken, not working, or experiencing performance degradation (e.g. Wi-Fi down, laptop won&apos;t start, email error).
              </div>
            </button>

            {/* SERVICE REQUEST CARD */}
            <button
              type="button"
              onClick={() => setSelectedType('service_request')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #C7D2FE',
                backgroundColor: '#FBFCFF',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.backgroundColor = '#EEF2FF';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#C7D2FE';
                e.currentTarget.style.backgroundColor = '#FBFCFF';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#E0E7FF',
                  color: '#4338CA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <ClipboardList size={22} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '4px' }}>
                Service Request
              </div>
              <div style={{ fontSize: '13px', color: '#667085', lineHeight: 1.4 }}>
                Request new hardware equipment, software licenses, access permissions, workplace peripherals, or standard IT services.
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: FORM DETAILS ─────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
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
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Type banner with switch back option */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: selectedType === 'incident' ? '#FEF2F2' : '#EEF2FF',
              border: `1px solid ${selectedType === 'incident' ? '#FECDCA' : '#C7D2FE'}`,
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
                  <ClipboardList size={16} color="#4338CA" />
                  <span style={{ fontWeight: 600, color: '#3730A3' }}>Service Request</span>
                  <span style={{ color: '#312E81' }}>— Hardware, software, or permissions</span>
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

          {/* Category / Request Type Selection */}
          {selectedType === 'incident' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
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
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '14px',
                    color: '#172033',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Subcategory
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!categoryId || !activeCategory?.subcategories?.length}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '14px',
                    color: '#172033',
                    backgroundColor: !categoryId ? '#F8FAFC' : '#FFFFFF',
                    outline: 'none',
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
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                  Request Type <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    fontSize: '14px',
                    color: '#172033',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  {SERVICE_REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Required By Date (Optional)"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <Input
            label="Subject / Summary"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={
              selectedType === 'incident'
                ? 'e.g. Laptop monitor flickering constantly after update'
                : 'e.g. Request dual monitor setup for trading desk'
            }
          />

          {/* Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Priority Urgency
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(selectedType === 'incident'
                ? ['low', 'medium', 'high', 'critical']
                : ['low', 'medium', 'high', 'urgent']
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: priority === p ? '2px solid #2563EB' : '1px solid #E5E9F0',
                    backgroundColor: priority === p ? '#EFF6FF' : '#FFFFFF',
                    color: priority === p ? '#175CD3' : '#475467',
                    fontSize: '13px',
                    fontWeight: priority === p ? 600 : 500,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Detailed Description <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue symptoms, steps to reproduce, or exact equipment needed..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                color: '#172033',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Business justification (For Service Requests) */}
          {selectedType === 'service_request' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
                Business Justification (Optional)
              </label>
              <textarea
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain the project or business requirement for this request..."
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
            </div>
          )}

          {/* Optional Attachment */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475467', marginBottom: '6px' }}>
              Attachment (Screenshot / Logs / Document)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #E5E9F0',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                <span>{attachment ? 'Change File' : 'Attach File'}</span>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              {attachment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#172033' }}>
                  <span style={{ fontWeight: 500 }}>{attachment.name}</span>
                  <span style={{ color: '#98A2B3', fontSize: '12px' }}>
                    ({(attachment.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              {loading ? 'Submitting Request...' : 'Submit to IT Service Desk'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
