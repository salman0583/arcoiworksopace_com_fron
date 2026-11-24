import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ticket,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { assetsApi } from '../../api/assets';
import { Button, Card } from '../../components/ui';
import {
  AssetStatusBadge,
  AssetConditionBadge,
  WarrantyBadge,
  AssetAcknowledgementBadge,
} from '../../components/assets/AssetBadges';
import { AssetAcknowledgementModal } from '../../components/assets/AssetAcknowledgementModal';
import { AssetDetailDrawer } from '../../components/assets/AssetDetailDrawer';
import type { MyAsset } from '../../types';
import { logger } from '../../utils/logger';

export const MyAssets: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MyAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedAckAsset, setSelectedAckAsset] = useState<MyAsset | null>(null);
  const [selectedAssetDrawerId, setSelectedAssetDrawerId] = useState<number | null>(null);

  const fetchMyAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsApi.getMyAssets();
      setAssets(data);
    } catch (err) {
      logger.error('MyAssets', 'Failed to fetch employee assets', err);
      setError('Unable to load your assigned assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAssets();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172033', margin: 0 }}>
          My Assigned Assets
        </h1>
        <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0 0' }}>
          Company equipment and peripherals currently assigned to your custody
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#667085' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563EB' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Loading your devices...</p>
        </div>
      ) : error ? (
        <Card style={{ padding: '30px', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECDCA' }}>
          <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 10px auto' }} />
          <p style={{ margin: 0, fontSize: '14px', color: '#B42318', fontWeight: 500 }}>{error}</p>
          <Button variant="secondary" onClick={fetchMyAssets} style={{ marginTop: '12px' }}>
            Try Again
          </Button>
        </Card>
      ) : assets.length === 0 ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Laptop size={48} style={{ color: '#E5E9F0', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172033', marginBottom: '6px' }}>
            No Assigned Equipment
          </h3>
          <p style={{ fontSize: '14px', color: '#667085', margin: '0 0 16px 0', maxWidth: '400px', marginInline: 'auto' }}>
            You currently do not have any company hardware or devices assigned to your profile.
          </p>
          <Button variant="secondary" onClick={() => navigate('/service-desk')}>
            Request IT Equipment
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {assets.map((asset) => {
            const isPending = !asset.is_acknowledged && asset.acknowledgement_status === 'pending';
            const isIssueReported = asset.acknowledgement_status === 'issue_reported';

            return (
              <Card key={asset.id} style={{ padding: '18px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        color: '#175CD3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Laptop size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#172033',
                          }}
                        >
                          {asset.asset_tag}
                        </span>
                        <span style={{ fontSize: '14px', color: '#667085' }}>· {asset.name}</span>
                        <AssetStatusBadge status={asset.status} />
                        <AssetConditionBadge condition={asset.condition} />
                        <AssetAcknowledgementBadge
                          status={asset.acknowledgement_status}
                          isAcknowledged={asset.is_acknowledged}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#475569',
                        }}
                      >
                        <span>Manufacturer: <strong>{asset.manufacturer}</strong></span>
                        <span>Model: <strong>{asset.model}</strong></span>
                        <span>Serial: <strong style={{ fontFamily: 'monospace' }}>{asset.serial_number || '—'}</strong></span>
                        <span>Assigned: <strong>{asset.assigned_date || '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAssetDrawerId(asset.id)}
                      leftIcon={<Eye size={13} />}
                    >
                      View Specs
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/service-desk`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', border: '1px solid #E5E9F0' }}
                    >
                      <Ticket size={13} /> Service Request
                    </Button>
                  </div>
                </div>

                {/* Acknowledgement Status / Banner */}
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #F5F7FA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    {asset.is_acknowledged ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065F46', fontSize: '12px', fontWeight: 500 }}>
                        <CheckCircle2 size={15} color="#10B981" />
                        <span>
                          Receipt Confirmed by you {asset.acknowledged_at ? `on ${new Date(asset.acknowledged_at).toLocaleDateString()}` : ''}
                          {asset.acknowledgement_condition ? ` (Condition: ${asset.acknowledgement_condition})` : ''}
                        </span>
                      </div>
                    ) : isIssueReported ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B42318', fontSize: '12px', fontWeight: 500 }}>
                        <AlertTriangle size={15} color="#EF4444" />
                        <span>
                          Issue reported on this equipment. IT Support has been notified.
                          {asset.acknowledgement_notes ? ` Note: "${asset.acknowledgement_notes}"` : ''}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B54708', fontSize: '12px', fontWeight: 500 }}>
                        <Clock size={15} color="#D97706" />
                        <span>Action required: Please verify that you have received this equipment.</span>
                      </div>
                    )}
                  </div>

                  {(!asset.is_acknowledged || isIssueReported) && (
                    <Button
                      size="sm"
                      onClick={() => setSelectedAckAsset(asset)}
                      style={{ backgroundColor: '#10B981', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      leftIcon={<CheckCircle2 size={14} />}
                    >
                      {isIssueReported ? 'Update Acknowledgement' : 'Acknowledge Receipt'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Acknowledgement Modal */}
      {selectedAckAsset && (
        <AssetAcknowledgementModal
          asset={selectedAckAsset}
          isOpen={!!selectedAckAsset}
          onClose={() => setSelectedAckAsset(null)}
          onSuccess={() => {
            setToastMessage('Asset acknowledgement updated successfully.');
            setTimeout(() => setToastMessage(null), 4000);
            fetchMyAssets();
          }}
        />
      )}

      {/* Asset Detail Drawer */}
      <AssetDetailDrawer
        assetId={selectedAssetDrawerId}
        isOpen={!!selectedAssetDrawerId}
        onClose={() => setSelectedAssetDrawerId(null)}
        onUpdated={fetchMyAssets}
      />
    </div>
  );
};

