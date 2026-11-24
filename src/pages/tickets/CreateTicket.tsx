import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Laptop } from 'lucide-react';
import { getCategories, createTicket } from '../../api/tickets';
import { assetsApi } from '../../api/assets';
import { softwareApi } from '../../api/software';
import { useAuth } from '../../context/AuthContext';
import type { TicketCategory } from '../../types/tickets';
import type { MyAsset, Asset } from '../../types/assets';
import { logger } from '../../utils/logger';

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);
  const [softwareId, setSoftwareId] = useState<number | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [eligibleAssets, setEligibleAssets] = useState<Array<{ id: number; tag: string; name: string; model: string }>>([]);
  const [eligibleSoftware, setEligibleSoftware] = useState<Array<{ id: number; name: string; version: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const safeCategories = Array.isArray(categories) ? categories : [];
  const selectedCategory = safeCategories.find(c => c.id === categoryId) ?? null;

  useEffect(() => {
    // Check initial asset parameters from URL query if present (e.g. from QR scan)
    const paramAssetId = searchParams.get('asset_id');
    const paramAssetTag = searchParams.get('asset_tag');
    const paramAssetName = searchParams.get('asset_name');

    if (paramAssetId) {
      const numericId = Number(paramAssetId);
      setAssetId(numericId);
      if (paramAssetName && paramAssetTag) {
        setSubject(prev => prev || `Issue with ${paramAssetName} (${paramAssetTag})`);
      } else if (paramAssetTag) {
        setSubject(prev => prev || `Issue with Asset ${paramAssetTag}`);
      }
    }

    const paramSoftware = searchParams.get('software');
    if (paramSoftware) {
      setSubject(prev => prev || `Issue with ${paramSoftware}`);
    }

    getCategories()
      .then(r => {
        const raw = r.data;
        const catList = Array.isArray(raw) ? raw : ((raw as unknown as { results?: TicketCategory[] })?.results || []);
        setCategories(catList);
      })
      .catch((err) => {
        logger.error('Tickets', 'Failed to load categories in CreateTicket', err);
        setCategories([]);
      });

    // Fetch eligible assets for this user
    if (user?.role === 'employee') {
      assetsApi.getMyAssets()
        .then(myAssets => {
          setEligibleAssets(myAssets.map(a => ({ id: a.id, tag: a.asset_tag, name: a.name, model: a.model })));
        })
        .catch(err => logger.error('Tickets', 'Failed to load user assets', err));
    } else {
      assetsApi.listAssets({ page_size: 100 })
        .then(res => {
          setEligibleAssets(res.results.map(a => ({ id: a.id, tag: a.asset_tag, name: a.name, model: a.model })));
        })
        .catch(err => logger.error('Tickets', 'Failed to load all assets', err));
    }

    // Fetch software
    if (user?.role === 'employee') {
      softwareApi.getMySoftware()
        .then(mySw => {
          setEligibleSoftware(mySw.map(s => ({ id: s.id, name: s.name, version: s.version })));
        })
        .catch(err => logger.error('Tickets', 'Failed to load user software', err));
    } else {
      softwareApi.getSoftwareList({ page_size: 100 })
        .then(res => {
          setEligibleSoftware(res.results.map(s => ({ id: s.id, name: s.name, version: s.version })));
        })
        .catch(err => logger.error('Tickets', 'Failed to load software list', err));
    }
  }, [user, searchParams]);

  const handleCategoryChange = (val: string) => {
    setCategoryId(val ? Number(val) : null);
    setSubcategoryId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (description.trim().length < 10) { setError('Description must be at least 10 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const resp = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        asset_id: assetId || null,
        software_id: softwareId || null,
      });
      navigate(`/tickets/${resp.data.id}`);
    } catch (err: unknown) {


      logger.error('Tickets', 'Failed to create ticket', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '6px',
    border: '1px solid #E5E9F0', fontSize: '14px', color: '#172033',
    backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px',
    fontWeight: 600, color: '#475467',
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => navigate('/tickets')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E5E9F0';
          e.currentTarget.style.color = '#172033';
          e.currentTarget.style.borderColor = '#E5E9F0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.color = '#475467';
          e.currentTarget.style.borderColor = '#E5E9F0';
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 2px #B2CCFF';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 14px',
          borderRadius: '8px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E5E9F0',
          color: '#475467',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <ArrowLeft size={16} strokeWidth={2.2} style={{ color: '#2563EB' }} />
        <span>Back to Tickets</span>
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#172033', margin: 0 }}>Create New IT Ticket</h1>
        <p style={{ color: '#667085', fontSize: '14px', margin: '6px 0 0' }}>
          Describe your IT issue. Our team will respond based on priority.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E9F0', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '6px', color: '#B42318', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of the issue..."
              maxLength={500}
              style={inputStyle}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description <span style={{ color: '#EF4444' }}>*</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail. Include what happened, when it started, and any steps you have already tried..."
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              required
            />
            <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '4px' }}>
              {description.length} characters (minimum 10)
            </div>
          </div>

          {/* Row: Category + Subcategory */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={categoryId ?? ''}
                onChange={e => handleCategoryChange(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— Select category —</option>
                {safeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subcategory</label>
              <select
                value={subcategoryId ?? ''}
                onChange={e => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedCategory || !selectedCategory.subcategories || selectedCategory.subcategories.length === 0}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', opacity: (!selectedCategory || !selectedCategory.subcategories || selectedCategory.subcategories.length === 0) ? 0.5 : 1 }}
              >
                <option value="">— Select subcategory —</option>
                {(selectedCategory?.subcategories || []).filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Associated Asset */}
          <div>
            <label style={labelStyle}>
              Associated Equipment / Asset <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={assetId ?? ''}
                onChange={e => setAssetId(e.target.value ? Number(e.target.value) : null)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— None / Not device specific —</option>
                {assetId && !eligibleAssets.some(a => a.id === assetId) && (
                  <option key={assetId} value={assetId}>
                    {searchParams.get('asset_tag') || `Asset #${assetId}`} {searchParams.get('asset_name') ? `— ${searchParams.get('asset_name')}` : ''}
                  </option>
                )}
                {eligibleAssets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.tag} — {a.name} ({a.model})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '11px', color: '#667085', marginTop: '4px' }}>
              Link the specific computer or device experiencing this issue.
            </div>
          </div>

          {/* Associated Software */}
          <div>
            <label style={labelStyle}>
              Associated Software / Application <span style={{ fontSize: '12px', fontWeight: 400, color: '#667085' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={softwareId ?? ''}
                onChange={e => setSoftwareId(e.target.value ? Number(e.target.value) : null)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— None / Not application specific —</option>
                {eligibleSoftware.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.version ? `(${s.version})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '11px', color: '#667085', marginTop: '4px' }}>
              Select the software product experiencing issues or requiring license support.
            </div>
          </div>

          {/* Priority */}

          <div>
            <label style={labelStyle}>Priority</label>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['low', 'medium', 'high', 'critical'] as const).map(p => {
                const colors = {
                  low: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', activeBg: '#166534' },
                  medium: { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF', activeBg: '#1E40AF' },
                  high: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E', activeBg: '#92400E' },
                  critical: { bg: '#FEE2E2', border: '#FCA5A5', text: '#B42318', activeBg: '#B42318' },
                };
                const c = colors[p];
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', textTransform: 'capitalize',
                      border: `2px solid ${isSelected ? c.activeBg : c.border}`,
                      backgroundColor: isSelected ? c.activeBg : c.bg,
                      color: isSelected ? '#fff' : c.text,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div style={{ borderTop: '1px solid #E5E9F0', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #E5E9F0', backgroundColor: '#fff', color: '#667085', fontSize: '14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                backgroundColor: loading ? '#98A2B3' : '#2563EB', color: '#fff',
                fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <PlusCircle size={16} />
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
