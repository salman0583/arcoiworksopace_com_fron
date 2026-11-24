// frontend/src/pages/expenses/VoidTransactionModal.tsx
import React, { useState } from 'react';
import { AlertTriangle, Ban } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { expensesApi } from '../../api/expenses';
import { formatINR, formatDate } from '../../utils/formatters';
import type { ExpenseTransactionDetail, ExpenseTransactionListItem } from '../../types';

interface VoidTransactionModalProps {
  transaction: ExpenseTransactionDetail | ExpenseTransactionListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const VoidTransactionModal: React.FC<VoidTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [voidReason, setVoidReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = voidReason.trim();
    if (cleanReason.length < 3) {
      setError('Please provide a meaningful void reason (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await expensesApi.void(transaction.id, cleanReason);
      onSuccess(`Successfully voided voucher ${transaction.voucher_number}. Downstream balances recalculated.`);
      setVoidReason('');
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.detail) {
        setError(data.detail);
      } else if (data?.void_reason) {
        setError(Array.isArray(data.void_reason) ? data.void_reason[0] : data.void_reason);
      } else {
        setError('Failed to void transaction. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Void Voucher ${transaction.voucher_number}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Warning Banner */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECDD3',
            borderRadius: '8px',
            color: '#B42318',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong>Warning:</strong> Voiding this transaction permanently sets its status to <strong>VOIDED</strong> and automatically recalculates all affected subsequent ledger balances. This action cannot be undone.
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#FFF1F2',
              border: '1px solid #FDA4AF',
              borderRadius: '6px',
              color: '#9F1239',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Transaction Recap */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid #E5E9F0',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#667085' }}>Amount:</span>
            <strong style={{ color: '#172033' }}>{formatINR(transaction.amount)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#667085' }}>Party / Vendor:</span>
            <span style={{ color: '#172033' }}>{transaction.payee_or_source}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#667085' }}>Date:</span>
            <span style={{ color: '#172033' }}>{formatDate(transaction.transaction_date)}</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Mandatory Void Justification <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Explain why this transaction is being voided (e.g. Duplicate voucher, incorrect bill amount, cancelled expense)..."
            value={voidReason}
            onChange={e => setVoidReason(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" isLoading={isSubmitting} leftIcon={<Ban size={14} />}>
            Confirm & Void
          </Button>
        </div>
      </form>
    </Modal>
  );
};
