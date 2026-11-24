import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Avatar, Badge, Button, PasswordInput } from '../components/ui';
import { roleLabels } from '../utils/auth';
import { formatDate } from '../utils/formatters';
import {
  Mail,
  Shield,
  Building,
  Briefcase,
  MapPin,
  Calendar,
  Hash,
  CheckCircle2,
  Ticket,
  Laptop,
  Layers,
  FileText,
  Users,
  Activity,
  ArrowRight,
  Lock,
  Key,
  X,
  AlertCircle
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  if (!user) return null;

  const isITStaff = ['it_support', 'it_admin', 'super_admin'].includes(user.role);
  const isITAdmin = ['it_admin', 'super_admin'].includes(user.role);

  const defaultDept =
    user.department_name ||
    (user.role === 'super_admin'
      ? 'Executive Administration'
      : user.role === 'employee'
      ? 'Corporate Operations'
      : 'IT Engineering');

  const defaultJobTitle =
    user.job_title ||
    (user.role === 'super_admin'
      ? 'Super Administrator'
      : user.role === 'it_admin'
      ? 'IT Systems Administrator'
      : user.role === 'it_support'
      ? 'IT Support Specialist'
      : 'Corporate Employee');

  const defaultLocation = user.location || 'Hyderabad, Telangana, India';
  const employeeIdDisplay = user.employee_id || `ARCO-${user.role.toUpperCase().slice(0, 3)}-${String(user.id).padStart(3, '0')}`;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (!currentPassword) {
      setPwError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setPwError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPwError('New password must be different from current password.');
      return;
    }

    setPwLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      setPwSuccess('Password changed successfully.');
      setTimeout(() => setPwSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password. Please try again.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Top Notification Banner */}
      {pwSuccess && (
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
          <span>{pwSuccess}</span>
        </div>
      )}

      {/* Top Profile Banner Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          border: '1px solid #E5E9F0',
        }}
      >
        <div
          style={{
            height: '80px',
            background: 'linear-gradient(135deg, #172033 0%, #0F2D59 100%)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Shield size={16} />
            <span>ARCO Verified Identity</span>
          </div>
        </div>

        <div style={{ padding: '0 20px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div
              style={{
                marginTop: '-36px',
                border: '3px solid #FFFFFF',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'inline-block',
              }}
            >
              <Avatar name={user.full_name} size="lg" />
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                leftIcon={<ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2
                data-testid="profile-user-name"
                className="profile-user-name"
                style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#172033', lineHeight: 1.2 }}
              >
                {user.full_name}
              </h2>
              <Badge variant={user.role} size="sm">
                {roleLabels[user.role]}
              </Badge>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#059669',
                  backgroundColor: '#ECFDF3',
                  border: '1px solid #D1FADF',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                <CheckCircle2 size={12} color="#10B981" />
                Active Account
              </span>
            </div>
            <p style={{ color: '#667085', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} />
              <span>{defaultJobTitle}</span>
              <span>•</span>
              <span>{defaultDept}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout: Account Overview & Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Account Details Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-sm)',
            padding: '16px',
            border: '1px solid #E5E9F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E9F0', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#2563EB" />
              Account & Security
            </h2>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Key size={13} />}
              onClick={() => {
                setPwError(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(true);
              }}
            >
              Change Password
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Mail size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Email Address</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500, wordBreak: 'break-all' }}>{user.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Shield size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Assigned Role</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{roleLabels[user.role]}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Calendar size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Member Since</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{formatDate(user.date_joined)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <CheckCircle2 size={15} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Account Status</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>Active (Authenticated)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization / Workstation Info Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-sm)',
            padding: '16px',
            border: '1px solid #E5E9F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E9F0', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} color="#2563EB" />
              Workstation & Organization
            </h2>
            <span style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>ARCO Workplace</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Hash size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Employee Code / Identifier</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{employeeIdDisplay}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Building size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Department</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{defaultDept}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <Briefcase size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Designation / Title</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{defaultJobTitle}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', backgroundColor: '#F5F7FA', borderRadius: '6px', color: '#667085' }}>
                <MapPin size={15} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Office Location</div>
                <div style={{ color: '#172033', fontSize: '13px', fontWeight: 500 }}>{defaultLocation}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation & Workstation Shortcuts */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-sm)',
            padding: '16px',
            border: '1px solid #E5E9F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E9F0', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#2563EB" />
              Quick Shortcuts & Modules
            </h2>
            <span style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>Role Access</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#B2CCFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E5E9F0';
              }}
            >
              <Ticket size={15} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>Tickets</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(user.role === 'employee' ? '/my-assets' : '/assets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#B2CCFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E5E9F0';
              }}
            >
              <Laptop size={15} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>
                {user.role === 'employee' ? 'My Assets' : 'Assets'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate(user.role === 'employee' ? '/my-software' : '/software')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#B2CCFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E5E9F0';
              }}
            >
              <Layers size={15} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>
                {user.role === 'employee' ? 'My Software' : 'Software'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/service-requests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#B2CCFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E5E9F0';
              }}
            >
              <FileText size={15} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>Requests</span>
            </button>

            {isITStaff && (
              <button
                type="button"
                onClick={() => navigate('/employees')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#B2CCFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E5E9F0';
                }}
              >
                <Users size={15} color="#2563EB" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>Directory</span>
              </button>
            )}

            {isITAdmin && (
              <button
                type="button"
                onClick={() => navigate('/audit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E5E9F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#B2CCFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E5E9F0';
                }}
              >
                <Activity size={15} color="#2563EB" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#172033' }}>Audit Logs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Change Password ───────────────────────────────────────── */}
      {showPasswordModal && (
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
              borderRadius: '8px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #E5E9F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>Change Account Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: '#667085', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pwError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEE2E2', color: '#B42318', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
                  <AlertCircle size={15} color="#DC2626" />
                  <span>{pwError}</span>
                </div>
              )}

              <PasswordInput
                label="Current Password *"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <PasswordInput
                label="New Password *"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <PasswordInput
                label="Confirm New Password *"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', paddingTop: '14px', borderTop: '1px solid #E5E9F0' }}>
                <Button variant="ghost" type="button" onClick={() => setShowPasswordModal(false)} disabled={pwLoading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={pwLoading}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
