import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Laptop, RefreshCw, LifeBuoy, Package } from 'lucide-react';
import { softwareApi } from '../../api/software';
import type { MySoftware as MySoftwareType } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SoftwareCategoryBadge, LicenseTypeBadge } from '../../components/software/SoftwareBadges';
import { logger } from '../../utils/logger';

export const MySoftware: React.FC = () => {
  const navigate = useNavigate();
  const [softwareList, setSoftwareList] = useState<MySoftwareType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMySoftware = async () => {
    setLoading(true);
    try {
      const data = await softwareApi.getMySoftware();
      setSoftwareList(data || []);
    } catch (err) {
      logger.error('MySoftware', 'Failed to fetch employee software', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySoftware();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#172033', margin: 0 }}>
            My Software & Licenses
          </h1>
          <p style={{ fontSize: '14px', color: '#667085', margin: '4px 0 0' }}>
            Applications, productivity tools, and software licenses provisioned to your profile
          </p>
        </div>
      </div>

      {/* Software Table Card */}
      <Card noPadding>
        <div className="table-scroll-viewport" tabIndex={0} role="region" aria-label="My Software Table">
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, backgroundColor: '#F8FAFC', width: '220px', minWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Application</th>
                <th style={{ position: 'sticky', top: 0, left: '220px', zIndex: 20, backgroundColor: '#F8FAFC', width: '140px', minWidth: '120px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>Publisher</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Category</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '160px', minWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Assigned Device</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '110px', minWidth: '100px', padding: '10px 14px', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Assigned Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F8FAFC', width: '130px', minWidth: '120px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>Support</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#98A2B3' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <p style={{ margin: 0 }}>Loading your software...</p>
                  </td>
                </tr>
              ) : softwareList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#98A2B3' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#475569', margin: '0 0 4px' }}>
                      No software assigned
                    </p>
                    <p style={{ fontSize: '12px', margin: 0 }}>
                      You currently have no individual software licenses assigned to your profile.
                    </p>
                  </td>
                </tr>
              ) : (
                softwareList.map(sw => (
                  <tr key={sw.id} style={{ backgroundColor: '#FFFFFF', transition: 'background-color 0.15s' }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: 'inherit', width: '220px', minWidth: '180px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#172033', lineHeight: 1.35, wordBreak: 'break-word' }} className="cell-truncate-2" title={sw.name}>{sw.name}</span>
                          {sw.version && (
                            <span style={{ fontSize: '11px', color: '#667085', backgroundColor: '#F5F7FA', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {sw.version}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#98A2B3', marginTop: '2px', fontFamily: 'monospace' }} className="cell-truncate-1">
                          {sw.software_id}
                        </span>
                      </div>
                    </td>
                    <td style={{ position: 'sticky', left: '220px', zIndex: 4, backgroundColor: 'inherit', width: '140px', minWidth: '120px', padding: '10px 14px', color: '#475467', borderBottom: '1px solid #F5F7FA', borderRight: '1px solid #E5E9F0', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.05)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="cell-truncate-1" style={{ display: 'block' }} title={sw.publisher}>{sw.publisher}</span>
                    </td>
                    <td style={{ width: '120px', minWidth: '110px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <SoftwareCategoryBadge category={sw.category as any} />
                    </td>
                    <td style={{ width: '160px', minWidth: '140px', padding: '10px 14px', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle' }}>
                      {sw.asset_tag ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Laptop size={14} style={{ color: '#2563EB', flexShrink: 0 }} />
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontWeight: 500, color: '#475467', display: 'block' }} className="cell-truncate-1" title={sw.asset_name || undefined}>{sw.asset_name}</span>
                            <div style={{ fontSize: '11px', color: '#98A2B3', fontFamily: 'monospace' }}>
                              {sw.asset_tag}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#98A2B3', fontSize: '12px' }}>Web / Cloud SaaS</span>
                      )}
                    </td>
                    <td style={{ width: '110px', minWidth: '100px', padding: '10px 14px', color: '#667085', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{sw.assigned_date}</td>
                    <td style={{ width: '130px', minWidth: '120px', padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #F5F7FA', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/tickets/create?software=${encodeURIComponent(sw.name)}`)}
                      >
                        <LifeBuoy size={13} style={{ marginRight: '4px' }} /> Report Issue
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Company-Wide Shared Services */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Layers size={16} style={{ color: '#4F46E5' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
            Company-Wide Corporate Tools & Services
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 14px' }}>
          All ARCO Workplace team members have standard organization-wide access to the following communication and collaboration services:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E5E9F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#172033', fontSize: '13px' }}>Microsoft Teams</div>
              <div style={{ fontSize: '12px', color: '#667085' }}>Company-Wide Communication & Video Meetings</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '2px 8px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>Company-Wide</span>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E5E9F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#172033', fontSize: '13px' }}>Microsoft Outlook</div>
              <div style={{ fontSize: '12px', color: '#667085' }}>Corporate Email & Calendar Scheduling</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '2px 8px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>Company-Wide</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
