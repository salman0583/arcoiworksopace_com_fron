import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { CheckCircle2, Copy, Check, Info, ShieldCheck, ExternalLink, X } from 'lucide-react';

export interface CreatedCredentials {
  employee_id: string;
  full_name: string;
  email: string;
  temporary_password?: string;
  role?: string;
}

interface CreatedCredentialsModalProps {
  credentials: CreatedCredentials | null;
  onClose: () => void;
}

export const CreatedCredentialsModal: React.FC<CreatedCredentialsModalProps> = ({
  credentials,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<'password' | 'email' | 'url' | null>(null);

  // Keyboard Escape listener & background scroll lock
  useEffect(() => {
    if (!credentials) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [credentials, onClose]);

  if (!credentials) return null;

  const loginUrl = `${window.location.origin}/login`;

  const copyToClipboard = (text: string, field: 'password' | 'email' | 'url') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((curr) => (curr === field ? null : curr));
    }, 2000);
  };

  return (
    <div
      className="credentials-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-modal-title"
    >
      <div className="credentials-modal-dialog">
        {/* Banner Header */}
        <div className="credentials-modal-banner">
          <div className="credentials-modal-icon">
            <CheckCircle2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 id="credentials-modal-title" style={{ fontSize: '17px', fontWeight: 600, color: '#065F46', margin: 0 }}>
              Login Account Created Successfully
            </h3>
            <p style={{ fontSize: '13px', color: '#047857', margin: '3px 0 0', lineHeight: 1.4 }}>
              Initial login access has been provisioned. Share these credentials securely with the employee.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#047857',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close dialog"
            aria-label="Close credentials dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Credentials Details */}
        <div className="credentials-modal-body">
          <div className="credentials-meta-card">
            {/* Employee Name & Tag */}
            <div>
              <div className="credentials-label">Employee</div>
              <div className="credentials-value" style={{ fontSize: '15px' }}>
                {credentials.full_name}{' '}
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#475569',
                    backgroundColor: '#E2E8F0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginLeft: '4px',
                  }}
                >
                  {credentials.employee_id}
                </span>
              </div>
            </div>

            {/* Email / Username */}
            <div className="credentials-row credentials-row-divider">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="credentials-label">Login Email / Username</div>
                <div className="credentials-value cell-truncate-1">{credentials.email}</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copiedField === 'email' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                onClick={() => copyToClipboard(credentials.email, 'email')}
              >
                {copiedField === 'email' ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Temporary Password */}
            {credentials.temporary_password && (
              <div className="credentials-row credentials-row-divider">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="credentials-label">Temporary Password</div>
                  <div>
                    <span className="credentials-pwd-value">
                      {credentials.temporary_password}
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={copiedField === 'password' ? <Check size={14} color="#fff" /> : <Copy size={14} />}
                  onClick={() => copyToClipboard(credentials.temporary_password!, 'password')}
                >
                  {copiedField === 'password' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}

            {/* Portal URL */}
            <div className="credentials-row credentials-row-divider">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="credentials-label">Portal Login URL</div>
                <div className="credentials-value" style={{ color: '#2563EB', fontSize: '13px' }}>
                  <a
                    href={loginUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>{loginUrl}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copiedField === 'url' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                onClick={() => copyToClipboard(loginUrl, 'url')}
              >
                {copiedField === 'url' ? 'Copied' : 'Copy URL'}
              </Button>
            </div>
          </div>

          {/* Security Advisory */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#475569',
              lineHeight: 1.5,
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <ShieldCheck size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Security Policy:</strong> This temporary password is displayed once and is not stored in plaintext. The employee will have the default{' '}
              <strong>Employee</strong> role and will be prompted to set a private password upon initial sign-in.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Button variant="primary" onClick={onClose} style={{ minWidth: '100px' }}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
