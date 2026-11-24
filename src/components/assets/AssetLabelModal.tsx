import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle,
  ShieldCheck,
  FileText,
  Layers,
  Sparkles,
  Tag,
  Grid,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { assetsApi } from '../../api/assets';
import type { Asset } from '../../types';

interface AssetLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  title?: string;
}

export type AssetThemeMode = 'auto' | 'it' | 'admin';
export type TagFormatMode = 'short' | 'full';
export type ViewLayoutMode = 'dual_sheet' | 'sheet' | 'single';

interface ThemeConfig {
  primaryColor: string;
  borderColor: string;
  lightBg: string;
  categoryLabel: string;
  tagPrefix: string;
  sheetTitle: string;
  sloganLines: [string, string, string];
  sloganColor: string;
}

export const THEMES: Record<'it' | 'admin', ThemeConfig> = {
  it: {
    primaryColor: '#0052CC',
    borderColor: '#0052CC',
    lightBg: '#EFF6FF',
    categoryLabel: 'IT ASSET',
    tagPrefix: 'IT',
    sheetTitle: 'IT ASSET TAGS',
    sloganLines: ['TECHNOLOGY', 'PEOPLE', 'PROGRESS'],
    sloganColor: '#4B8FE2',
  },
  admin: {
    primaryColor: '#007A3D',
    borderColor: '#007A3D',
    lightBg: '#ECFDF3',
    categoryLabel: 'ADMIN ASSET',
    tagPrefix: 'AD',
    sheetTitle: 'ADMIN ASSET TAGS',
    sloganLines: ['PEOPLE', 'SPACES', 'POSSIBILITIES'],
    sloganColor: '#34A853',
  },
};

/**
 * Authentic Company Brand Logo for ARCO Workplace.
 * Reuses the authoritative /arco-icon.png brand asset used across ARCO Workplace (Sidebar & Login).
 * Renders the authentic cyan/blue gradient swirl mark and crisp company wordmark.
 */
export const ArcoBrandLogo: React.FC<{
  iconSize?: number;
  fontSize?: number;
  textColor?: string;
}> = ({ iconSize = 12, fontSize = 8.8, textColor = '#0F172A' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3.5px', lineHeight: 1 }}>
    <img
      src="/arco-icon.png"
      alt="ARCO"
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        color: textColor,
        letterSpacing: '-0.3px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        lineHeight: 1,
      }}
    >
      ARCO Workplace
    </span>
  </div>
);

/**
 * Helper to compute display tag (e.g. IT-01 or AD-01) and theme.
 */
function resolveAssetMeta(
  asset: Asset,
  index: number,
  themeMode: AssetThemeMode,
  tagFormat: TagFormatMode
) {
  const cat = (asset.category || '').toLowerCase();
  const isItCat =
    cat === 'it' ||
    cat === 'hardware' ||
    cat === 'laptop' ||
    cat === 'desktop' ||
    cat === 'network' ||
    cat === 'accessories' ||
    !cat;

  const activeThemeKey: 'it' | 'admin' =
    themeMode === 'auto' ? (isItCat ? 'it' : 'admin') : themeMode;

  const theme = THEMES[activeThemeKey];

  // Resolve short vs full tag
  const rawTag = asset.asset_tag || `ARCO-${activeThemeKey.toUpperCase()}-${String(index + 1).padStart(2, '0')}`;
  
  let displayTag = rawTag;
  if (tagFormat === 'short') {
    const match = rawTag.match(/\d+$/);
    const num = match ? parseInt(match[0], 10) : index + 1;
    displayTag = `${theme.tagPrefix}-${String(num).padStart(2, '0')}`;
  }

  return {
    theme,
    displayTag,
    rawTag,
    isIT: activeThemeKey === 'it',
  };
}

/**
 * Isolated Pure Component representing a Single Asset Tag.
 * Exactly replicates the reference badge tag:
 * Left colored vertical stripe, vector logo, category label, divider, large bold ID, and right QR code.
 */
interface AssetTagCardProps {
  asset: Asset;
  index: number;
  originUrl: string;
  themeMode: AssetThemeMode;
  tagFormat: TagFormatMode;
  scale?: number;
  isPrintOnly?: boolean;
}

export const AssetTagCard: React.FC<AssetTagCardProps> = ({
  asset,
  index,
  originUrl,
  themeMode,
  tagFormat,
  scale = 1,
  isPrintOnly = false,
}) => {
  const { theme, displayTag, rawTag } = resolveAssetMeta(asset, index, themeMode, tagFormat);
  const qrUrl = `${originUrl}/assets/${rawTag}`;

  return (
    <div
      className={isPrintOnly ? 'arco-tag-print-item' : 'arco-tag-card-preview'}
      style={{
        width: '54mm',
        height: '27mm',
        backgroundColor: '#FFFFFF',
        borderRadius: '5px',
        border: `1.1px solid ${theme.borderColor}`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isPrintOnly ? 'none' : '0 2px 5px rgba(0, 0, 0, 0.06)',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Solid Colored Left Vertical Accent Stripe (2.2mm wide) */}
      <div
        style={{
          width: '2.2mm',
          backgroundColor: theme.primaryColor,
          height: '100%',
          flexShrink: 0,
        }}
      />

      {/* 2. Middle Content Column: Logo, Category, Line, Bold Tag */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.0mm 2.0mm 2.2mm 2.2mm',
          minWidth: 0,
        }}
      >
        {/* Row 1: Authentic Company Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ArcoBrandLogo iconSize={11.5} fontSize={8.8} textColor="#0F172A" />
        </div>

        {/* Row 2: Category Header (IT ASSET / ADMIN ASSET) */}
        <div
          style={{
            fontSize: '6.6px',
            fontWeight: 800,
            color: theme.primaryColor,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            lineHeight: 1,
            marginTop: '0.5mm',
          }}
        >
          {theme.categoryLabel}
        </div>

        {/* Row 3: Horizontal Accent Line */}
        <div
          style={{
            width: '100%',
            height: '1.0px',
            backgroundColor: theme.primaryColor,
            margin: '0.5mm 0 0.8mm 0',
          }}
        />

        {/* Row 4: Large Bold Asset Tag Identifier */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontSize: displayTag.length > 8 ? '12px' : '15.5px',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.4px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }}
          >
            {displayTag}
          </span>
        </div>
      </div>

      {/* 3. Right Column: High-Res QR Code */}
      <div
        style={{
          width: '20mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: '1.8mm',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '17.5mm',
            height: '17.5mm',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={64}
            level="M"
            includeMargin={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Single-Category 20-Tag Sheet View (4 Columns x 5 Rows).
 */
interface TagSheetViewProps {
  assets: Asset[];
  originUrl: string;
  themeMode: AssetThemeMode;
  tagFormat: TagFormatMode;
  isPrintOnly?: boolean;
}

export const TagSheetView: React.FC<TagSheetViewProps> = ({
  assets,
  originUrl,
  themeMode,
  tagFormat,
  isPrintOnly = false,
}) => {
  const activeThemeKey: 'it' | 'admin' =
    themeMode === 'auto'
      ? (assets[0]?.category || '').toLowerCase() === 'admin'
        ? 'admin'
        : 'it'
      : themeMode;

  const theme = THEMES[activeThemeKey];

  const sheetItems = useMemo(() => {
    const list: Asset[] = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      if (i < assets.length) {
        list.push(assets[i]);
      } else {
        const isIt = activeThemeKey === 'it';
        list.push({
          id: 1000 + i,
          asset_tag: `ARCO-${isIt ? 'IT' : 'AD'}-${String(i + 1).padStart(2, '0')}`,
          name: `Asset ${i + 1}`,
          category: isIt ? 'it' : 'admin',
          status: 'in_use',
          created_at: new Date().toISOString(),
        } as unknown as Asset);
      }
    }
    return list;
  }, [assets, activeThemeKey]);

  return (
    <div
      className={isPrintOnly ? 'arco-sheet-print-container' : 'arco-sheet-preview-card'}
      style={{
        width: '260mm',
        minHeight: '175mm',
        backgroundColor: '#FFFFFF',
        padding: '10mm 12mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: isPrintOnly ? '0' : '10px',
        boxShadow: isPrintOnly ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: isPrintOnly ? 'none' : '1px solid #E2E8F0',
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '4mm',
          marginBottom: '5mm',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ArcoBrandLogo iconSize={24} fontSize={18} textColor="#0F172A" />
          <span style={{ fontSize: '18px', color: '#94A3B8', fontWeight: 300 }}>|</span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: theme.primaryColor,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}
          >
            {theme.sheetTitle} (01 - 20)
          </span>
        </div>

        {/* 3-line Slogan */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontSize: '6.5px',
            fontWeight: 700,
            color: theme.sloganColor,
            letterSpacing: '0.8px',
            lineHeight: 1.35,
            textTransform: 'uppercase',
          }}
        >
          <span>{theme.sloganLines[0]}</span>
          <span>{theme.sloganLines[1]}</span>
          <span>{theme.sloganLines[2]}</span>
        </div>
      </div>

      {/* 4-Column x 5-Row Grid of 20 Tags */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: '3.5mm 3.5mm',
          flex: 1,
        }}
      >
        {sheetItems.map((item, idx) => (
          <div key={`${item.id}-${idx}`} style={{ display: 'flex', justifyContent: 'center' }}>
            <AssetTagCard
              asset={item}
              index={idx}
              originUrl={originUrl}
              themeMode={themeMode}
              tagFormat={tagFormat}
              isPrintOnly={isPrintOnly}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginTop: '5mm',
          paddingTop: '3mm',
        }}
      >
        <div
          style={{
            fontSize: '6.5px',
            fontWeight: 800,
            color: '#64748B',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          <span>ARCO WORKPLACE</span>
        </div>
        <div
          style={{
            fontSize: '5.8px',
            fontWeight: 600,
            color: '#94A3B8',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '1px',
          }}
        >
          <span>ASSETS TODAY. A BRIGHTER TOMORROW.</span>
          <span style={{ width: '18px', height: '0.8px', backgroundColor: '#CBD5E1' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Dual Master Sheet View (Side-by-Side: IT ASSETS + ADMIN ASSETS).
 * Exactly replicates reference image media_1790676775289.png.
 */
interface DualSheetViewProps {
  originUrl: string;
  tagFormat: TagFormatMode;
  isPrintOnly?: boolean;
}

export const DualSheetView: React.FC<DualSheetViewProps> = ({
  originUrl,
  tagFormat,
  isPrintOnly = false,
}) => {
  const itItems = useMemo(() => {
    const list: Asset[] = [];
    for (let i = 1; i <= 20; i++) {
      list.push({
        id: 1000 + i,
        asset_tag: `ARCO-IT-${String(i).padStart(2, '0')}`,
        name: `IT Asset ${i}`,
        category: 'it',
        status: 'in_use',
      } as unknown as Asset);
    }
    return list;
  }, []);

  const adminItems = useMemo(() => {
    const list: Asset[] = [];
    for (let i = 1; i <= 20; i++) {
      list.push({
        id: 2000 + i,
        asset_tag: `ARCO-AD-${String(i).padStart(2, '0')}`,
        name: `Admin Asset ${i}`,
        category: 'admin',
        status: 'in_use',
      } as unknown as Asset);
    }
    return list;
  }, []);

  return (
    <div
      className={isPrintOnly ? 'arco-dual-sheet-print-container' : 'arco-dual-sheet-preview-card'}
      style={{
        width: '540mm',
        minHeight: '180mm',
        backgroundColor: '#FFFFFF',
        padding: '10mm 14mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: isPrintOnly ? '0' : '10px',
        boxShadow: isPrintOnly ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: isPrintOnly ? 'none' : '1px solid #E2E8F0',
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Side-by-side Dual Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14mm', flex: 1 }}>
        {/* Left Column: IT ASSET TAGS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '3.5mm',
              marginBottom: '4.5mm',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArcoBrandLogo iconSize={22} fontSize={16} textColor="#0F172A" />
              <span style={{ fontSize: '16px', color: '#94A3B8', fontWeight: 300 }}>|</span>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: THEMES.it.primaryColor,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                IT ASSET TAGS (01 - 20)
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontSize: '6.2px',
                fontWeight: 700,
                color: THEMES.it.sloganColor,
                letterSpacing: '0.8px',
                lineHeight: 1.35,
                textTransform: 'uppercase',
              }}
            >
              <span>TECHNOLOGY</span>
              <span>PEOPLE</span>
              <span>PROGRESS</span>
            </div>
          </div>

          {/* 4x5 Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(5, 1fr)',
              gap: '3mm 3mm',
              flex: 1,
            }}
          >
            {itItems.map((item, idx) => (
              <div key={`it-${item.id}`} style={{ display: 'flex', justifyContent: 'center' }}>
                <AssetTagCard
                  asset={item}
                  index={idx}
                  originUrl={originUrl}
                  themeMode="it"
                  tagFormat={tagFormat}
                  isPrintOnly={isPrintOnly}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: ADMIN ASSET TAGS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '3.5mm',
              marginBottom: '4.5mm',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArcoBrandLogo iconSize={22} fontSize={16} textColor="#0F172A" />
              <span style={{ fontSize: '16px', color: '#94A3B8', fontWeight: 300 }}>|</span>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: THEMES.admin.primaryColor,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                ADMIN ASSET TAGS (01 - 20)
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontSize: '6.2px',
                fontWeight: 700,
                color: THEMES.admin.sloganColor,
                letterSpacing: '0.8px',
                lineHeight: 1.35,
                textTransform: 'uppercase',
              }}
            >
              <span>PEOPLE</span>
              <span>SPACES</span>
              <span>POSSIBILITIES</span>
            </div>
          </div>

          {/* 4x5 Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(5, 1fr)',
              gap: '3mm 3mm',
              flex: 1,
            }}
          >
            {adminItems.map((item, idx) => (
              <div key={`admin-${item.id}`} style={{ display: 'flex', justifyContent: 'center' }}>
                <AssetTagCard
                  asset={item}
                  index={idx}
                  originUrl={originUrl}
                  themeMode="admin"
                  tagFormat={tagFormat}
                  isPrintOnly={isPrintOnly}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer (Bottom Right) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginTop: '6mm',
          paddingTop: '3mm',
        }}
      >
        <div
          style={{
            fontSize: '6.5px',
            fontWeight: 800,
            color: '#64748B',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          <span>ARCO WORKPLACE</span>
        </div>
        <div
          style={{
            fontSize: '5.8px',
            fontWeight: 600,
            color: '#94A3B8',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '1px',
          }}
        >
          <span>ASSETS TODAY. A BRIGHTER TOMORROW.</span>
          <span style={{ width: '22px', height: '0.8px', backgroundColor: '#CBD5E1' }} />
        </div>
      </div>
    </div>
  );
};

export const AssetLabelModal: React.FC<AssetLabelModalProps> = ({
  isOpen,
  onClose,
  assets,
  title,
}) => {
  const [viewLayout, setViewLayout] = useState<ViewLayoutMode>('dual_sheet');
  const [themeMode, setThemeMode] = useState<AssetThemeMode>('auto');
  const [tagFormat, setTagFormat] = useState<TagFormatMode>('short');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    testedTag: string;
    isValid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setVerificationResult(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || assets.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const ids = assets.map((a) => a.id);
      const isSingle = assets.length === 1 && viewLayout === 'single';
      const effectiveTheme = themeMode === 'auto'
        ? (assets[0]?.category || '').toLowerCase().includes('admin') || (assets[0]?.asset_tag || '').toUpperCase().includes('AD-')
          ? 'admin'
          : 'it'
        : themeMode;

      const blob = await assetsApi.downloadLabelsPdf({
        ids: isSingle ? undefined : ids,
        id: isSingle ? assets[0].id : undefined,
        single: isSingle,
        theme: effectiveTheme,
        layout: viewLayout,
        tagFormat: tagFormat,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isSingle
        ? `asset_tag_${effectiveTheme === 'admin' ? 'AD' : 'IT'}_${assets[0].asset_tag}.pdf`
        : viewLayout === 'dual_sheet'
        ? `asset_tags_master_sheet_dual.pdf`
        : `asset_tags_${effectiveTheme}_sheet_${assets.length}_items.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed downloading tags PDF:', err);
      alert('Failed to generate PDF labels. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setDownloadingExport(true);
    try {
      const ids = assets.map((a) => a.id);
      const isSingle = assets.length === 1;
      const blob = await assetsApi.exportQRData({ ids, format: 'csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isSingle
        ? `qr_tags_${assets[0].asset_tag}.csv`
        : `qr_tags_sheet_${assets.length}_assets.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed exporting QR data:', err);
      alert('Failed to export QR label mapping data.');
    } finally {
      setDownloadingExport(false);
    }
  };

  const handleTestQR = async (asset: Asset) => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await assetsApi.verifyAssetQR(asset.asset_tag);
      setVerificationResult({
        testedTag: asset.asset_tag,
        isValid: res.is_valid,
        message: res.message || `Verified: QR code properly links to ${res.asset_tag} (${res.name})`,
      });
    } catch {
      setVerificationResult({
        testedTag: asset.asset_tag,
        isValid: false,
        message: 'QR Verification failed or asset record not found.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const originUrl = window.location.origin;
  const isSingle = assets.length === 1;
  const primaryAsset = assets[0];
  const modalTitle =
    title ||
    (isSingle
      ? `Asset Tag Badge — ${primaryAsset.asset_tag}`
      : `Print Asset Tags (${assets.length} items)`);

  return (
    <>
      {/* Dynamic Thermal & Sheet Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #arco-tag-print-container, #arco-tag-print-container * {
            visibility: visible !important;
          }
          #arco-tag-print-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          .arco-tag-print-item {
            width: 54mm !important;
            height: 27mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .arco-sheet-print-container {
            width: 270mm !important;
            height: 190mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
          .arco-dual-sheet-print-container {
            width: 540mm !important;
            height: 190mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Hidden Print Container — Rendered ONLY during window.print() */}
      <div id="arco-tag-print-container" aria-hidden="true">
        {viewLayout === 'dual_sheet' ? (
          <DualSheetView originUrl={originUrl} tagFormat={tagFormat} isPrintOnly={true} />
        ) : viewLayout === 'sheet' ? (
          <TagSheetView
            assets={assets}
            originUrl={originUrl}
            themeMode={themeMode}
            tagFormat={tagFormat}
            isPrintOnly={true}
          />
        ) : (
          assets.map((asset, idx) => (
            <div key={asset.id} style={{ margin: '0', pageBreakAfter: 'always' }}>
              <AssetTagCard
                asset={asset}
                index={idx}
                originUrl={originUrl}
                themeMode={themeMode}
                tagFormat={tagFormat}
                isPrintOnly={true}
              />
            </div>
          ))
        )}
      </div>

      {/* Interactive Modal Workspace Layer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 26, 59, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: viewLayout === 'dual_sheet' ? '1080px' : viewLayout === 'sheet' ? '820px' : '580px',
            maxWidth: '96vw',
            maxHeight: '92vh',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 20px 30px -8px rgba(0, 0, 0, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            zIndex: 1101,
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: '#0052CC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Tag size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#172033', margin: 0 }}>
                  {modalTitle}
                </h3>
                <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0 0' }}>
                  Official ARCO Workplace Asset Tag Format · Reference-Accurate QR Badge
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#667085',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Configuration Toolbar */}
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: '#F1F5F9',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '12px',
            }}
          >
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: '#475467', marginRight: '4px' }}>Layout:</span>
              <button
                type="button"
                onClick={() => setViewLayout('dual_sheet')}
                style={{
                  padding: '4px 9px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewLayout === 'dual_sheet' ? '#FFFFFF' : 'transparent',
                  color: viewLayout === 'dual_sheet' ? '#0052CC' : '#64748B',
                  boxShadow: viewLayout === 'dual_sheet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Grid size={13} />
                Master Sheet (IT + ADMIN)
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('sheet')}
                style={{
                  padding: '4px 9px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewLayout === 'sheet' ? '#FFFFFF' : 'transparent',
                  color: viewLayout === 'sheet' ? '#0052CC' : '#64748B',
                  boxShadow: viewLayout === 'sheet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={13} />
                20-Tag Sheet (A4)
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('single')}
                style={{
                  padding: '4px 9px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewLayout === 'single' ? '#FFFFFF' : 'transparent',
                  color: viewLayout === 'single' ? '#0052CC' : '#64748B',
                  boxShadow: viewLayout === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Tag size={13} />
                Single Badge
              </button>
            </div>

            {/* Theme & Tag Format Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {viewLayout !== 'dual_sheet' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#475467' }}>Theme:</span>
                  <select
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value as AssetThemeMode)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '11.5px',
                      color: '#1E293B',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="auto">Auto-Detect Category</option>
                    <option value="it">IT Asset (Blue)</option>
                    <option value="admin">Admin Asset (Green)</option>
                  </select>
                </div>
              )}

              {/* Tag Format Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: '#475467' }}>Tag Code:</span>
                <select
                  value={tagFormat}
                  onChange={(e) => setTagFormat(e.target.value as TagFormatMode)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '11.5px',
                    color: '#1E293B',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="short">Short Code (IT-01 / AD-01)</option>
                  <option value="full">Full Asset Tag (ARCO-IT-001)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Body: Interactive Workspace */}
          <div
            style={{
              padding: '16px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 1. Label Preview Canvas */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: '10px',
                padding: viewLayout === 'dual_sheet' ? '14px 10px' : viewLayout === 'sheet' ? '16px 12px' : '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={13} color="#0052CC" />
                <span>
                  {viewLayout === 'dual_sheet'
                    ? 'Master Reference Sheet Preview (IT & ADMIN 01-20)'
                    : viewLayout === 'sheet'
                    ? '20-Tag Category Sheet Preview (A4 Paper)'
                    : `Asset Tag Preview ${assets.length > 1 ? `(1 of ${assets.length})` : ''}`}
                </span>
              </div>

              {/* Rendered Preview Card / Sheet */}
              {viewLayout === 'single' ? (
                <div style={{ transform: 'scale(1.2)', transformOrigin: 'center center', margin: '12px 0' }}>
                  <AssetTagCard
                    asset={primaryAsset}
                    index={0}
                    originUrl={originUrl}
                    themeMode={themeMode}
                    tagFormat={tagFormat}
                    isPrintOnly={false}
                  />
                </div>
              ) : viewLayout === 'dual_sheet' ? (
                <div
                  style={{
                    transform: 'scale(0.52)',
                    transformOrigin: 'top center',
                    margin: '0 auto',
                    maxWidth: '100%',
                    height: '255px',
                    overflowY: 'auto',
                  }}
                >
                  <DualSheetView
                    originUrl={originUrl}
                    tagFormat={tagFormat}
                    isPrintOnly={false}
                  />
                </div>
              ) : (
                <div
                  style={{
                    transform: 'scale(0.72)',
                    transformOrigin: 'top center',
                    margin: '0 auto',
                    maxWidth: '100%',
                    height: '240px',
                    overflowY: 'auto',
                  }}
                >
                  <TagSheetView
                    assets={assets}
                    originUrl={originUrl}
                    themeMode={themeMode}
                    tagFormat={tagFormat}
                    isPrintOnly={false}
                  />
                </div>
              )}

              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                {viewLayout === 'single'
                  ? 'Sticker Size: 54 mm × 27 mm · Standard Thermal / Vinyl Tag'
                  : viewLayout === 'dual_sheet'
                  ? 'Dual Master Sheet: IT Section (20 Tags) + ADMIN Section (20 Tags)'
                  : 'Sheet Layout: 4 Columns × 5 Rows (20 Asset Tags per Sheet)'}
              </span>
            </div>

            {/* 2. Verification Utility */}
            {isSingle && (
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#1E40AF', display: 'block' }}>
                    QR Linkage Verification
                  </span>
                  <span style={{ fontSize: '11px', color: '#3B82F6' }}>
                    Asset ID: <strong style={{ fontFamily: 'monospace' }}>{primaryAsset.asset_tag}</strong>
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestQR(primaryAsset)}
                  disabled={verifying}
                  leftIcon={<CheckCircle size={14} color="#0052CC" />}
                  style={{ backgroundColor: '#FFFFFF', fontSize: '12px' }}
                >
                  {verifying ? 'Verifying...' : 'Test QR Mapping'}
                </Button>
              </div>
            )}

            {/* Verification Status Alert */}
            {verificationResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: verificationResult.isValid ? '#ECFDF3' : '#FEF2F2',
                  border: `1px solid ${verificationResult.isValid ? '#D1FADF' : '#FECDCA'}`,
                  color: verificationResult.isValid ? '#065F46' : '#991B1B',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} color={verificationResult.isValid ? '#10B981' : '#DC2626'} />
                <span>
                  <strong>[{verificationResult.testedTag}]:</strong> {verificationResult.message}
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer: Action Buttons */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #E5E9F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportCsv}
                disabled={downloadingExport}
                isLoading={downloadingExport}
                leftIcon={<FileText size={14} color="#0052CC" />}
                title="Export QR/Asset dataset for external label software (Figma, Illustrator, BarTender, Zebra)"
              >
                Export CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                isLoading={downloadingPdf}
                leftIcon={<Download size={15} />}
              >
                Download PDF
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handlePrint}
                leftIcon={<Printer size={15} />}
                style={{ backgroundColor: '#0052CC' }}
              >
                {viewLayout === 'dual_sheet'
                  ? 'Print Master Sheet (40 Tags)'
                  : viewLayout === 'sheet'
                  ? 'Print 20-Tag Sheet'
                  : isSingle
                  ? 'Print Asset Tag'
                  : `Print Tags (${assets.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
