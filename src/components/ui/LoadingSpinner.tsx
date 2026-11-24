import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  minHeight?: string | number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', minHeight = '200px' }) => {
  const dimension = size === 'sm' ? 24 : size === 'lg' ? 48 : 36;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', minHeight }}>
      <div className="spinner" style={{ width: `${dimension}px`, height: `${dimension}px` }} />
    </div>
  );
};
