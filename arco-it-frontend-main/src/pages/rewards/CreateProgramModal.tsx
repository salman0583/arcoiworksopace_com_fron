import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button, Input } from '../../components/ui';
import { rewardsApi } from '../../api/rewards';
import type { EngagementProgramListItem, ProgramType, ProgramStatus } from '../../types/rewards';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (program: EngagementProgramListItem) => void;
  programToEdit?: EngagementProgramListItem | null;
}

export const CreateProgramModal: React.FC<CreateProgramModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  programToEdit,
}) => {
  const isEditing = Boolean(programToEdit);

  const [programName, setProgramName] = useState('');
  const [programType, setProgramType] = useState<ProgramType>('appreciation');
  const [programDate, setProgramDate] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('planned');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (programToEdit) {
      setProgramName(programToEdit.program_name);
      setProgramType(programToEdit.program_type);
      setProgramDate(programToEdit.program_date || '');
      setBudget(programToEdit.budget ? String(programToEdit.budget) : '');
      setStatus(programToEdit.status);
      setDescription(programToEdit.description || '');
      setNotes(programToEdit.notes || '');
    } else {
      setProgramName('');
      setProgramType('appreciation');
      setProgramDate(new Date().toISOString().split('T')[0]);
      setBudget('');
      setStatus('planned');
      setDescription('');
      setNotes('');
    }
    setError(null);
  }, [programToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim()) {
      setError('Program Name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        program_name: programName.trim(),
        program_type: programType,
        program_date: programDate || undefined,
        budget: budget ? parseFloat(budget) : null,
        status: isEditing ? status : undefined,
        description: description.trim(),
        notes: notes.trim(),
      };

      let result: EngagementProgramListItem;
      if (isEditing && programToEdit) {
        result = await rewardsApi.updateProgram(programToEdit.id, payload);
      } else {
        result = await rewardsApi.createProgram(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.program_name?.[0] ||
        err.response?.data?.detail ||
        'Failed to save engagement program. Please check the inputs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Engagement Program' : 'New Engagement Program'}
      subtitle={
        isEditing
          ? `Update details for ${programToEdit?.program_id || 'program'}`
          : 'Plan an employee appreciation event, festival celebration, recognition award, or engagement initiative.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Program'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              color: '#B42318',
              borderRadius: '6px',
              border: '1px solid #FECDCA',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Program Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Program / Initiative Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <Input
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="e.g. Annual Employee Appreciation Day 2026"
            required
          />
        </div>

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Program Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={programType}
              onChange={(e) => setProgramType(e.target.value as ProgramType)}
              className="standard-select"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #E5E9F0',
                fontSize: '13px',
                backgroundColor: '#fff',
                color: '#172033',
                outline: 'none',
              }}
            >
              <option value="appreciation">Appreciation Day</option>
              <option value="recognition">Employee Recognition</option>
              <option value="performance">Performance Award</option>
              <option value="festival">Festival & Holiday Celebration</option>
              <option value="company_event">Company Event</option>
              <option value="engagement">Employee Engagement</option>
              <option value="other">Other Initiative</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Program / Event Date
            </label>
            <Input
              type="date"
              value={programDate}
              onChange={(e) => setProgramDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
              Allocated Budget (AED)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 15000.00"
            />
          </div>

          {isEditing && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
                Program Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                className="standard-select"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #E5E9F0',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  color: '#172033',
                  outline: 'none',
                }}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="partially_distributed">Partially Distributed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of the program objective and celebration plan..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              fontFamily: 'inherit',
              color: '#172033',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475467', marginBottom: '6px' }}>
            Administrative Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional internal coordination or vendor notes..."
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E9F0',
              fontSize: '13px',
              fontFamily: 'inherit',
              color: '#172033',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </form>
    </Modal>
  );
};
