import React, { useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface ToolbarFilterPopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeCount?: number;
  title?: string;
  hasFiltersToReset?: boolean;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
  width?: string;
}

export const filterFieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '4px',
};

export const filterFieldSelectStyle: React.CSSProperties = {
  width: '100%',
  height: '34px',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #D0D5DD',
  fontSize: '13px',
  backgroundColor: '#FFFFFF',
  color: '#101828',
  outline: 'none',
  boxSizing: 'border-box',
};

export const ToolbarFilterPopover: React.FC<ToolbarFilterPopoverProps> = ({
  isOpen,
  onToggle,
  onClose,
  activeCount = 0,
  title = 'Filters',
  hasFiltersToReset = false,
  onApply,
  onReset,
  children,
  width = '320px',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const isActive = activeCount > 0;

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '34px',
          padding: '0 12px',
          borderRadius: '6px',
          border: isActive ? '1px solid #2563EB' : '1px solid #E5E9F0',
          backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
          color: isActive ? '#1E40AF' : '#344054',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
        aria-expanded={isOpen}
      >
        <Filter size={14} color={isActive ? '#2563EB' : '#667085'} />
        <span>Filters</span>
        {isActive && (
          <span
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="toolbar-filter-popover-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '6px',
            width,
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E9F0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
            zIndex: 100,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #F2F4F7',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#172033' }}>
              {title}
            </span>
            {hasFiltersToReset && (
              <button
                type="button"
                onClick={onReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Reset All
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {children}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid #F2F4F7',
            }}
          >
            <Button
              size="sm"
              variant="primary"
              onClick={onApply}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
