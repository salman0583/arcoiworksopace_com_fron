import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Search } from 'lucide-react';

export interface FilterPopoverOption {
  key: string | number;
  label: string | React.ReactNode;
  badge?: React.ReactNode;
  count?: number;
}

export interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  options?: FilterPopoverOption[];
  selectedValue?: string | number | (string | number)[];
  selectedKey?: string | number;
  onSelect?: (key: any) => void;
  isMultiSelect?: boolean;
  autoCloseOnSelect?: boolean;
  showFooter?: boolean;
  onClear?: () => void;
  onApply?: (value?: any) => void;
  align?: 'left' | 'right';
  minWidth?: string | number;
  maxWidth?: string | number;
  children?: React.ReactNode;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  searchable = false,
  searchPlaceholder = 'Search options...',
  searchValue,
  onSearchChange,
  options,
  selectedValue,
  selectedKey,
  onSelect,
  isMultiSelect = false,
  autoCloseOnSelect = false,
  showFooter = true,
  onClear,
  onApply,
  align = 'right',
  minWidth = '220px',
  maxWidth = '300px',
  children,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const [horizontalShift, setHorizontalShift] = useState<number>(0);

  // Cleanly separate temporary draft selection from parent applied state
  const getAppliedValue = useCallback(() => {
    if (selectedValue !== undefined) return selectedValue;
    if (selectedKey !== undefined) return selectedKey;
    return isMultiSelect ? [] : '';
  }, [selectedValue, selectedKey, isMultiSelect]);

  const [draftValue, setDraftValue] = useState<string | number | (string | number)[]>(getAppliedValue);

  // Synchronize draft value with applied value whenever popover opens
  useEffect(() => {
    if (isOpen) {
      setDraftValue(getAppliedValue());
      setInternalSearch('');
    }
  }, [isOpen, getAppliedValue]);

  // Smart boundary collision detection & auto-clamping
  const updatePosition = useCallback(() => {
    if (!popoverRef.current) return;
    const popoverElem = popoverRef.current;
    const rect = popoverElem.getBoundingClientRect();

    // Find nearest scroll viewport, table card, or fallback to viewport boundaries
    const container =
      popoverElem.closest('.table-scroll-viewport') ||
      popoverElem.closest('.data-table-card') ||
      popoverElem.closest('table') ||
      document.body;
    const containerRect = container.getBoundingClientRect();

    const minLeft = Math.max(containerRect.left + 8, 8);
    const maxRight = Math.min(containerRect.right - 8, window.innerWidth - 8);

    const unshiftedLeft = rect.left - horizontalShift;
    const unshiftedRight = rect.right - horizontalShift;

    let shift = 0;
    if (unshiftedLeft < minLeft) {
      shift = minLeft - unshiftedLeft;
    } else if (unshiftedRight > maxRight) {
      shift = maxRight - unshiftedRight;
    }

    setHorizontalShift(shift);
  }, [horizontalShift]);

  useEffect(() => {
    if (isOpen) {
      // Calculate immediately and on next frame to ensure accurate rendered width
      updatePosition();
      const raf = requestAnimationFrame(updatePosition);

      const handleResizeOrScroll = () => {
        updatePosition();
      };

      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, true);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll, true);
      };
    } else {
      setHorizontalShift(0);
    }
  }, [isOpen, updatePosition]);

  // Handle outside click and Escape key to close popover without committing draft
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOptionSelected = (key: string | number): boolean => {
    if (Array.isArray(draftValue)) {
      return draftValue.map(String).includes(String(key));
    }
    return String(draftValue) === String(key);
  };

  const handleOptionClick = (key: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isMultiSelect) {
      const currentArr = Array.isArray(draftValue) ? [...draftValue] : [];
      const nextArr = currentArr.map(String).includes(String(key))
        ? currentArr.filter((k) => String(k) !== String(key))
        : [...currentArr, key];
      setDraftValue(nextArr);
    } else {
      setDraftValue(key);
      if (autoCloseOnSelect) {
        if (onSelect) onSelect(key);
        if (onApply) onApply(key);
        onClose();
      }
    }
  };

  const handleApply = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onSelect) {
      onSelect(draftValue);
    }
    if (onApply) {
      onApply(draftValue);
    }
    onClose();
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const emptyVal = isMultiSelect ? [] : '';
    setDraftValue(emptyVal);
    if (onClear) {
      onClear();
    } else if (onSelect) {
      onSelect(emptyVal);
    }
    if (onApply) {
      onApply(emptyVal);
    }
    onClose();
  };

  const showSearch = Boolean(searchable || onSearchChange);
  const currentSearchText = searchValue !== undefined ? searchValue : internalSearch;
  const handleSearchInputChange = (text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    } else {
      setInternalSearch(text);
    }
  };

  const filteredOptions = options
    ? options.filter((opt) => {
        if (!currentSearchText.trim()) return true;
        const labelStr = typeof opt.label === 'string' ? opt.label : String(opt.key);
        return labelStr.toLowerCase().includes(currentSearchText.toLowerCase());
      })
    : [];

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        ...(align === 'left' ? { left: 0 } : { right: 0 }),
        transform: horizontalShift !== 0 ? `translateX(${horizontalShift}px)` : undefined,
        zIndex: 1000,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E9F0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        minWidth: minWidth || '240px',
        maxWidth: maxWidth || '320px',
        width: 'max-content',
        padding: '8px',
        textTransform: 'none',
        fontWeight: 400,
        color: '#1F2937',
        cursor: 'default',
        boxSizing: 'border-box',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 600,
          color: '#475467',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          paddingBottom: '6px',
          marginBottom: '6px',
          borderBottom: '1px solid #F2F4F7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            color: '#98A2B3',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Close filter"
          aria-label="Close filter"
        >
          <X size={13} />
        </button>
      </div>

      {/* Optional Search */}
      {showSearch && (
        <div style={{ position: 'relative', marginBottom: '6px' }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#98A2B3',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={currentSearchText}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            style={{
              width: '100%',
              height: '28px',
              paddingLeft: '26px',
              paddingRight: currentSearchText ? '24px' : '8px',
              borderRadius: '5px',
              border: '1px solid #E5E9F0',
              fontSize: '11px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            autoFocus
          />
          {currentSearchText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSearchInputChange('');
              }}
              style={{
                position: 'absolute',
                right: '6px',
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
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Content / Options */}
      {children ? (
        children
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 8px', textAlign: 'center', color: '#98A2B3', fontSize: '11px' }}>
              No matches found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = isOptionSelected(opt.key);
              return (
                <div
                  key={String(opt.key)}
                  onClick={(e) => handleOptionClick(opt.key, e)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    color: isSelected ? '#1D4ED8' : '#344054',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background-color 0.1s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0, marginRight: '8px' }}>
                    {opt.badge}
                    <span
                      title={typeof opt.label === 'string' ? opt.label : undefined}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {opt.label}
                    </span>
                    {opt.count !== undefined && (
                      <span style={{ fontSize: '11px', color: '#98A2B3', flexShrink: 0 }}>({opt.count})</span>
                    )}
                  </div>
                  {isSelected && <Check size={14} color="#2563EB" style={{ flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div
          style={{
            borderTop: '1px solid #F2F4F7',
            marginTop: '6px',
            paddingTop: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#667085',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            Clear filter
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '4px 10px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#2563EB')}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};
