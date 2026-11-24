// frontend/src/pages/expenses/AddTopUpModal.tsx
import React, { useState, useEffect } from 'react';
import { IndianRupee, Upload, X, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { expensesApi } from '../../api/expenses';
import { employeesApi } from '../../api/employees';
import type { ExpenseCategory, Employee } from '../../types';

interface AddTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  categories: ExpenseCategory[];
}

export const AddTopUpModal: React.FC<AddTopUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_WITHDRAWAL');
  const [description, setDescription] = useState<string>('');
  const [authorizedById, setAuthorizedById] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load active authorizers
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount('');
      setSource('');
      setDescription('');
      setReceiptFile(null);
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('BANK_WITHDRAWAL');

      // Auto-select initial top-up category if available
      const topUpCat = categories.find(c => c.category_type === 'IN');
      if (topUpCat) {
        setCategoryId(String(topUpCat.id));
      } else if (categories.length > 0) {
        setCategoryId(String(categories[0].id));
      }

      const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
          const res = await employeesApi.list({ status: 'active' });
          const activeEmployees = res.results || [];
          setEmployees(activeEmployees);
          // Default authorizer to first available active employee or user
          const adminEmp = activeEmployees.find(e => e.user_role === 'super_admin' || e.user_role === 'it_admin');
          if (adminEmp && adminEmp.user_id) {
            setAuthorizedById(String(adminEmp.user_id));
          } else if (activeEmployees.length > 0 && activeEmployees[0].user_id) {
            setAuthorizedById(String(activeEmployees[0].user_id));
          }
        } catch {
          // Ignore employee fetch errors
        } finally {
          setLoadingEmployees(false);
        }
      };

      fetchEmployees();
    }
  }, [isOpen, categories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Receipt file size exceeds the 10 MB limit.');
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Allowed formats: JPG, PNG, WEBP, PDF.');
      return;
    }

    setError(null);
    setReceiptFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid cash amount greater than ₹0.00.');
      return;
    }

    if (!source.trim()) {
      setError('Please enter the cash inflow source (e.g. Bank Withdrawal, Cheque #, Float).');
      return;
    }

    if (!authorizedById) {
      setError('Please select an authorizing executive/manager.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('transaction_type', 'CASH_IN');
      formData.append('transaction_date', transactionDate);
      formData.append('amount', amount);
      formData.append('payee_or_source', source.trim());
      formData.append('payment_method', paymentMethod);
      formData.append('description', description.trim());
      formData.append('authorized_by', authorizedById);
      if (categoryId) {
        formData.append('category', categoryId);
      }
      if (receiptFile) {
        formData.append('receipt_attachment', receiptFile);
      }

      await expensesApi.create(formData);
      onSuccess(`Successfully added Cash Top-Up of ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.amount) {
        setError(Array.isArray(data.amount) ? data.amount[0] : data.amount);
      } else if (data?.detail) {
        setError(data.detail);
      } else if (data?.non_field_errors) {
        setError(data.non_field_errors[0]);
      } else {
        setError('Failed to record cash top-up. Please check your inputs and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inCategories = categories.filter(c => c.category_type === 'IN');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Cash Top-Up"
      subtitle="Inject cash float from bank withdrawal or operational cash reserve"
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
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
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Top-Up Amount (₹) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#667085' }}>
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="10000.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 28px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Date <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={e => setTransactionDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Inflow Source / Reference <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. HDFC Bank Withdrawal Slip #4489, Cheque #8841"
            value={source}
            onChange={e => setSource(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              {(inCategories.length > 0 ? inCategories : categories).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="BANK_WITHDRAWAL">Bank Withdrawal to Cash</option>
              <option value="CASH">Physical Cash Transfer</option>
              <option value="PETTY_CASH">Petty Cash Reserve</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Authorized By <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            required
            value={authorizedById}
            onChange={e => setAuthorizedById(e.target.value)}
            disabled={loadingEmployees}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- Select Authorizing Executive / Manager --</option>
            {employees
              .filter(emp => Boolean(emp.user_id))
              .map(emp => (
                <option key={emp.id} value={emp.user_id || ''}>
                  {emp.full_name} ({emp.job_title} — {emp.department_name || 'Admin'})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Description / Reconciliation Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Operational justification or bank transaction notes..."
            value={description}
            onChange={e => setDescription(e.target.value)}
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

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Bank Slip / Receipt Attachment (Optional, max 10MB)
          </label>
          {receiptFile ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E5E9F0',
                borderRadius: '6px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#172033', fontWeight: 500 }}>
                {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileChange}
              style={{
                fontSize: '13px',
                color: '#667085',
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Add Top-Up
          </Button>
        </div>
      </form>
    </Modal>
  );
};
