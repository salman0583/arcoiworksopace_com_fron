import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Clock } from 'lucide-react';

export const ComingSoon: React.FC<{ moduleName: string }> = ({ moduleName }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '40px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '24px' }}>
        <Clock size={40} />
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#172033', marginBottom: '8px' }}>{moduleName}</h2>
      <p style={{ color: '#667085', fontSize: '16px', maxWidth: '400px', marginBottom: '32px' }}>
        This module is currently in development and will be available in a future phase of the ARCO Workplace platform.
      </p>
      <Button onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
};
