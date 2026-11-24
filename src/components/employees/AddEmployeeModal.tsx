import React, { useState, useEffect } from 'react';
import { employeesApi } from '../../api/employees';
import { Employee, Department } from '../../types';
import { Button, Input, PasswordInput } from '../ui';
import {
  X, AlertCircle, Key, ShieldCheck, UserPlus,
  Lock, Sparkles, Building2, User
} from 'lucide-react';
import { logger } from '../../utils/logger';
import type { CreatedCredentials } from './CreatedCredentialsModal';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: Employee, credentials?: CreatedCredentials) => void;
  departments: Department[];
  managers: Employee[];
}

interface AddEmployeeForm {
  employee_id: string;
  full_name: string;
  email: string;
  department_id: number | '';
  job_title: string;
  manager_id: number | '';
  location: string;
  joining_date: string;
  status: 'active' | 'on_leave' | 'inactive' | 'exited';
  create_user_account: boolean;
  password_mode: 'auto' | 'custom';
  temp_password: string;
}

const initialForm: AddEmployeeForm = {
  employee_id: '',
  full_name: '',
  email: '',
  department_id: '',
  job_title: '',
  manager_id: '',
  location: 'Hyderabad, Telangana, India',
  joining_date: new Date().toISOString().split('T')[0],
  status: 'active',
  create_user_account: true,
  password_mode: 'auto',
  temp_password: '',
};

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departments,
  managers,
}) => {
  const [form, setForm] = useState<AddEmployeeForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setFieldErrors({});
      setModalError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Keyboard Escape listener & background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.employee_id.trim()) {
      errors.employee_id = 'Employee ID is required (e.g. EMP016)';
    }
    if (!form.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.department_id) {
      errors.department_id = 'Please select a department';
    }
    if (!form.job_title.trim()) {
      errors.job_title = 'Job title is required';
    }
    if (!form.joining_date) {
      errors.joining_date = 'Joining date is required';
    }
    if (form.create_user_account && form.password_mode === 'custom') {
      if (!form.temp_password.trim()) {
        errors.temp_password = 'Enter a temporary password or switch to Auto-Generate';
      } else if (form.temp_password.trim().length < 8) {
        errors.temp_password = 'Password must be at least 8 characters long';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Employee> & Record<string, unknown> = {
        employee_id: form.employee_id.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        department_id: Number(form.department_id),
        job_title: form.job_title.trim(),
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        location: form.location.trim() || 'Hyderabad, Telangana, India',
        joining_date: form.joining_date,
        status: form.status,
        create_user_account: form.create_user_account,
        ...(form.create_user_account && form.password_mode === 'custom' && form.temp_password.trim()
          ? { temp_password: form.temp_password.trim() }
          : {}),
      };

      const created = await employeesApi.create(payload);
      logger.info('Employees', `Successfully created employee ${created.employee_id}`);

      let credentials: CreatedCredentials | undefined;
      if (form.create_user_account && (created.generated_password || (form.password_mode === 'custom' && form.temp_password))) {
        credentials = {
          employee_id: created.employee_id,
          full_name: created.full_name,
          email: created.email,
          temporary_password: created.generated_password || form.temp_password,
          role: created.user_role || 'Employee',
        };
      }

      onSuccess(created, credentials);
      onClose();
    } catch (err: unknown) {
      logger.error('Employees', 'Failed to create employee', err);
      const errorResp = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (errorResp && typeof errorResp === 'object') {
        const newFieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(errorResp)) {
          if (Array.isArray(val)) {
            newFieldErrors[key] = val[0];
          } else if (typeof val === 'string') {
            newFieldErrors[key] = val;
          }
        }
        setFieldErrors(newFieldErrors);
        if (errorResp.detail) {
          setModalError(String(errorResp.detail));
        } else if (errorResp.email) {
          setModalError(String(errorResp.email));
        } else if (errorResp.employee_id) {
          setModalError(String(errorResp.employee_id));
        } else {
          setModalError('Please review and correct the highlighted fields.');
        }
      } else {
        setModalError('Failed to create employee. Please check connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeManagers = Array.isArray(managers) ? managers : [];

  return (
    <div
      className="add-emp-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-employee-modal-title"
    >
      <div className="add-emp-modal-dialog">
        {/* Sticky Header */}
        <div className="add-emp-modal-header">
          <div className="add-emp-modal-header-text">
            <h2 id="add-employee-modal-title">
              <UserPlus size={20} color="#2563EB" />
              <span>Add New Employee</span>
            </h2>
            <p>Enter enterprise employee details and configure ARCO Workplace portal access</p>
          </div>
          <button
            type="button"
            className="add-emp-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            title="Close dialog (Esc)"
            aria-label="Close add employee dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="add-emp-modal-body">
            {/* Error Banner */}
            {modalError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#FEF2F2',
                  color: '#B42318',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #FECDCA',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* ── SECTION 1: EMPLOYEE INFORMATION ─────────────────────────── */}
            <div>
              <div className="add-emp-section-title">
                <User size={15} color="#2563EB" />
                <span>1. Employee Information</span>
              </div>

              <div className="add-emp-form-grid">
                {/* Employee ID */}
                <div className="add-emp-field">
                  <Input
                    label="Employee ID *"
                    placeholder="e.g. EMP016"
                    value={form.employee_id}
                    error={fieldErrors.employee_id}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, employee_id: e.target.value.toUpperCase() });
                      if (fieldErrors.employee_id) setFieldErrors({ ...fieldErrors, employee_id: '' });
                    }}
                  />
                </div>

                {/* Full Name */}
                <div className="add-emp-field">
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Sarah Connor"
                    value={form.full_name}
                    error={fieldErrors.full_name}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, full_name: e.target.value });
                      if (fieldErrors.full_name) setFieldErrors({ ...fieldErrors, full_name: '' });
                    }}
                  />
                </div>

                {/* Email Address */}
                <div className="add-emp-field">
                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="e.g. s.connor@example.com"
                    value={form.email}
                    error={fieldErrors.email}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value.toLowerCase() });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                  />
                </div>

                {/* Department */}
                <div className="add-emp-field">
                  <label className="add-emp-label">
                    <span>Department</span>
                    <span className="add-emp-required">*</span>
                  </label>
                  <select
                    className={`add-emp-select ${fieldErrors.department_id ? 'has-error' : ''}`}
                    value={form.department_id}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : '' });
                      if (fieldErrors.department_id) setFieldErrors({ ...fieldErrors, department_id: '' });
                    }}
                  >
                    <option value="">Select Department</option>
                    {safeDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {fieldErrors.department_id && (
                    <span className="add-emp-error-text">{fieldErrors.department_id}</span>
                  )}
                </div>

                {/* Job Title */}
                <div className="add-emp-field">
                  <Input
                    label="Job Title *"
                    placeholder="e.g. Security Analyst"
                    value={form.job_title}
                    error={fieldErrors.job_title}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, job_title: e.target.value });
                      if (fieldErrors.job_title) setFieldErrors({ ...fieldErrors, job_title: '' });
                    }}
                  />
                </div>

                {/* Manager */}
                <div className="add-emp-field">
                  <label className="add-emp-label">
                    <span>Manager (Optional)</span>
                  </label>
                  <select
                    className="add-emp-select"
                    value={form.manager_id}
                    disabled={isSubmitting}
                    onChange={(e) => setForm({ ...form, manager_id: e.target.value ? Number(e.target.value) : '' })}
                  >
                    <option value="">None / Reports to CEO</option>
                    {safeManagers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.job_title})</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="add-emp-field">
                  <Input
                    label="Location"
                    placeholder="e.g. Hyderabad, Telangana, India"
                    value={form.location}
                    error={fieldErrors.location}
                    disabled={isSubmitting}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>

                {/* Joining Date */}
                <div className="add-emp-field">
                  <label className="add-emp-label">
                    <span>Joining Date</span>
                    <span className="add-emp-required">*</span>
                  </label>
                  <input
                    type="date"
                    className={`add-emp-date-input ${fieldErrors.joining_date ? 'has-error' : ''}`}
                    value={form.joining_date}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setForm({ ...form, joining_date: e.target.value });
                      if (fieldErrors.joining_date) setFieldErrors({ ...fieldErrors, joining_date: '' });
                    }}
                  />
                  {fieldErrors.joining_date && (
                    <span className="add-emp-error-text">{fieldErrors.joining_date}</span>
                  )}
                </div>

                {/* Employment Status */}
                <div className="add-emp-field add-emp-form-grid-col-full">
                  <label className="add-emp-label">
                    <span>Employment Status</span>
                    <span className="add-emp-required">*</span>
                  </label>
                  <select
                    className="add-emp-select"
                    value={form.status}
                    disabled={isSubmitting}
                    onChange={(e) => setForm({ ...form, status: e.target.value as AddEmployeeForm['status'] })}
                  >
                    <option value="active">Active (Onboarded and working)</option>
                    <option value="on_leave">On Leave (Temporary absence)</option>
                    <option value="inactive">Inactive (Suspended / pending)</option>
                    <option value="exited">Exited (Offboarded)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: ARCO WORKPLACE ACCESS ────────────────────────── */}
            <div>
              <div className="add-emp-section-title">
                <Key size={15} color="#2563EB" />
                <span>2. ARCO Workplace Access</span>
              </div>

              <div className="add-emp-access-card">
                <div className="add-emp-access-header">
                  <div className="add-emp-access-header-left">
                    <ShieldCheck size={18} color="#2563EB" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      Portal Access Configuration
                    </span>
                  </div>
                  <span className="add-emp-access-badge">
                    {form.create_user_account ? 'Access Enabled' : 'Access Disabled'}
                  </span>
                </div>

                {/* Account Toggle Checkbox */}
                <label className="add-emp-toggle-row">
                  <input
                    type="checkbox"
                    className="add-emp-toggle-input"
                    checked={form.create_user_account}
                    disabled={isSubmitting}
                    onChange={(e) => setForm({ ...form, create_user_account: e.target.checked })}
                  />
                  <div className="add-emp-toggle-content">
                    <div className="add-emp-toggle-title">Create ARCO Workplace Login Account</div>
                    <div className="add-emp-toggle-desc">
                      Provisions an employee portal user account allowing this individual to log into ARCO Workplace,
                      submit IT tickets, acknowledge hardware assets, and view assigned software.
                    </div>
                  </div>
                </label>

                {/* Password Configuration (When Enabled) */}
                {form.create_user_account ? (
                  <div className="add-emp-pwd-config">
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                      Temporary Password Provisioning
                    </div>

                    <div className="add-emp-pwd-tabs">
                      <button
                        type="button"
                        className={`add-emp-pwd-tab-btn ${form.password_mode === 'auto' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, password_mode: 'auto', temp_password: '' })}
                        disabled={isSubmitting}
                      >
                        <Sparkles size={14} />
                        <span>Auto-Generate (Recommended)</span>
                      </button>
                      <button
                        type="button"
                        className={`add-emp-pwd-tab-btn ${form.password_mode === 'custom' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, password_mode: 'custom' })}
                        disabled={isSubmitting}
                      >
                        <Lock size={14} />
                        <span>Specify Custom Password</span>
                      </button>
                    </div>

                    {form.password_mode === 'auto' ? (
                      <div className="add-emp-pwd-notice">
                        <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          The backend will automatically generate a cryptographically strong 12-character random
                          password containing uppercase, lowercase, numbers, and special symbols. It will be securely
                          revealed after creation.
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <PasswordInput
                          label="Custom Temporary Password *"
                          placeholder="Enter initial temporary password (min. 8 chars)"
                          value={form.temp_password}
                          error={fieldErrors.temp_password}
                          disabled={isSubmitting}
                          onChange={(e) => {
                            setForm({ ...form, temp_password: e.target.value });
                            if (fieldErrors.temp_password) setFieldErrors({ ...fieldErrors, temp_password: '' });
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          Employee will be required to change this temporary password upon first login.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="add-emp-disabled-notice">
                    <AlertCircle size={15} color="#94A3B8" />
                    <span>
                      No login credentials will be created. The employee record will be saved for directory, HR, and
                      asset tracking only.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Accessible Footer */}
          <div className="add-emp-modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<UserPlus size={15} />}
            >
              Create Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
