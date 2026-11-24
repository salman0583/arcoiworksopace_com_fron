import React, { useState } from 'react';

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
}

const sizeMap = {
  xs: { width: '24px', height: '24px', fontSize: '11px' },
  sm: { width: '32px', height: '32px', fontSize: '13px' },
  md: { width: '40px', height: '40px', fontSize: '15px' },
  lg: { width: '56px', height: '56px', fontSize: '20px' },
};

const AVATAR_PALETTE = [
  '#2563EB', // Blue
  '#0D9488', // Teal
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#7C3AED', // Purple
  '#C026D3', // Fuchsia
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#16A34A', // Green
  '#475569', // Slate
];

const getDeterministicColor = (str: string) => {
  if (!str) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  style,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const safeName = name ? String(name).trim() : '';

  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const backgroundColor = getDeterministicColor(safeName);
  const { width, height, fontSize } = sizeMap[size] || sizeMap.md;

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={safeName || 'User'}
        onError={() => setImageError(true)}
        className={className}
        style={{
          width,
          height,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid #E5E9F0',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        borderRadius: '50%',
        backgroundColor,
        color: '#FFFFFF',
        fontSize,
        fontWeight: 600,
        textTransform: 'uppercase',
        flexShrink: 0,
        userSelect: 'none',
        letterSpacing: '0.02em',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
        ...style,
      }}
      title={safeName || 'User'}
    >
      {getInitials(safeName)}
    </div>
  );
};
