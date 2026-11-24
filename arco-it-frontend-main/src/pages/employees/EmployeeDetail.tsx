import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesApi, CreateUserResponse, ResetPasswordResponse } from '../../api/employees';
import { Employee, Department } from '../../types';
import { Button, Badge, LoadingSpinner, Avatar, Input, PasswordInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { canManageEmployees } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';

import {
  ArrowLeft, Edit, Mail, MapPin, Briefcase, Building, Calendar,
  Hash, User as UserIcon, CheckCircle2, AlertCircle, RotateCcw,
  Key, ShieldCheck, Copy, Check, Lock, UserPlus, X, Info
} from 'lucide-react';
import { logger } from '../../utils/logger';

interface EditEmployeeFormState {
  full_name: string;
  job_title: string;
  department_id: number | '';
  manager_id: number | '';
  location: string;
  status: Employee['status'];
}

interface CredentialsModalData {
  title: string;
  subtitle: string;
  employee_id: string;
  full_name: string;
  email: string;
  temporary_password?: string;
  role?: string;
}

export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allManagers, setAllManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditEmployeeFormState>({
    full_name: '',
    job_title: '',
    department_id: '',
    manager_id: '',
    location: '',
    status: 'active',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal actions state
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [customTempPassword, setCustomTempPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Display Credentials Modal
  const [credentialsModal, setCredentialsModal] = useState<CredentialsModalData | null>(null);
  const [copiedField, setCopiedField] = useState<'password' | 'email' | 'url' | null>(null);

  const fetchEmployeeData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [empData, deptsData, managersData] = await Promise.all([
        employeesApi.get(Number(id)),
        employeesApi.departments(),
        employeesApi.list({ page: 1 }),
      ]);
      setEmployee(empData);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      const managers = Array.isArray(managersData?.results)
        ? managersData.results.filter(m => m.id !== Number(id))
        : [];
      setAllManagers(managers);

      const currentDeptId = typeof empData.department === 'object' && empData.department
        ? empData.department.id
        : (typeof empData.department === 'number' ? empData.department : '');

      const currentMgrId = typeof empData.manager === 'object' && empData.manager
        ? empData.manager.id
        : (typeof empData.manager === 'number' ? empData.manager : '');

      setEditForm({
        full_name: empData.full_name || '',
        job_title: empData.job_title || '',
        department_id: currentDeptId,
        manager_id: currentMgrId,
        location: empData.location || '',
        status: empData.status || 'active',
      });
    } catch (err: unknown) {
      logger.error('Employees', 'Failed to fetch employee details', err);
      setError('Failed to fetch employee details. They may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const handleStartEditing = () => {
    if (!employee) return;
    const currentDeptId = typeof employee.department === 'object' && employee.department
      ? employee.department.id
      : (typeof employee.department === 'number' ? employee.department : '');

    const currentMgrId = typeof employee.manager === 'object' && employee.manager
      ? employee.manager.id
      : (typeof employee.manager === 'number' ? employee.manager : '');

    setEditForm({
      full_name: employee.full_name || '',
      job_title: employee.job_title || '',
      department_id: currentDeptId,
      manager_id: currentMgrId,
      location: employee.location || '',
      status: employee.status || 'active',
    });
    setFieldErrors({});
    setFormError(null);
    setIsEditing(true);
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.full_name.trim()) errors.full_name = 'Full name is required';
    if (!editForm.job_title.trim()) errors.job_title = 'Job title is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async () => {
    if (!id || !employee) return;
    setFormError(null);

    if (!validateEditForm()) return;

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: editForm.full_name.trim(),
        job_title: editForm.job_title.trim(),
        location: editForm.location.trim(),
        status: editForm.status,
      };

      if (editForm.department_id) {
        payload.department_id = Number(editForm.department_id);
      }
      payload.manager_id = editForm.manager_id ? Number(editForm.manager_id) : null;

      const updated = await employeesApi.update(Number(id), payload);
      setEmployee(updated);
      setIsEditing(false);
      setSuccessMsg('Employee details updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      logger.info('Employees', `Updated employee ${updated.employee_id}`);
    } catch (err: unknown) {
      logger.error('Employees', 'Failed to update employee', err);
      const errorResp = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (errorResp && typeof errorResp === 'object') {
        const newFieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(errorResp)) {
          if (Array.isArray(val)) newFieldErrors[key] = val[0];
          else if (typeof val === 'string') newFieldErrors[key] = val;
        }
        setFieldErrors(newFieldErrors);
        setFormError('Unable to update employee. Please review the highlighted fields.');
      } else {
        setFormError('Failed to update employee. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLoginAccount = async () => {
    if (!employee) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res: CreateUserResponse = await employeesApi.createUserAccount(employee.id, {
        temp_password: customTempPassword.trim() || undefined,
      });
      setShowCreateAccountModal(false);
      setCustomTempPassword('');
      setCredentialsModal({
        title: 'Login Account Created',
        subtitle: 'New portal login credentials created and linked to this employee profile.',
        employee_id: res.employee_id,
        full_name: res.full_name,
        email: res.email,
        temporary_password: res.temporary_password,
        role: res.role,
      });
      fetchEmployeeData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create login account.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res: ResetPasswordResponse = await employeesApi.resetUserPassword(employee.id, {
        temp_password: customTempPassword.trim() || undefined,
      });
      setShowResetPasswordModal(false);
      setCustomTempPassword('');
      setCredentialsModal({
        title: 'Password Reset Successful',
        subtitle: 'The login password has been reset. Provide the temporary password to the employee.',
        employee_id: res.employee_id,
        full_name: res.full_name,
        email: res.email,
        temporary_password: res.temporary_password,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reset password.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error || !employee) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>
          {error || 'Employee not found'}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="primary" size="sm" onClick={fetchEmployeeData} leftIcon={<RotateCcw size={15} />}>
            Try Again
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/employees')}>
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const hasAccount = Boolean(employee.has_user_account || employee.user);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Top action bar */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Employee Directory</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ECFDF3',
            color: '#065F46',
            border: '1px solid #D1FADF',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Profile Banner */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid #E5E9F0' }}>
        <div style={{ height: '80px', backgroundColor: 'var(--color-primary)' }}></div>
        <div style={{ padding: '0 20px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '-36px', border: '3px solid #fff', borderRadius: '50%', backgroundColor: '#fff' }}>
              <Avatar name={employee.full_name} size="lg" />
            </div>
            {user && canManageEmployees(user.role) && !isEditing && (
              <Button size="sm" style={{ marginTop: '12px' }} leftIcon={<Edit size={14} />} onClick={handleStartEditing}>
                Edit Profile
              </Button>
            )}
          </div>
          
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#172033', lineHeight: 1.2 }}>{employee.full_name}</h1>
              <Badge variant={employee.status}>{employee.status.replace('_', ' ').toUpperCase()}</Badge>
              <Badge variant="default"><Hash size={11} style={{ display: 'inline', marginRight: '4px' }}/>{employee.employee_id}</Badge>
              {hasAccount ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#ECFDF3',
                    color: '#059669',
                    border: '1px solid #D1FADF',
                  }}
                >
                  <ShieldCheck size={13} />
                  <span>Portal Active ({employee.user_role === 'super_admin' ? 'Super Admin' : employee.user_role === 'it_admin' ? 'IT Admin' : employee.user_role === 'it_support' ? 'IT Support' : 'Employee'})</span>
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FEDF89',
                  }}
                >
                  <Key size={13} />
                  <span>No Login Account</span>
                </span>
              )}
            </div>
            <p style={{ color: '#667085', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Briefcase size={14} /> {employee.job_title} · {employee.department_name}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form or Read-only Display Cards */}
      {isEditing ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '32px', border: '1px solid #E5E9F0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>Edit Employee Profile</h2>
          <p style={{ fontSize: '13px', color: '#667085', marginBottom: '24px' }}>Update company role, department, manager, and location information.</p>

          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FEE2E2',
                color: '#B42318',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Full Name *"
                value={editForm.full_name}
                error={fieldErrors.full_name}
                onChange={(e) => {
                  setEditForm({ ...editForm, full_name: e.target.value });
                  if (fieldErrors.full_name) setFieldErrors({ ...fieldErrors, full_name: '' });
                }}
              />
              <Input
                label="Job Title *"
                value={editForm.job_title}
                error={fieldErrors.job_title}
                onChange={(e) => {
                  setEditForm({ ...editForm, job_title: e.target.value });
                  if (fieldErrors.job_title) setFieldErrors({ ...fieldErrors, job_title: '' });
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value ? Number(e.target.value) : '' })}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#172033',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {safeDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                  Manager
                </label>
                <select
                  value={editForm.manager_id}
                  onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value ? Number(e.target.value) : '' })}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#172033',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">None / Reports to CEO</option>
                  {allManagers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.job_title})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Location"
                value={editForm.location}
                error={fieldErrors.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#172033', display: 'block', marginBottom: '4px' }}>
                  Employment Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Employee['status'] })}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #E5E9F0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#172033',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                  <option value="exited">Exited</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E9F0' }}>
              <Button onClick={handleUpdate} isLoading={isSaving}>
                Save Changes
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Card 1: Contact & Location */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '24px', border: '1px solid #E5E9F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '20px', borderBottom: '1px solid #E5E9F0', paddingBottom: '12px' }}>
              Contact & Location
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F5F7FA', borderRadius: '8px', color: '#667085' }}><Mail size={18} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Email</div>
                  <div style={{ color: '#172033', fontSize: '14px' }}>{employee.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F5F7FA', borderRadius: '8px', color: '#667085' }}><MapPin size={18} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Location</div>
                  <div style={{ color: '#172033', fontSize: '14px' }}>{employee.location || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Organization Info */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '24px', border: '1px solid #E5E9F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '20px', borderBottom: '1px solid #E5E9F0', paddingBottom: '12px' }}>
              Organization Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F5F7FA', borderRadius: '8px', color: '#667085' }}><Building size={18} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Department</div>
                  <div style={{ color: '#172033', fontSize: '14px' }}>{employee.department_name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F5F7FA', borderRadius: '8px', color: '#667085' }}><UserIcon size={18} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Manager</div>
                  <div style={{ color: '#172033', fontSize: '14px' }}>{employee.manager_name || 'None / Reports to CEO'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F5F7FA', borderRadius: '8px', color: '#667085' }}><Calendar size={18} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Joining Date</div>
                  <div style={{ color: '#172033', fontSize: '14px' }}>{formatDate(employee.joining_date)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: ARCO Workplace Portal Account */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '24px', border: '1px solid #E5E9F0', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E9F0', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', backgroundColor: hasAccount ? '#ECFDF3' : '#FEF3C7', borderRadius: '8px', color: hasAccount ? '#059669' : '#D97706' }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
                    ARCO Workplace Portal Account
                  </h3>
                  <p style={{ fontSize: '13px', color: '#667085', margin: '2px 0 0' }}>
                    Authentication and system access status for this employee
                  </p>
                </div>
              </div>

              {user && canManageEmployees(user.role) && (
                <div>
                  {hasAccount ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Lock size={15} />}
                      onClick={() => {
                        setActionError(null);
                        setCustomTempPassword('');
                        setShowResetPasswordModal(true);
                      }}
                    >
                      Reset Password
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<UserPlus size={15} />}
                      onClick={() => {
                        setActionError(null);
                        setCustomTempPassword('');
                        setShowCreateAccountModal(true);
                      }}
                    >
                      Create Login Account
                    </Button>
                  )}
                </div>
              )}
            </div>

            {hasAccount ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E5E9F0' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Portal Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <ShieldCheck size={16} color="#10B981" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#065F46' }}>Linked & Active</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Login Username / Email</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginTop: '4px' }}>
                    {employee.user_email || employee.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>Assigned Role</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginTop: '4px', textTransform: 'capitalize' }}>
                    {employee.user_role ? employee.user_role.replace('_', ' ') : 'Employee'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#FFFAEB', border: '1px solid #FEDF89', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertCircle size={22} color="#D97706" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>No Login Account Linked</div>
                    <div style={{ fontSize: '13px', color: '#B54708' }}>This employee cannot currently log into ARCO Workplace or submit tickets.</div>
                  </div>
                </div>
                {user && canManageEmployees(user.role) && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus size={15} />}
                    onClick={() => {
                      setActionError(null);
                      setCustomTempPassword('');
                      setShowCreateAccountModal(true);
                    }}
                  >
                    Create Login Account
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Create Login Account ──────────────────────────────────── */}
      {showCreateAccountModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E5E9F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>Create Portal Login Account</h3>
              </div>
              <button
                onClick={() => setShowCreateAccountModal(false)}
                style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {actionError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#B42318', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {actionError}
                </div>
              )}

              <div style={{ fontSize: '13px', color: '#475467', lineHeight: '1.5' }}>
                This will create a linked login account for <strong>{employee.full_name}</strong> using email <strong>{employee.email}</strong> with the <strong>Employee</strong> role.
              </div>

              <div style={{ fontSize: '12px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #B2CCFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={14} style={{ flexShrink: 0 }} />
                <span>A strong temporary password will be auto-generated and shown on the next screen. Or specify a custom temporary password below.</span>
              </div>

              <PasswordInput
                label="Custom Temporary Password (Optional)"
                placeholder="Leave blank to auto-generate secure password"
                value={customTempPassword}
                onChange={(e) => setCustomTempPassword(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #E5E9F0' }}>
                <Button variant="ghost" onClick={() => setShowCreateAccountModal(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateLoginAccount} isLoading={actionLoading}>
                  Create & Link Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ────────────────────────────────────────── */}
      {showResetPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E5E9F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>Reset Employee Password</h3>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {actionError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#B42318', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {actionError}
                </div>
              )}

              <div style={{ fontSize: '13px', color: '#475467', lineHeight: '1.5' }}>
                Are you sure you want to reset the password for <strong>{employee.full_name}</strong> ({employee.email})?
              </div>

              <div style={{ fontSize: '12px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #B2CCFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={14} style={{ flexShrink: 0 }} />
                <span>A new strong temporary password will be auto-generated and shown on the next screen. Or specify a custom temporary password below.</span>
              </div>

              <PasswordInput
                label="Custom Temporary Password (Optional)"
                placeholder="Leave blank to auto-generate secure password"
                value={customTempPassword}
                onChange={(e) => setCustomTempPassword(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #E5E9F0' }}>
                <Button variant="ghost" onClick={() => setShowResetPasswordModal(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleResetPassword} isLoading={actionLoading}>
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Display Generated Credentials Modal ──────────────────────────── */}
      {credentialsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: '#ECFDF3', borderBottom: '1px solid #D1FADF', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#065F46', margin: 0 }}>{credentialsModal.title}</h3>
                <p style={{ fontSize: '13px', color: '#047857', margin: '2px 0 0' }}>{credentialsModal.subtitle}</p>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E9F0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Employee</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>{credentialsModal.full_name} ({credentialsModal.employee_id})</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Login Email / Username</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#172033' }}>{credentialsModal.email}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={copiedField === 'email' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.email);
                      setCopiedField('email');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                  >
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                {credentialsModal.temporary_password && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Temporary Password</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#172033', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                        {credentialsModal.temporary_password}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={copiedField === 'password' ? <Check size={14} color="#fff" /> : <Copy size={14} />}
                      onClick={() => {
                        if (credentialsModal.temporary_password) {
                          navigator.clipboard.writeText(credentialsModal.temporary_password);
                          setCopiedField('password');
                          setTimeout(() => setCopiedField(null), 2000);
                        }
                      }}
                    >
                      {copiedField === 'password' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E9F0', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#667085', fontWeight: 600, letterSpacing: '0.5px' }}>Portal Login URL</div>
                    <div style={{ fontSize: '13px', color: '#2563EB' }}>{window.location.origin}/login</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={copiedField === 'url' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/login`);
                      setCopiedField('url');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                  >
                    {copiedField === 'url' ? 'Copied' : 'Copy URL'}
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#667085', lineHeight: '1.5' }}>
                <Info size={14} color="#2563EB" />
                <span>Share these credentials securely with the employee. They can use them to log into the portal.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => setCredentialsModal(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
