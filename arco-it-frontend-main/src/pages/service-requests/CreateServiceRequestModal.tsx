import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { serviceRequestsApi } from '../../api/serviceRequests';
import { employeesApi } from '../../api/employees';
import { Employee } from '../../types';
import { ServiceRequest, RequestType, RequestPriority } from '../../types/serviceRequests';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrAbove } from '../../utils/auth';

interface CreateServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: ServiceRequest) => void;
}

export const CreateServiceRequestModal: React.FC<CreateServiceRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isITStaff = user ? ['it_support', 'it_admin', 'super_admin'].includes(user.role) : false;


  const [requestType, setRequestType] = useState<RequestType>('software_access');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [businessJustification, setBusinessJustification] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [requestedForId, setRequestedForId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isITStaff) {
      employeesApi.list({ page: 1 }).then(res => {
        setEmployees(res.results || []);
      }).catch(() => {});
    }
  }, [isOpen, isITStaff]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a subject for your request.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide details in the description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await serviceRequestsApi.create({
        request_type: requestType,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        business_justification: businessJustification.trim() || undefined,
        required_by_date: requiredByDate || null,
        requested_for_id: requestedForId ? Number(requestedForId) : null,
      });

      // Upload file if selected
      if (selectedFile) {
        try {
          await serviceRequestsApi.uploadAttachment(created.id, selectedFile);
        } catch {
          // File upload error shouldn't block creation
        }
      }

      onSuccess(created);
      onClose();
      // Reset form
      setSubject('');
      setDescription('');
      setRequestType('software_access');
      setPriority('medium');
      setBusinessJustification('');
      setRequiredByDate('');
      setRequestedForId('');
      setSelectedFile(null);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        axiosError?.response?.data?.detail ||
        axiosError?.response?.data?.message ||
        'Failed to submit service request. Please verify fields and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E9F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172033' }}>
              Create IT Service Request
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#667085' }}>
              Request hardware, software access, permissions, or workplace IT equipment
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#98A2B3',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#B42318',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          {/* Request Type & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Request Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value as RequestType)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  color: '#172033',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="software_access">Software Access</option>
                <option value="hardware_request">Hardware Request</option>
                <option value="access_request">Access Request</option>
                <option value="vpn_request">VPN Request</option>
                <option value="account_permission">Account / Permission Request</option>
                <option value="equipment_replacement">Equipment Replacement</option>
                <option value="new_equipment">New Equipment</option>
                <option value="peripheral_request">Peripheral Request</option>
                <option value="it_service">IT Service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Priority <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as RequestPriority)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  color: '#172033',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Requested For (visible to IT staff or if employee list available) */}
          {isITStaff && employees.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Requested For (Optional)
              </label>
              <select
                value={requestedForId}
                onChange={e => setRequestedForId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  color: '#172033',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">Myself ({user?.full_name})</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_id} — {emp.department_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Subject <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Need VS Code, Second Monitor for workstation..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                color: '#172033',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Description / Specifications <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe what you need, specifications, workstation location, etc..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                color: '#172033',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              required
            />
          </div>

          {/* Business Justification & Required By Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Business Justification
              </label>
              <input
                type="text"
                placeholder="e.g. Needed for development tasks..."
                value={businessJustification}
                onChange={e => setBusinessJustification(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  color: '#172033',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Required By Date
              </label>
              <input
                type="date"
                value={requiredByDate}
                onChange={e => setRequiredByDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  color: '#172033',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Supporting Document / Screenshot (Optional)
            </label>
            <div
              style={{
                border: '1px dashed #E5E9F0',
                borderRadius: '6px',
                padding: '14px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('sr-file-input')?.click()}
            >
              <Upload size={20} color="#667085" style={{ margin: '0 auto 6px' }} />
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                {selectedFile ? (
                  <strong style={{ color: '#2563EB' }}>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</strong>
                ) : (
                  'Click to browse or drop an attachment (Max 10MB)'
                )}
              </p>
              <input
                id="sr-file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
