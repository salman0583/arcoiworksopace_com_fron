import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

export type ExpiryPreset =
  | 'all'
  | 'this_week'
  | 'this_month'
  | 'next_30_days'
  | 'next_90_days'
  | 'expired'
  | 'custom';

interface SoftwareExpiryDateFilterProps {
  preset?: ExpiryPreset;
  startDate?: string;
  endDate?: string;
  onChange: (preset: ExpiryPreset, startDate: string, endDate: string) => void;
  style?: React.CSSProperties;
}

export const SoftwareExpiryDateFilter: React.FC<SoftwareExpiryDateFilterProps> = ({
  preset = 'all',
  startDate = '',
  endDate = '',
  onChange,
  style,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExpiryPreset>(preset);
  const [customStart, setCustomStart] = useState<string>(startDate);
  const [customEnd, setCustomEnd] = useState<string>(endDate);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreset(preset);
  }, [preset]);

  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  const handlePresetChange = (newPreset: ExpiryPreset) => {
    setSelectedPreset(newPreset);
    setValidationError(null);

    if (newPreset === 'all') {
      setCustomStart('');
      setCustomEnd('');
      onChange('all', '', '');
      return;
    }

    if (newPreset === 'custom') {
      if (customStart && customEnd && customStart > customEnd) {
        setValidationError('From Date cannot be after To Date');
      } else {
        onChange('custom', customStart, customEnd);
      }
      return;
    }

    // Presets: this_week, this_month, next_30_days, next_90_days, expired
    setCustomStart('');
    setCustomEnd('');
    onChange(newPreset, '', '');
  };

  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    setSelectedPreset('custom');
    if (val && customEnd && val > customEnd) {
      setValidationError('From Date cannot be after To Date');
    } else {
      setValidationError(null);
      onChange('custom', val, customEnd);
    }
  };

  const handleCustomEndChange = (val: string) => {
    setCustomEnd(val);
    setSelectedPreset('custom');
    if (customStart && val && customStart > val) {
      setValidationError('From Date cannot be after To Date');
    } else {
      setValidationError(null);
      onChange('custom', customStart, val);
    }
  };

  const handleClear = () => {
    setSelectedPreset('all');
    setCustomStart('');
    setCustomEnd('');
    setValidationError(null);
    onChange('all', '', '');
  };

  const isCustomVisible = selectedPreset === 'custom';
  const hasActiveFilter = selectedPreset !== 'all' || startDate !== '' || endDate !== '';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', ...style }}>
      {/* Expiry Preset Selector */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value as ExpiryPreset)}
          style={{
            height: '34px',
            paddingLeft: '30px',
            paddingRight: '12px',
            borderRadius: '6px',
            border: hasActiveFilter ? '1px solid #2563EB' : '1px solid #E5E9F0',
            fontSize: '13px',
            backgroundColor: hasActiveFilter ? '#EFF6FF' : '#FFFFFF',
            color: hasActiveFilter ? '#175CD3' : '#475467',
            fontWeight: hasActiveFilter ? 600 : 400,
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <option value="all">Expiry Date: All Time</option>
          <option value="this_week">Expiry Date: This Week</option>
          <option value="this_month">Expiry Date: This Month</option>
          <option value="next_30_days">Expiry Date: Next 30 Days</option>
          <option value="next_90_days">Expiry Date: Next 90 Days</option>
          <option value="expired">Expiry Date: Expired</option>
          <option value="custom">Expiry Date: Custom Range...</option>
        </select>
        <Calendar
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            pointerEvents: 'none',
            color: hasActiveFilter ? '#2563EB' : '#98A2B3',
          }}
        />
      </div>

      {/* Custom Start / End Inputs */}
      {isCustomVisible && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            placeholder="From Date"
            value={customStart}
            onChange={(e) => handleCustomStartChange(e.target.value)}
            style={{
              height: '34px',
              padding: '0 8px',
              borderRadius: '6px',
              border: validationError ? '1px solid #EF4444' : '1px solid #E5E9F0',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#172033',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>→</span>
          <input
            type="date"
            placeholder="To Date"
            value={customEnd}
            onChange={(e) => handleCustomEndChange(e.target.value)}
            style={{
              height: '34px',
              padding: '0 8px',
              borderRadius: '6px',
              border: validationError ? '1px solid #EF4444' : '1px solid #E5E9F0',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#172033',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Validation alert if invalid custom range */}
      {validationError && (
        <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>
          {validationError}
        </span>
      )}

      {hasActiveFilter && (
        <button
          type="button"
          onClick={handleClear}
          title="Reset Expiry Date to All Time"
          style={{
            height: '34px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            background: 'none',
            border: 'none',
            color: '#98A2B3',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
