import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';

export const SessionWarningModal: React.FC = () => {
  const { showSessionWarning, sessionRemainingSeconds, continueSession, logout } = useAuth();

  if (!showSessionWarning) return null;

  const minutes = Math.floor(sessionRemainingSeconds / 60);
  const seconds = sessionRemainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 23, 57, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E5E9F0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Clock size={28} />
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>
          Session Inactivity Warning
        </h3>

        <p style={{ fontSize: '14px', color: '#667085', lineHeight: 1.5, marginBottom: '20px' }}>
          You have been inactive for some time. For your security, your session will automatically expire in:
        </p>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '2px dashed #E5E9F0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: sessionRemainingSeconds <= 60 ? '#DC2626' : '#172033',
              letterSpacing: '2px',
            }}
          >
            {formattedTime}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            onClick={logout}
            leftIcon={<LogOut size={16} />}
            style={{ flex: 1 }}
          >
            Sign Out
          </Button>
          <Button
            variant="primary"
            onClick={continueSession}
            leftIcon={<ShieldAlert size={16} />}
            style={{ flex: 1 }}
          >
            Continue Session
          </Button>
        </div>
      </div>
    </div>
  );
};
