import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  User as UserIcon,
  HelpCircle,
  Receipt,
  File,
  PenTool,
  Type,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import type { ReimbursementDetail } from '../../types/expenses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reimbursement: ReimbursementDetail) => void;
}

interface ExpenseRow {
  id: string;
  item_date: string;
  description: string;
  expense_type: string;
  amount: string;
}

const COMMON_EXPENSE_TYPES = [
  'Travel / Cab / Fuel',
  'Client Hospitality & Meals',
  'Office Supplies & Stationery',
  'Hardware & Peripherals',
  'Software / Subscriptions',
  'Internet & Telecom',
  'Courier / Postal',
  'Training & Certification',
  'Miscellaneous Operations',
];

export const DigitalReimbursementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeIdCode, setEmployeeIdCode] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');

  // Signature state: Draw or Type
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState<string>('');
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [rows, setRows] = useState<ExpenseRow[]>([
    {
      id: 'row-1',
      item_date: new Date().toISOString().slice(0, 10),
      description: '',
      expense_type: 'Travel / Cab / Fuel',
      amount: '',
    },
  ]);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-populate user / employee profile information
  useEffect(() => {
    if (user) {
      const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      setEmployeeName(name);
      setTypedSignature(name);
      // Attempt to load employee profile metadata if linked
      const profile = (user as any).employee_profile;
      if (profile) {
        if (profile.employee_id) setEmployeeIdCode(profile.employee_id);
        if (profile.department?.name) setDepartmentName(profile.department.name);
        if (profile.manager?.full_name) setManagerName(profile.manager.full_name);
      }
    }
  }, [user]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        item_date: applicationDate,
        description: '',
        expense_type: 'Travel / Cab / Fuel',
        amount: '',
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) {
      setErrorMsg('At least one expense line item is required.');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof ExpenseRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const calculateTotal = (): number => {
    return rows.reduce((sum, r) => {
      const parsed = parseFloat(r.amount);
      return sum + (isNaN(parsed) || parsed < 0 ? 0 : parsed);
    }, 0);
  };

  const totalAmount = calculateTotal();

  // Canvas drawing handlers
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    isDrawingRef.current = true;
    const coords = getCanvasCoordinates(e);
    lastPointRef.current = coords;

    ctx.beginPath();
    ctx.strokeStyle = '#0F2C59';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(coords.x, coords.y);
    ctx.arc(coords.x, coords.y, 0.5, 0, Math.PI * 2);
    ctx.stroke();
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.strokeStyle = '#0F2C59';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastPointRef.current) {
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    lastPointRef.current = coords;
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
  };

  const generateTypedSignatureDataUrl = (name: string): string => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 400;
    offCanvas.height = 120;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 400, 120);
    ctx.fillStyle = '#0F2C59';
    ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || 'Signature', 200, 60);

    return offCanvas.toDataURL('image/png');
  };

  const getSignatureDataUrl = (): string => {
    if (sigMode === 'draw') {
      if (hasDrawn && canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      if (typedSignature.trim() || employeeName.trim()) {
        return generateTypedSignatureDataUrl(typedSignature.trim() || employeeName.trim());
      }
      return '';
    } else {
      const textToSign = typedSignature.trim() || employeeName.trim();
      if (textToSign) {
        return generateTypedSignatureDataUrl(textToSign);
      }
      return '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10 MB limit.');
        return;
      }
      setReceiptFile(file);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!purpose.trim()) {
      setErrorMsg('Please specify the Purpose / Business Justification.');
      return;
    }

    if (rows.length === 0) {
      setErrorMsg('Please add at least one expense line item.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.description.trim()) {
        setErrorMsg(`Item #${i + 1} requires a description.`);
        return;
      }
      const amt = parseFloat(r.amount);
      if (isNaN(amt) || amt <= 0) {
        setErrorMsg(`Item #${i + 1} requires a valid positive amount.`);
        return;
      }
    }

    const sigDataUrl = getSignatureDataUrl();
    if (!sigDataUrl) {
      setErrorMsg('Please enter or draw your employee signature before submitting.');
      return;
    }

    if (!acknowledged) {
      setErrorMsg('Please accept the digital signature declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('employee_name', employeeName);
      formData.append('employee_id_code', employeeIdCode);
      formData.append('department_name', departmentName);
      formData.append('manager_name', managerName);
      formData.append('application_date', applicationDate);
      formData.append('purpose', purpose.trim());
      formData.append('employee_signature', sigDataUrl);

      const itemsPayload = rows.map((r, idx) => ({
        item_date: r.item_date || applicationDate,
        description: r.description.trim(),
        expense_type: r.expense_type.trim() || 'General',
        amount: parseFloat(r.amount).toFixed(2),
        order: idx,
      }));

      formData.append('items', JSON.stringify(itemsPayload));

      if (receiptFile) {
        formData.append('receipt_attachment', receiptFile);
      }

      const created = await expensesApi.createReimbursement(formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'object'
          ? Object.values(err.response.data).flat().join(' ')
          : 'Failed to submit reimbursement form.');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for header display (e.g. 21 April 2025)
  const formattedHeaderDate = (() => {
    try {
      const d = new Date(applicationDate);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return applicationDate;
    }
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 26, 59, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* MODAL TOP BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: '#071A3B',
            color: '#FFFFFF',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#2FB4E5" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Company Reimbursement Form</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Official Expense Claim Submission Sheet
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE REIMBURSEMENT SHEET) */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1, backgroundColor: '#FAFAFA' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #F87171',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* PHYSICAL FORM CANVAS CONTAINER (Paper Style) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '36px 40px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* 1. Header with Logo & Full Width Divider */}
            <div style={{ marginBottom: '14px' }}>
              <img
                src="/arco-logo.png"
                alt="ARCO Workplace"
                style={{ height: '42px', width: 'auto', display: 'block' }}
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                }}
              />
            </div>
            <div style={{ borderBottom: '1px solid #DDEDFD', marginBottom: '24px' }} />

            {/* 2. TITLE: Reimbursement Form (Underlined, Blue) */}
            <div style={{ textAlign: 'center', margin: '20px 0 28px 0' }}>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#102281',
                  borderBottom: '2px solid #1A7CFA',
                  paddingBottom: '4px',
                  letterSpacing: '0.2px',
                }}
              >
                Reimbursement Form
              </span>
            </div>

            {/* 3. EMPLOYEE METADATA GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px 28px',
                marginBottom: '28px',
                fontSize: '13px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Name:
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Employee Full Name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Employee ID:
                </label>
                <input
                  type="text"
                  value={employeeIdCode}
                  onChange={(e) => setEmployeeIdCode(e.target.value)}
                  placeholder="e.g. EMP001"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Department:
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. IT, Finance, Operations"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Manager:
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Supervisor / Approver Name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Purpose: <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Client Site Visit, IT Peripherals, Team Lunch"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            {/* 4. EXPENSE TABLE (Slate Blue Header + Grid) */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  border: '1px solid #8EB1D6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#4A729D', color: '#FFFFFF', textAlign: 'center' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700, width: '125px', borderRight: '1px solid #8EB1D6' }}>
                        Date
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, borderRight: '1px solid #8EB1D6', textAlign: 'left' }}>
                        Description
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, width: '190px', borderRight: '1px solid #8EB1D6' }}>
                        Expensive Type
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, width: '130px', borderRight: '1px solid #8EB1D6' }}>
                        Amount
                      </th>
                      <th style={{ padding: '10px 8px', fontWeight: 700, width: '40px' }}>
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid #8EB1D6',
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FBFE',
                        }}
                      >
                        {/* Date Cell */}
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #8EB1D6' }}>
                          <input
                            type="date"
                            value={row.item_date}
                            onChange={(e) => handleRowChange(idx, 'item_date', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px',
                              fontSize: '12px',
                              textAlign: 'center',
                            }}
                          />
                        </td>

                        {/* Description Cell */}
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #8EB1D6' }}>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                            placeholder="Describe purchase / item..."
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          />
                        </td>

                        {/* Expensive Type Cell (Custom or select) */}
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #8EB1D6' }}>
                          <input
                            type="text"
                            list="expense-types-list"
                            value={row.expense_type}
                            onChange={(e) => handleRowChange(idx, 'expense_type', e.target.value)}
                            placeholder="e.g. Travel, Food"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          />
                        </td>

                        {/* Amount Cell */}
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #8EB1D6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#64748B', fontWeight: 600, fontSize: '12px' }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.amount}
                              onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                              placeholder="0.00"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '4px',
                                fontSize: '12px',
                                textAlign: 'right',
                                fontWeight: 600,
                              }}
                            />
                          </div>
                        </td>

                        {/* Action Cell (Delete) */}
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={rows.length <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: rows.length <= 1 ? '#CBD5E1' : '#EF4444',
                              cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* TOTAL SUMMARY ROW */}
                    <tr style={{ backgroundColor: '#F0F6FC' }}>
                      <td colSpan={3} style={{ padding: '10px 16px', borderRight: '1px solid #8EB1D6' }}>
                        <button
                          type="button"
                          onClick={handleAddRow}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px dashed #3A7BE0',
                            borderRadius: '4px',
                            color: '#3A7BE0',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={14} /> Add Line Item
                        </button>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: '#4A729D',
                          borderRight: '1px solid #8EB1D6',
                        }}
                      >
                        TOTAL= ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Datalist for expense types */}
              <datalist id="expense-types-list">
                {COMMON_EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              {/* Helper text below table */}
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '11.5px',
                  fontStyle: 'italic',
                  color: '#4A729D',
                  marginTop: '6px',
                }}
              >
                (don't forget to attach receipts)
              </div>
            </div>

            {/* 5. RECEIPT UPLOAD DROPZONE */}
            <div
              style={{
                border: '1px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                  <Receipt size={16} color="#4A729D" />
                  <span>Supporting Bills &amp; Receipts</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Allowed: PDF, PNG, JPG, WEBP (Max 10 MB)
                </span>
              </div>

              {receiptFile ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: '6px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#3A7BE0" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{receiptFile.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {(receiptFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    border: '1px dashed #94A3B8',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <UploadCloud size={24} color="#64748B" style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#3A7BE0' }}>
                    Click to browse or drop receipt attachment here
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* 6. SIGNATURES SECTION (Matches Official Physical Form Layout) */}
            <div
              style={{
                borderTop: '1px solid #E2E8F0',
                paddingTop: '20px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '28px',
                  alignItems: 'flex-start',
                }}
              >
                {/* LEFT: EMPLOYEE SIGNATURE PAD */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4A729D', textTransform: 'uppercase' }}>
                      Employee Signature
                    </span>
                    {/* Draw / Type Mode Switcher */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        backgroundColor: '#F1F5F9',
                        padding: '2px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSigMode('draw')}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: sigMode === 'draw' ? '#3A7BE0' : 'transparent',
                          color: sigMode === 'draw' ? '#FFFFFF' : '#64748B',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <PenTool size={11} /> Draw
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigMode('type')}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: sigMode === 'type' ? '#3A7BE0' : 'transparent',
                          color: sigMode === 'type' ? '#FFFFFF' : '#64748B',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Type size={11} /> Type
                      </button>
                    </div>
                  </div>

                  {/* Interactive Box */}
                  <div
                    style={{
                      border: '1px dashed #8EB1D6',
                      borderRadius: '6px',
                      backgroundColor: '#FAFCFF',
                      position: 'relative',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      minHeight: '100px',
                    }}
                  >
                    {sigMode === 'draw' ? (
                      <div style={{ position: 'relative', width: '100%', height: '100px' }}>
                        <canvas
                          ref={canvasRef}
                          width={350}
                          height={100}
                          onPointerDown={startDrawing}
                          onPointerMove={draw}
                          onPointerUp={stopDrawing}
                          onPointerLeave={stopDrawing}
                          style={{
                            width: '100%',
                            height: '100px',
                            display: 'block',
                            cursor: 'crosshair',
                            touchAction: 'none',
                          }}
                        />
                        {!hasDrawn && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94A3B8',
                              fontSize: '11.5px',
                              pointerEvents: 'none',
                              fontStyle: 'italic',
                            }}
                          >
                            Sign here using mouse or touch
                          </div>
                        )}
                        {hasDrawn && (
                          <button
                            type="button"
                            onClick={clearCanvas}
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              padding: '3px 8px',
                              fontSize: '10.5px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '4px',
                              color: '#64748B',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <RotateCcw size={10} /> Clear
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '10px 14px', height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <input
                          type="text"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your signature name..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginBottom: '6px',
                            color: '#0F172A',
                          }}
                        />
                        <div
                          style={{
                            fontFamily: 'italic 24px "Brush Script MT", "Caveat", "Segoe Script", cursive',
                            color: '#0F2C59',
                            textAlign: 'center',
                            minHeight: '30px',
                          }}
                        >
                          {typedSignature || employeeName || 'Signature'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Underline & Label */}
                  <div style={{ borderBottom: '1.5px solid #8EB1D6', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                    <span style={{ fontWeight: 700, color: '#4A729D' }}>Employee Signature</span>
                    <span style={{ color: '#3A7BE0', fontWeight: 600 }}>
                      {employeeName || 'Authorized'}
                    </span>
                  </div>
                </div>

                {/* RIGHT: MANAGER SIGNATURE (Workflow State) */}
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4A729D',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Manager Signature
                  </div>
                  <div
                    style={{
                      border: '1px dashed #CBD5E1',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      textAlign: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                      Pending Manager Authorization
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '4px' }}>
                      Designated Approver: <strong style={{ color: '#334155' }}>{managerName || 'Department Manager'}</strong>
                    </div>
                  </div>
                  <div style={{ borderBottom: '1px solid #DDEDFD', marginBottom: '6px' }} />
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    <span style={{ fontWeight: 700, color: '#2563EB' }}>Manager Signature</span>
                  </div>
                </div>
              </div>

              {/* Certification Checkbox */}
              <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    color: '#334155',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: '#3A7BE0' }}
                  />
                  <span>
                    <strong>Certification &amp; Authorization:</strong> I certify that this digital signature represents
                    my official acknowledgement, and all expense line items listed above are accurate and incurred
                    exclusively for company business.
                  </span>
                </label>
              </div>
            </div>

            {/* 7. FOOTER SECTION */}
            <div
              style={{
                borderTop: '1px solid #DDEDFD',
                paddingTop: '14px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#64748B',
              }}
            >
              ARCO Workplace · Workplace Operations Platform
            </div>
          </div>
        </div>

        {/* MODAL FOOTER BAR */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Total Claim:{' '}
            <strong style={{ color: '#071A3B', fontSize: '15px' }}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '9px 22px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3A7BE0',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(58, 123, 224, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #FFFFFF',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Submitting Form...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Submit Reimbursement Claim
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
