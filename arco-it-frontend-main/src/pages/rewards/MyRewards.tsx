// frontend/src/pages/rewards/MyRewards.tsx
import React, { useState, useEffect } from 'react';
import { Gift, Award, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { rewardsApi } from '../../api/rewards';
import type { MyReward } from '../../types/rewards';
import {
  ProgramTypeBadge,
  RewardCategoryBadge,
} from '../../components/rewards/RewardBadges';
import { LoadingSpinner, Button } from '../../components/ui';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const MyRewards: React.FC = () => {
  const [rewards, setRewards] = useState<MyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rewardsApi.getMyRewards();
      setRewards(data || []);
    } catch (err: any) {
      setError('Failed to load your reward history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const totalRewardsCount = rewards.reduce((sum, r) => sum + r.quantity, 0);
  const distinctPrograms = new Set(rewards.map((r) => r.program_name)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
          My Rewards & Recognition
        </h1>
        <p style={{ fontSize: '14px', color: '#667085', margin: '4px 0 0 0' }}>
          Your employee recognition awards, appreciation gifts, and festive celebration items
        </p>
      </div>

      {/* 2. Summary KPI Cards matching MyAssets / AssetList */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
              Total Rewards Received
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033' }}>
              {loading ? '—' : totalRewardsCount}{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#667085' }}>items</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E9F0',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#FDF4FF',
              color: '#A21CAF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
              Programs Participated
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033' }}>
              {loading ? '—' : distinctPrograms}{' '}
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#667085' }}>initiatives</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. My Rewards Data Table */}
      <div className="data-table-card">
        <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="My Rewards Table">
          <table style={{ width: '100%', minWidth: '930px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0' }}>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, backgroundColor: '#F8FAFC', width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Program Initiative
                </th>
                <th style={{ position: 'sticky', top: 0, left: '220px', zIndex: 20, backgroundColor: '#F8FAFC', width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                  Reward / Item
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Category
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '70px', minWidth: '70px', maxWidth: '70px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', borderBottom: '1px solid #E5E9F0' }}>
                  Qty
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Date Received
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #E5E9F0' }}>
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#EF4444' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{error}</div>
                    <Button variant="secondary" size="sm" onClick={fetchRewards} style={{ marginTop: '12px' }}>
                      Try Again
                    </Button>
                  </td>
                </tr>
              ) : rewards.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px' }}>
                    <EmptyState
                      title="No Rewards Recorded"
                      description="You have not been presented with any rewards or recognition gifts under current programs."
                    />
                  </td>
                </tr>
              ) : (
                rewards.map((r) => (
                  <tr key={r.id} style={{ backgroundColor: '#FFFFFF', transition: 'background-color 0.15s ease' }}>
                    {/* Program */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '220px', minWidth: '220px', maxWidth: '220px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-2" style={{ fontSize: '13px', fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {r.program_name}
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <ProgramTypeBadge type={r.program_type} size="sm" />
                      </div>
                    </td>

                    {/* Reward Name & Description */}
                    <td style={{ position: 'sticky', left: '220px', zIndex: 4, backgroundColor: 'inherit', width: '200px', minWidth: '200px', maxWidth: '200px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)' }}>
                      <div className="cell-truncate-2" style={{ fontSize: '13px', fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {r.reward_name}
                      </div>
                      {r.description && (
                        <div className="cell-truncate-1" style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                          {r.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0' }}>
                      <RewardCategoryBadge category={r.category} />
                    </td>

                    {/* Quantity */}
                    <td style={{ width: '70px', minWidth: '70px', maxWidth: '70px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#172033', textAlign: 'center', borderBottom: '1px solid #E5E9F0' }}>
                      {r.quantity}
                    </td>

                    {/* Date Received */}
                    <td style={{ width: '120px', minWidth: '120px', maxWidth: '120px', padding: '10px 14px', fontSize: '13px', color: '#475467', borderBottom: '1px solid #E5E9F0' }}>
                      {formatDate(r.distribution_date)}
                    </td>

                    {/* Notes */}
                    <td style={{ width: '180px', minWidth: '180px', maxWidth: '180px', padding: '10px 14px', fontSize: '12px', color: '#667085', borderBottom: '1px solid #E5E9F0' }}>
                      <div className="cell-truncate-1">{r.notes || '—'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
