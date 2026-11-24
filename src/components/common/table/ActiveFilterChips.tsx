import React from 'react';
import { X } from 'lucide-react';

export interface ActiveFilterItem {
  id: string;
  label?: string;
  value: string;
  onRemove: () => void;
}

export interface ActiveFilterChipsProps {
  filters: ActiveFilterItem[];
  onClearAll: () => void;
  style?: React.CSSProperties;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onClearAll,
  style,
}) => {
  const activeFilters = filters.filter((f) => f && f.value);

  if (activeFilters.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        padding: '2px 4px',
        fontSize: '12px',
        ...style,
      }}
    >
      <span style={{ color: '#667085', fontWeight: 500, marginRight: '2px' }}>Filtered by:</span>

      {activeFilters.map((filter) => (
        <span
          key={filter.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1E40AF',
            padding: '2px 8px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {filter.label ? `${filter.label}: ` : ''}
          <span style={{ fontWeight: 600 }}>{filter.value}</span>
          <X
            size={12}
            style={{ cursor: 'pointer', opacity: 0.75, transition: 'opacity 0.1s' }}
            onClick={filter.onRemove}
            onMouseEnter={(e) => ((e.currentTarget as unknown as HTMLElement).style.opacity = '1')}
            onMouseLeave={(e) => ((e.currentTarget as unknown as HTMLElement).style.opacity = '0.75')}
          />
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563EB',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          textDecoration: 'underline',
          padding: '2px 6px',
        }}
      >
        Clear all
      </button>
    </div>
  );
};
