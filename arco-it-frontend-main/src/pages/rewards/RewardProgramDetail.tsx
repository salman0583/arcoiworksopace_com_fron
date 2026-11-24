// frontend/src/pages/rewards/RewardProgramDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  PlusCircle,
  Package,
  Calendar,
  DollarSign,
  FileText,
  User,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  Send,
  Sparkles,
} from 'lucide-react';
import { rewardsApi } from '../../api/rewards';
import { useAuth } from '../../context/AuthContext';
import { isHROrAbove } from '../../utils/auth';
import type {
  EngagementProgramDetail,
  RewardItem,
  RewardDistribution,
} from '../../types/rewards';
import {
  ProgramStatusBadge,
  ProgramTypeBadge,
  RewardCategoryBadge,
} from '../../components/rewards/RewardBadges';
import { Button, LoadingSpinner, Card } from '../../components/ui';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { AddItemModal } from './AddItemModal';
import { CreateProgramModal } from './CreateProgramModal';
import { DistributeModal } from './DistributeModal';

export const RewardProgramDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canManage = user ? isHROrAbove(user.role) : false;

  const [program, setProgram] = useState<EngagementProgramDetail | null>(null);
  const [distributions, setDistributions] = useState<RewardDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast states
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Modals state
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<RewardItem | null>(null);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [distributeItemId, setDistributeItemId] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const fetchProgramDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await rewardsApi.getProgram(Number(id));
      setProgram(data);

      const distRes = await rewardsApi.listDistributions({ program: Number(id) });
      setDistributions(distRes.results || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load engagement program details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgramDetail();
  }, [fetchProgramDetail]);

  const handleDeleteProgram = async () => {
    if (!program) return;
    if (program.total_quantity_distributed > 0) {
      showError(`Cannot delete "${program.program_name}" because distributions have already been recorded. Set status to Cancelled instead.`);
      return;
    }

    setActionLoading(true);
    try {
      await rewardsApi.deleteProgram(program.id);
      navigate('/rewards');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to delete program.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (item: RewardItem) => {
    if (item.distributed_quantity > 0) {
      showError(`Cannot delete "${item.reward_name}" because ${item.distributed_quantity} unit(s) have already been distributed.`);
      return;
    }

    try {
      await rewardsApi.deleteItem(item.id);
      showToast(`Deleted reward item "${item.reward_name}".`);
      fetchProgramDetail();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to delete item.');
    }
  };

  const openDistributeModal = (itemId?: number) => {
    setDistributeItemId(itemId || null);
    setIsDistributeOpen(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#667085' }}>
        <LoadingSpinner />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading program details...</p>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
        <Card style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FEF2F2', border: '1px solid #FECDCA' }}>
          <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#B42318', marginBottom: '8px' }}>
            {error || 'Program Not Available'}
          </h2>
          <Button variant="secondary" onClick={() => navigate('/rewards')} style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Rewards Directory
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Toast Notifications */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#065F46',
            padding: '8px 14px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECDCA',
            color: '#B42318',
            padding: '8px 14px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <AlertCircle size={16} color="#EF4444" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{errorToast}</span>
        </div>
      )}

      {/* 1. Top Back Nav matching AssetDetail */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/rewards')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Rewards Directory</span>
        </button>
      </div>

      {/* 2. Header & Actions matching AssetDetail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', margin: 0, lineHeight: 1.2 }}>
              {program.program_name}
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#F5F7FA',
                color: '#475569',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #E5E9F0',
                fontFamily: 'monospace',
              }}
            >
              {program.program_id}
            </span>
            <ProgramStatusBadge status={program.status} size="sm" />
            <ProgramTypeBadge type={program.program_type} size="sm" />
          </div>
          {program.description && (
            <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0 0', maxWidth: '900px' }}>
              {program.description}
            </p>
          )}
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {program.items.length > 0 && program.total_quantity_remaining > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openDistributeModal()}
                leftIcon={<Send size={14} />}
              >
                Distribute Rewards
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditProgramOpen(true)}
              leftIcon={<Edit2 size={14} />}
            >
              Edit Program
            </Button>

            {program.total_quantity_distributed === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteProgram}
                style={{ color: '#EF4444' }}
                leftIcon={<Trash2 size={14} />}
                isLoading={actionLoading}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3. Program Details Metadata Bar */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} color="#667085" />
          <span style={{ fontSize: '12px', color: '#667085' }}>Event Date:</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#172033' }}>
            {formatDate(program.program_date)}
          </span>
        </div>

        {program.budget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={15} color="#667085" />
            <span style={{ fontSize: '12px', color: '#667085' }}>Budget:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#172033' }}>
              AED {Number(program.budget).toLocaleString()}
            </span>
          </div>
        )}

        {program.created_by_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} color="#667085" />
            <span style={{ fontSize: '12px', color: '#667085' }}>Organized By:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#172033' }}>
              {program.created_by_name}
            </span>
          </div>
        )}

        {program.notes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <FileText size={15} color="#667085" />
            <span style={{ fontSize: '12px', color: '#667085' }}>Notes:</span>
            <span style={{ fontSize: '12px', color: '#475467' }}>{program.notes}</span>
          </div>
        )}
      </div>

      {/* 4. 4 KPI Summary Cards matching AssetDetail grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
        }}
      >
        <div style={{ padding: '10px 14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', marginBottom: '2px' }}>
            Total Items
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#172033' }}>
            {program.total_items_count} <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>titles</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase', marginBottom: '2px' }}>
            Units Received
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#172033' }}>
            {program.total_quantity_received} <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>units</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', marginBottom: '2px' }}>
            Distributed
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#D97706' }}>
            {program.total_quantity_distributed} <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>units</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E9F0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', marginBottom: '2px' }}>
            Remaining
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: program.total_quantity_remaining > 0 ? '#059669' : '#667085',
            }}
          >
            {program.total_quantity_remaining} <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>units</span>
          </div>
        </div>
      </div>

      {/* 5. Reward Items & Inventory Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#2563EB" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
              Program Items & Rewards
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#EFF6FF',
                color: '#175CD3',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {program.items.length}
            </span>
          </div>

          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setItemToEdit(null);
                setIsAddItemOpen(true);
              }}
              leftIcon={<PlusCircle size={14} />}
            >
              Add Item
            </Button>
          )}
        </div>

        <div className="data-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Item / Reward Name
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Category
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', textAlign: 'right' }}>
                    Received
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', textAlign: 'right' }}>
                    Distributed
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', textAlign: 'right' }}>
                    Remaining
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', width: '180px' }}>
                    Progress
                  </th>
                  {canManage && (
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {program.items.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} style={{ padding: '36px 20px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                      No items added to this program yet. Click &quot;Add Item&quot; to specify rewards.
                    </td>
                  </tr>
                ) : (
                  program.items.map((item) => {
                    const percent =
                      item.quantity_received > 0
                        ? Math.min(100, Math.round((item.distributed_quantity / item.quantity_received) * 100))
                        : 0;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        {/* Reward Name & ID */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>
                            {item.reward_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
                            {item.item_id}
                            {item.procurement_reference && ` • PO: ${item.procurement_reference}`}
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '14px 16px' }}>
                          <RewardCategoryBadge category={item.category} />
                        </td>

                        {/* Quantity Received */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#172033', textAlign: 'right' }}>
                          {item.quantity_received}
                        </td>

                        {/* Quantity Distributed */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#D97706', textAlign: 'right' }}>
                          {item.distributed_quantity}
                        </td>

                        {/* Remaining */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: item.remaining_quantity > 0 ? '#059669' : '#98A2B3',
                            }}
                          >
                            {item.remaining_quantity}
                          </span>
                        </td>

                        {/* Progress */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '6px',
                                backgroundColor: '#E5E9F0',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: '100%',
                                  backgroundColor: percent >= 100 ? '#10B981' : '#2563EB',
                                  borderRadius: '9999px',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '35px' }}>
                              {percent}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        {canManage && (
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {item.remaining_quantity > 0 && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => openDistributeModal(item.id)}
                                  leftIcon={<Send size={13} />}
                                >
                                  Distribute
                                </Button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setItemToEdit(item);
                                  setIsAddItemOpen(true);
                                }}
                                title="Edit item"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#667085',
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                              >
                                <Edit2 size={15} />
                              </button>

                              {item.distributed_quantity === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  title="Delete item"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    padding: '4px',
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Distribution History Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Users size={18} color="#2563EB" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', margin: 0 }}>
            Distribution History
          </h2>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#F5F7FA',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {distributions.length} records
          </span>
        </div>

        <div className="data-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Distribution ID
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Recipient Employee
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Item / Reward
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', textAlign: 'center' }}>
                    Quantity
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Distribution Date
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Distributed By
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {distributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                      No distributions recorded yet for this program.
                    </td>
                  </tr>
                ) : (
                  distributions.map((dist) => (
                    <tr key={dist.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                        {dist.distribution_id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                          {dist.employee_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#667085' }}>
                          {dist.employee_id_code} • {dist.employee_department || 'General'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                        {dist.item_name}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#D97706', textAlign: 'center' }}>
                        {dist.quantity}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475467' }}>
                        {formatDate(dist.distribution_date)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                        {dist.distributed_by_name || 'System Admin'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#667085' }}>
                        {dist.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Program Modal */}
      <CreateProgramModal
        isOpen={isEditProgramOpen}
        onClose={() => setIsEditProgramOpen(false)}
        programToEdit={program}
        onSuccess={(updatedPrg) => {
          showToast(`Updated program "${updatedPrg.program_name}".`);
          fetchProgramDetail();
        }}
      />

      {/* Add / Edit Item Modal */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => {
          setIsAddItemOpen(false);
          setItemToEdit(null);
        }}
        programId={program.id}
        programName={program.program_name}
        itemToEdit={itemToEdit}
        onSuccess={(newItem) => {
          showToast(itemToEdit ? `Updated "${newItem.reward_name}".` : `Added "${newItem.reward_name}".`);
          fetchProgramDetail();
        }}
      />

      {/* Distribute Modal */}
      <DistributeModal
        isOpen={isDistributeOpen}
        onClose={() => {
          setIsDistributeOpen(false);
          setDistributeItemId(null);
        }}
        programId={program.id}
        programName={program.program_name}
        items={program.items}
        preselectedItemId={distributeItemId}
        onSuccess={() => {
          showToast('Rewards distributed successfully.');
          fetchProgramDetail();
        }}
      />
    </div>
  );
};
