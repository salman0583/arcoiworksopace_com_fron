import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom' | 'yesterday' | 'last_7_days' | 'last_30_days';

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate: string, endDate: string) => void;
  style?: React.CSSProperties;
}

const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate = '',
  endDate = '',
  onChange,
  style,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState<string>(startDate);
  const [customEnd, setCustomEnd] = useState<string>(endDate);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync preset if external dates change or on mount
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);

    if (!startDate && !endDate) {
      setSelectedPreset('all');
      setValidationError(null);
      return;
    }

    const today = new Date();
    const todayStr = formatDateStr(today);

    if (startDate === todayStr && endDate === todayStr) {
      setSelectedPreset('today');
      setValidationError(null);
      return;
    }

    const mondayStr = formatDateStr(getMondayOfWeek(today));
    if (startDate === mondayStr && (endDate === todayStr || endDate >= mondayStr)) {
      setSelectedPreset('this_week');
      setValidationError(null);
      return;
    }

    const firstDayThisMonth = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDayThisMonth = formatDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    if (startDate === firstDayThisMonth && (endDate === todayStr || endDate === lastDayThisMonth)) {
      setSelectedPreset('this_month');
      setValidationError(null);
      return;
    }

    const firstDayLastMonth = formatDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const lastDayLastMonth = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
    if (startDate === firstDayLastMonth && endDate === lastDayLastMonth) {
      setSelectedPreset('last_month');
      setValidationError(null);
      return;
    }

    setSelectedPreset('custom');
  }, [startDate, endDate]);

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedPreset(preset);
    setValidationError(null);
    const today = new Date();
    const todayStr = formatDateStr(today);

    if (preset === 'all') {
      setCustomStart('');
      setCustomEnd('');
      onChange('', '');
      return;
    }

    if (preset === 'today') {
      setCustomStart(todayStr);
      setCustomEnd(todayStr);
      onChange(todayStr, todayStr);
      return;
    }

    if (preset === 'this_week') {
      const mondayStr = formatDateStr(getMondayOfWeek(today));
      setCustomStart(mondayStr);
      setCustomEnd(todayStr);
      onChange(mondayStr, todayStr);
      return;
    }

    if (preset === 'this_month') {
      const start = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      setCustomStart(start);
      setCustomEnd(todayStr);
      onChange(start, todayStr);
      return;
    }

    if (preset === 'last_month') {
      const start = formatDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const end = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
      setCustomStart(start);
      setCustomEnd(end);
      onChange(start, end);
      return;
    }

    if (preset === 'custom') {
      if (customStart && customEnd && customStart > customEnd) {
        setValidationError('From Date cannot be after To Date');
      } else {
        onChange(customStart, customEnd);
      }
    }
  };

  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    setSelectedPreset('custom');
    if (val && customEnd && val > customEnd) {
      setValidationError('From Date cannot be after To Date');
    } else {
      setValidationError(null);
      onChange(val, customEnd);
    }
  };

  const handleCustomEndChange = (val: string) => {
    setCustomEnd(val);
    setSelectedPreset('custom');
    if (customStart && val && customStart > val) {
      setValidationError('From Date cannot be after To Date');
    } else {
      setValidationError(null);
      onChange(customStart, val);
    }
  };

  const handleClear = () => {
    setSelectedPreset('all');
    setCustomStart('');
    setCustomEnd('');
    setValidationError(null);
    onChange('', '');
  };

  const isCustomVisible = selectedPreset === 'custom';
  const hasActiveFilter = startDate !== '' || endDate !== '';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', ...style }}>
      {/* Preset Selector */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
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
          }}
        >
          <option value="all">Date: All Time</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom">Custom Range...</option>
        </select>
        <Calendar
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            pointerEvents: 'none',
            color: hasActiveFilter ? '#2563EB' : '#667085',
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
          title="Clear date filter (All Time)"
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
