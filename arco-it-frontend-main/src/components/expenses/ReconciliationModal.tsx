import React, { useState, useEffect } from 'react';
import { X, Scale, CheckCircle2, AlertTriangle, History, Calendar, Calculator, Info } from 'lucide-react';
import { expensesApi } from '../../api/expenses';
import type { ReconciliationPreview, CashReconciliation } from '../../types/expenses';
import { Button, Input, LoadingSpinner } from '../ui';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history'>('reconcile');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [pastRecords, setPastRecords] = useState<CashReconciliation[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch preview when date params change
  useEffect(() => {
    if (!isOpen) return;
    setLoadingPreview(true);
    setError(null);
    setSuccessMsg(null);

    expensesApi.getReconciliationPreview({
      as_of_date: asOfDate || undefined,
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined,
    })
      .then((data: ReconciliationPreview) => {
        setPreview(data);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.detail || 'Failed to load reconciliation preview.');
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [isOpen, asOfDate, periodStart, periodEnd]);

  // Load history when history tab selected
  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      setLoadingHistory(true);
      expensesApi.listReconciliations()
        .then((data: CashReconciliation[]) => {
          setPastRecords(data);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const expectedBal = preview ? parseFloat(preview.expected_closing_balance) || 0 : 0;
  const enteredPhysical = parseFloat(physicalCount);
  const hasEntered = !isNaN(enteredPhysical) && physicalCount.trim() !== '';
  const discrepancy = hasEntered ? enteredPhysical - expectedBal : 0;
  const isMatched = hasEntered && Math.abs(discrepancy) < 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEntered) {
      setError('Please enter the physically counted cash amount.');
      return;
    }
    if (!isMatched && !notes.trim()) {
      setError('An explanatory note is required when physical cash count differs from expected balance.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await expensesApi.createReconciliation({
        reconciliation_date: asOfDate,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        physical_cash_count: physicalCount,
        notes: notes.trim(),
      });
      setSuccessMsg('Cash reconciliation recorded successfully.');
      setPhysicalCount('');
      setNotes('');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setActiveTab('history');
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.notes || err?.response?.data?.detail || 'Failed to record cash reconciliation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#071A3B',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2FB4E5',
              }}
            >
              <Scale size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
                Cash Reconciliation
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Verify physical cash in drawer against server ledger balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('reconcile')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'reconcile' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'reconcile' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calculator size={15} />
            Reconcile Cash
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'history' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History size={15} />
            Reconciliation History
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                color: '#B42318',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: '#ECFDF3',
                border: '1px solid #A6F4C5',
                color: '#027A48',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'reconcile' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Date selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '4px' }}>
                    Reconciliation As of Date
                  </label>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '4px' }}>
                    Period Filter (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      placeholder="Start"
                      style={{
                        width: '50%',
                        padding: '8px 6px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      placeholder="End"
                      style={{
                        width: '50%',
                        padding: '8px 6px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Theoretical Expected Balance Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Server Ledger Cash Flow ({preview?.transactions_count || 0} Posted Transactions)
                </div>

                {loadingPreview ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Opening Balance</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                        ₹{parseFloat(preview?.opening_balance || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#16A34A' }}>+ Cash In</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#16A34A', marginTop: '2px' }}>
                        ₹{parseFloat(preview?.total_cash_in || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#DC2626' }}>- Cash Out</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', marginTop: '2px' }}>
                        ₹{parseFloat(preview?.total_cash_out || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#EFF6FF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      <div style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>Expected Closing</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E40AF', marginTop: '2px' }}>
                        ₹{expectedBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Cash Count Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                  Physically Counted Cash Amount (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '15px', fontWeight: 600, color: '#64748B' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter total physical currency count"
                    value={physicalCount}
                    onChange={(e) => setPhysicalCount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Discrepancy / Variance Pill */}
              {hasEntered && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: isMatched ? '#ECFDF3' : '#FFFBEB',
                    border: `1px solid ${isMatched ? '#A6F4C5' : '#FDE68A'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isMatched ? <CheckCircle2 size={18} color="#027A48" /> : <AlertTriangle size={18} color="#B45309" />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isMatched ? '#027A48' : '#B45309' }}>
                        {isMatched ? 'Balanced & Verified' : 'Variance / Discrepancy Detected'}
                      </div>
                      <div style={{ fontSize: '11px', color: isMatched ? '#065F46' : '#92400E' }}>
                        {isMatched
                          ? 'Physical cash count matches ledger balance.'
                          : discrepancy > 0
                          ? `Surplus of ₹${discrepancy.toFixed(2)} compared to expected balance.`
                          : `Shortage of ₹${Math.abs(discrepancy).toFixed(2)} compared to expected balance.`}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: isMatched ? '#027A48' : '#B45309' }}>
                    {discrepancy >= 0 ? `+₹${discrepancy.toFixed(2)}` : `-₹${Math.abs(discrepancy).toFixed(2)}`}
                  </div>
                </div>
              )}

              {/* Explanatory Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475467', marginBottom: '4px' }}>
                  Reconciliation Notes {!isMatched && hasEntered && <span style={{ color: '#EF4444' }}>(Required for Variance)</span>}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    !isMatched && hasEntered
                      ? 'Explain reason for variance (e.g. pending petty cash voucher, cash in transit, coin rounding)...'
                      : 'Optional comments or notes on cash count'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Save Reconciliation Record
                </Button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div>
              {loadingHistory ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <LoadingSpinner />
                </div>
              ) : pastRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                  <Scale size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>No past reconciliation records yet.</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>Perform your first physical cash count verification above.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pastRecords.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                            {rec.reconciliation_date}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: rec.status === 'MATCHED' ? '#ECFDF3' : '#FFFBEB',
                              color: rec.status === 'MATCHED' ? '#027A48' : '#B45309',
                              border: `1px solid ${rec.status === 'MATCHED' ? '#A6F4C5' : '#FDE68A'}`,
                            }}
                          >
                            {rec.status === 'MATCHED' ? 'Balanced' : 'Discrepancy'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          Reconciled by: {rec.reconciled_by_name || 'Admin'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '6px' }}>
                        <div>
                          <span style={{ color: '#64748B' }}>Expected: </span>
                          <strong style={{ color: '#1E293B' }}>₹{parseFloat(rec.expected_closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Physical: </span>
                          <strong style={{ color: '#1E293B' }}>₹{parseFloat(rec.physical_cash_count).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Variance: </span>
                          <strong style={{ color: parseFloat(rec.discrepancy) === 0 ? '#027A48' : '#B45309' }}>
                            ₹{parseFloat(rec.discrepancy).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>

                      {rec.notes && (
                        <div style={{ fontSize: '12px', color: '#475467', fontStyle: 'italic', marginTop: '2px' }}>
                          "{rec.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
