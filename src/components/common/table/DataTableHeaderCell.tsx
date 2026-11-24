import React from 'react';
import { ChevronsUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

export interface DataTableHeaderCellProps {
  title: string | React.ReactNode;
  sortField?: string;
  currentSortField?: string;
  sortDirection?: 'asc' | 'desc' | '';
  onSortToggle?: (field: string) => void;
  filterActive?: boolean;
  filterOpen?: boolean;
  onFilterToggle?: (e: React.MouseEvent) => void;
  filterTitle?: string;
  filterPopover?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  isSticky?: boolean;
  stickyLeft?: string | number;
  stickyRight?: string | number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export const DataTableHeaderCell: React.FC<DataTableHeaderCellProps> = ({
  title,
  sortField,
  currentSortField,
  sortDirection,
  onSortToggle,
  filterActive = false,
  filterOpen = false,
  onFilterToggle,
  filterTitle,
  filterPopover,
  align = 'left',
  width,
  minWidth,
  maxWidth,
  isSticky = false,
  stickyLeft,
  stickyRight,
  style,
  className,
  children,
}) => {
  const isSortActive = !!sortField && currentSortField === sortField;
  const isHorizontallyPinned = isSticky || stickyLeft !== undefined || stickyRight !== undefined;

  const thStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: filterOpen ? 50 : isHorizontallyPinned ? 25 : 20,
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E5E9F0',
    color: '#667085',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    padding: '8px 12px',
    textAlign: align,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(width ? { width } : {}),
    ...(minWidth ? { minWidth } : {}),
    ...(maxWidth ? { maxWidth } : {}),
    ...(stickyLeft !== undefined ? { left: stickyLeft } : {}),
    ...(stickyRight !== undefined ? { right: stickyRight } : {}),
    ...style,
  };

  const renderSortIcon = () => {
    if (!sortField) return null;
    if (isSortActive) {
      if (sortDirection === 'asc') return <ArrowUp size={12} color="#2563EB" style={{ flexShrink: 0 }} />;
      if (sortDirection === 'desc') return <ArrowDown size={12} color="#2563EB" style={{ flexShrink: 0 }} />;
    }
    return null;
  };

  return (
    <th style={thStyle} className={className}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'space-between',
          gap: '4px',
          width: '100%',
        }}
      >
        {/* Left/Main: Title and Sort Trigger */}
        {sortField && onSortToggle ? (
          <div
            onClick={() => onSortToggle(sortField)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isSortActive ? '#175CD3' : '#667085',
              fontWeight: isSortActive ? 700 : 600,
              transition: 'color 0.15s ease',
            }}
            title={typeof title === 'string' ? `Sort by ${title}` : 'Sort column'}
          >
            <span>{title}</span>
            {renderSortIcon()}
          </div>
        ) : (
          <span style={{ color: '#667085', fontWeight: 600 }}>{title}</span>
        )}

        {/* Right: Funnel Filter Button & Anchored Popover */}
        {onFilterToggle && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFilterToggle(e);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                padding: 0,
                background: filterActive ? '#EFF6FF' : filterOpen ? '#F2F4F7' : 'transparent',
                border: filterActive ? '1px solid #BFDBFE' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                color: filterActive ? '#2563EB' : '#98A2B3',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              title={filterTitle || (typeof title === 'string' ? `Filter by ${title}` : 'Filter column')}
              aria-label={filterTitle || (typeof title === 'string' ? `Filter by ${title}` : 'Filter column')}
              aria-expanded={filterOpen}
            >
              <Filter size={12} />
              {filterActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                  }}
                />
              )}
            </button>

            {filterOpen && filterPopover}
          </div>
        )}

        {children}
      </div>
    </th>
  );
};
