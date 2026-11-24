import React from 'react';
import { Search, X } from 'lucide-react';
import { DateRangeFilter } from '../DateRangeFilter';
import { Button } from '../../ui/Button';

export interface TableTopBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
  showDateFilter?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  extraActions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const TableTopBar: React.FC<TableTopBarProps> = ({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  startDate = '',
  endDate = '',
  onDateChange,
  showDateFilter = true,
  hasActiveFilters = false,
  onResetFilters,
  extraActions,
  style,
}) => {
  return (
    <div
      className="filter-toolbar-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #E5E9F0',
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
        ...style,
      }}
    >
      {/* Global Search Input */}
      {onSearchChange ? (
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '440px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#98A2B3',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              height: '34px',
              paddingLeft: '32px',
              paddingRight: search ? '28px' : '10px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#98A2B3',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Right side controls: Date Filter, Extra Actions & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {showDateFilter && onDateChange && (
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={onDateChange}
          />
        )}

        {extraActions}

        {hasActiveFilters && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            style={{ fontSize: '12px', color: '#667085', height: '34px', padding: '0 8px' }}
          >
            Reset All
          </Button>
        )}
      </div>
    </div>
  );
};
