import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Camera,
  Search,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Scan,
  Zap,
  ZoomIn,
  ZoomOut,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '../ui';
import { assetsApi } from '../../api/assets';
import type { Asset } from '../../types';

export type CameraState =
  | 'INITIALIZING'
  | 'READY'
  | 'PERMISSION_DENIED'
  | 'SECURE_CONTEXT_REQUIRED'
  | 'NOT_FOUND'
  | 'IN_USE'
  | 'QR_DETECTED'
  | 'UNKNOWN_QR'
  | 'ERROR';

interface AssetScannerCoreProps {
  onAssetResolved: (assetTag: string) => void;
  containerId?: string;
  autoStart?: boolean;
}

/**
 * Robust asset tag extractor supporting:
 * - Full URLs: https://.../assets/ARCO-IT-0001 or http://.../assets/IT-01
 * - Relative URLs: /assets/IT-01, /assets/ARCO-AD-0002
 * - Query Params: ?tag=IT-01, ?asset=ARCO-IT-0001, ?id=1
 * - JSON Payloads: {"tag":"IT-01"} or {"asset_tag":"ARCO-IT-0001"}
 * - Direct strings: IT-01, AD-01, ARCO-IT-0001, etc.
 */
export const extractAssetTag = (decodedText: string): string => {
  const trimmed = decodedText.trim();

  // 1. Try parsing JSON payload
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const tag = parsed.tag || parsed.asset_tag || parsed.assetId || parsed.code || parsed.id;
      if (tag) {
        return String(tag).trim().toUpperCase();
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // 2. Deep URL matching: /assets/{tag} or /qr/{tag} or /view/{tag}
  const matchUrl = trimmed.match(/\/(?:assets|qr|view|asset-details)\/([A-Za-z0-9_-]+)/i);
  if (matchUrl && matchUrl[1]) {
    return matchUrl[1].toUpperCase();
  }

  // 3. Query params: ?tag=... or ?asset=... or ?id=...
  const matchQuery = trimmed.match(/[?&](?:tag|asset|asset_tag|code|id)=([A-Za-z0-9_-]+)/i);
  if (matchQuery && matchQuery[1]) {
    return matchQuery[1].toUpperCase();
  }

  // 4. Clean plain string / barcode
  return trimmed
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/["'{}]/g, '')
    .trim()
    .toUpperCase();
};

export const AssetScannerCore: React.FC<AssetScannerCoreProps> = ({
  onAssetResolved,
  containerId = 'arco-core-qr-reader',
  autoStart = true,
}) => {
  const [cameraState, setCameraState] = useState<CameraState>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedTag, setDetectedTag] = useState<string>('');
  const [resolvedAsset, setResolvedAsset] = useState<Asset | null>(null);
  const [manualTag, setManualTag] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Zoom & Torch controls for small/resized stickers
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('[AssetScanner] Warning stopping Html5Qrcode:', err);
    } finally {
      html5QrCodeRef.current = null;
    }

    // Explicitly stop all video tracks on any lingering video elements
    try {
      const container = document.getElementById(containerId);
      if (container) {
        const videos = container.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              track.stop();
            });
            video.srcObject = null;
          }
        }
      }
    } catch (err) {
      console.warn('[AssetScanner] Error releasing media tracks:', err);
    }

    setIsTorchOn(false);
    isStoppingRef.current = false;
  }, [containerId]);

  const handleSuccessfulScan = useCallback(
    async (decodedText: string) => {
      const tag = extractAssetTag(decodedText);
      setDetectedTag(tag);
      setCameraState('QR_DETECTED');
      setIsSearching(true);

      // Stop camera stream immediately
      await stopCamera();

      // Verify and fetch asset details with backend
      try {
        const assetData = await assetsApi.getAsset(tag);
        if (isMountedRef.current) {
          setResolvedAsset(assetData);
          setIsSearching(false);
          // Automatically resolve after a brief visual confirmation
          setTimeout(() => {
            if (isMountedRef.current) {
              onAssetResolved(assetData.asset_tag);
            }
          }, 450);
        }
      } catch (err: unknown) {
        console.warn('[AssetScanner] Asset lookup failed for tag:', tag, err);
        if (isMountedRef.current) {
          setCameraState('UNKNOWN_QR');
          setIsSearching(false);
        }
      }
    },
    [onAssetResolved, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setManualError(null);
    setResolvedAsset(null);
    setCameraState('INITIALIZING');
    setZoomLevel(1.0);

    // 1. Check for Secure Context
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    if (!window.isSecureContext && !isLocalhost) {
      console.warn('[AssetScanner] Non-secure origin detected:', window.location.origin);
      setCameraState('SECURE_CONTEXT_REQUIRED');
      return;
    }

    // 2. Check for navigator.mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[AssetScanner] MediaDevices API not supported or disabled');
      if (!window.isSecureContext) {
        setCameraState('SECURE_CONTEXT_REQUIRED');
      } else {
        setCameraState('NOT_FOUND');
      }
      return;
    }

    // Stop any existing instance first
    await stopCamera();

    // Delay briefly to allow container DOM element to mount
    setTimeout(async () => {
      if (!isMountedRef.current) return;

      const domElement = document.getElementById(containerId);
      if (!domElement) {
        console.warn('[AssetScanner] Scanner container element not found:', containerId);
        setCameraState('ERROR');
        setErrorMessage('Scanner container element could not be found.');
        return;
      }

      try {
        const qrScanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = qrScanner;

        // 1. Enumerate and select the best available camera
        let cameraToUse: string | { facingMode: string | { ideal: string } } = {
          facingMode: { ideal: 'environment' },
        };

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            // If multiple cameras (mobile), pick back camera if available; otherwise pick first available camera (PC webcam)
            const backCam = devices.find((d) => /back|rear|environment|world/i.test(d.label));
            cameraToUse = backCam ? backCam.id : devices[0].id;
          } else {
            cameraToUse = { facingMode: { ideal: 'environment' } };
          }
        } catch (e) {
          console.warn('[AssetScanner] getCameras failed or not supported, using ideal fallback:', e);
          cameraToUse = { facingMode: { ideal: 'environment' } };
        }

        // Optimized camera configuration for small stickers & high accuracy
        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.85);
            return {
              width: Math.max(180, Math.min(qrboxSize, 320)),
              height: Math.max(180, Math.min(qrboxSize, 320)),
            };
          },
          aspectRatio: undefined,
        };

        await qrScanner.start(
          cameraToUse,
          config,
          (decodedText) => {
            handleSuccessfulScan(decodedText);
          },
          () => {
            // Frame scanning heartbeat
          }
        );

        if (isMountedRef.current) {
          setCameraState('READY');

          // Check if torch/zoom capabilities exist on the active video track
          try {
            const video = domElement.querySelector('video');
            if (video && video.srcObject) {
              const stream = video.srcObject as MediaStream;
              const [track] = stream.getVideoTracks();
              const capabilities = track.getCapabilities?.() as unknown as { torch?: boolean; zoom?: { max: number; min: number } };
              if (capabilities && capabilities.torch) {
                setHasTorch(true);
              }
            }
          } catch {
            // Capabilities inspection fallback
          }
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        console.warn('[AssetScanner] Camera start error:', err);

        const errorObj = err as { name?: string; message?: string };
        const errName = errorObj?.name || '';
        const errMsg = (errorObj?.message || String(err)).toLowerCase();

        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('permission') ||
          errMsg.includes('denied')
        ) {
          setCameraState('PERMISSION_DENIED');
        } else if (
          errName === 'NotFoundError' ||
          errName === 'DevicesNotFoundError' ||
          errMsg.includes('not found') ||
          errMsg.includes('no camera')
        ) {
          setCameraState('NOT_FOUND');
        } else if (
          errName === 'NotReadableError' ||
          errName === 'TrackStartError' ||
          errMsg.includes('could not start video source') ||
          errMsg.includes('in use')
        ) {
          setCameraState('IN_USE');
        } else if (
          errName === 'SecurityError' ||
          !window.isSecureContext ||
          errMsg.includes('secure') ||
          errMsg.includes('https')
        ) {
          setCameraState('SECURE_CONTEXT_REQUIRED');
        } else if (errName === 'OverconstrainedError') {
          setCameraState('ERROR');
          setErrorMessage('The requested camera settings are not supported on this device.');
        } else {
          setCameraState('ERROR');
          setErrorMessage(errorObj?.message || 'Could not access the camera on this device.');
        }
      }
    }, 180);
  }, [containerId, handleSuccessfulScan, stopCamera]);

  // Zoom control for small physical pieces
  const handleZoom = (level: number) => {
    setZoomLevel(level);
    const container = document.getElementById(containerId);
    if (container) {
      const video = container.querySelector('video');
      if (video) {
        // Apply hardware zoom constraint if supported
        try {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            const [track] = stream.getVideoTracks();
            const capabilities = track.getCapabilities?.() as unknown as { zoom?: { max: number; min: number } };
            if (capabilities && capabilities.zoom) {
              const clamped = Math.min(capabilities.zoom.max || 3, Math.max(capabilities.zoom.min || 1, level));
              (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
                advanced: [{ zoom: clamped }],
              });
              return;
            }
          }
        } catch {
          // Hardware zoom unsupported, fall through to CSS zoom
        }
        // Digital CSS scale zoom
        video.style.transform = level > 1 ? `scale(${level})` : 'none';
        video.style.transformOrigin = 'center center';
        video.style.transition = 'transform 0.15s ease';
      }
    }
  };

  // Flashlight / Torch toggle
  const toggleTorch = async () => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const video = container.querySelector('video');
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject as MediaStream;
        const [track] = stream.getVideoTracks();
        const nextState = !isTorchOn;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // File-based image QR decoding
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setCameraState('INITIALIZING');

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err) {
      console.warn('File QR decode failed:', err);
      setCameraState('ERROR');
      setErrorMessage('Could not decode QR code from the selected image. Please try another photo.');
      setIsSearching(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (autoStart) {
      startCamera();
    }

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = manualTag.trim().toUpperCase();
    if (!tag) {
      setManualError('Please enter an Asset ID (e.g. IT-01 or ARCO-IT-0001).');
      return;
    }

    setIsSearching(true);
    setManualError(null);
    try {
      const assetData = await assetsApi.getAsset(tag);
      await stopCamera();
      onAssetResolved(assetData.asset_tag);
    } catch {
      setManualError(`Asset "${tag}" not found in ARCO database.`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Hidden file input for Photo/Image Scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileScan}
      />

      {/* Live Camera Viewport Card */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#070D1E',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #1E293B',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* The HTML5 QR Code Container */}
        <div
          id={containerId}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '300px',
            display: cameraState === 'READY' ? 'block' : 'none',
          }}
        />

        {/* Reticle / Viewfinder Overlay when Camera is Ready */}
        {cameraState === 'READY' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px',
            }}
          >
            {/* Top Viewfinder HUD */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pointerEvents: 'auto',
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#22C55E',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                High-Res Scanner
              </div>

              {/* Torch button if available */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  style={{
                    backgroundColor: isTorchOn ? '#F59E0B' : 'rgba(15, 23, 42, 0.8)',
                    color: isTorchOn ? '#000000' : '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Zap size={12} />
                  {isTorchOn ? 'Flash On' : 'Flash'}
                </button>
              )}
            </div>

            {/* Bottom Controls: Zoom Buttons (1x, 1.5x, 2x, 3x) for Small Stickers */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'auto',
              }}
            >
              {/* Zoom Buttons Toolbar */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  borderRadius: '20px',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, padding: '0 4px' }}>
                  Zoom:
                </span>
                {[1.0, 1.5, 2.0, 2.5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleZoom(lvl)}
                    style={{
                      backgroundColor: zoomLevel === lvl ? '#2563EB' : 'transparent',
                      color: zoomLevel === lvl ? '#FFFFFF' : '#CBD5E1',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lvl}×
                  </button>
                ))}
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#94A3B8',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backdropFilter: 'blur(4px)',
                }}
              >
                Hold sticker inside frame (use zoom for small tags)
              </div>
            </div>
          </div>
        )}

        {/* STATE A — INITIALIZING */}
        {cameraState === 'INITIALIZING' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(11, 19, 43, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#FFFFFF',
              padding: '20px',
            }}
          >
            <RefreshCw size={28} className="animate-spin" color="#60A5FA" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px 0' }}>
                Calibrating Scanner...
              </p>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                Connecting high-resolution camera feed
              </p>
            </div>
          </div>
        )}

        {/* STATE B — PERMISSION DENIED */}
        {cameraState === 'PERMISSION_DENIED' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <ShieldAlert size={36} color="#F87171" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEE2E2', margin: '0 0 6px 0' }}>
              Camera Access Blocked
            </p>
            <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5, maxWidth: '320px' }}>
              Please allow camera permissions in your browser or system settings, then tap Try Again.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<RefreshCw size={14} />}
              style={{ fontSize: '12px' }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* STATE C — SECURE CONTEXT REQUIRED */}
        {cameraState === 'SECURE_CONTEXT_REQUIRED' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <ShieldAlert size={36} color="#FBBF24" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEF3C7', margin: '0 0 6px 0' }}>
              Camera scanning unavailable
            </p>
            <p style={{ fontSize: '12.5px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5, maxWidth: '320px' }}>
              Camera access requires a secure HTTPS connection.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<RefreshCw size={14} />}
              style={{ fontSize: '12px' }}
            >
              Try Camera Again
            </Button>
          </div>
        )}

        {/* STATE: NOT FOUND */}
        {cameraState === 'NOT_FOUND' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <AlertCircle size={36} color="#FBBF24" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEF3C7', margin: '0 0 6px 0' }}>
              No Camera Detected
            </p>
            <p style={{ fontSize: '12.5px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5, maxWidth: '320px' }}>
              No active camera was found on this device. You can scan from a photo or use manual lookup below.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<RefreshCw size={14} />}
              style={{ fontSize: '12px' }}
            >
              Try Camera Again
            </Button>
          </div>
        )}

        {/* STATE: IN USE */}
        {cameraState === 'IN_USE' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <AlertCircle size={36} color="#F87171" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEE2E2', margin: '0 0 6px 0' }}>
              Camera In Use
            </p>
            <p style={{ fontSize: '12.5px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5, maxWidth: '320px' }}>
              The camera is currently being used by another application. Please close other camera apps and try again.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<RefreshCw size={14} />}
              style={{ fontSize: '12px' }}
            >
              Try Camera Again
            </Button>
          </div>
        )}

        {/* STATE D — QR DETECTED (RESOLVING WITH INSTANT FEEDBACK) */}
        {cameraState === 'QR_DETECTED' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#FFFFFF',
              padding: '20px',
            }}
          >
            <CheckCircle2 size={38} color="#22C55E" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '15.5px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 4px 0' }}>
                Asset Tag Detected!
              </p>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#60A5FA',
                  margin: '6px 0',
                }}
              >
                {resolvedAsset?.asset_tag || detectedTag}
              </div>
              {resolvedAsset && (
                <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                  <strong>{resolvedAsset.name}</strong> ({(resolvedAsset.category || 'IT').toUpperCase()})
                </div>
              )}
              <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '6px 0 0 0' }}>
                Opening asset details...
              </p>
            </div>
          </div>
        )}

        {/* STATE E — UNKNOWN QR */}
        {cameraState === 'UNKNOWN_QR' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <HelpCircle size={36} color="#F87171" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEE2E2', margin: '0 0 4px 0' }}>
              Asset Not Found
            </p>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 8px 0' }}>
              Scanned code is not registered in ARCO Workplace:
            </p>
            <div
              style={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#F87171',
                marginBottom: '16px',
              }}
            >
              {detectedTag || 'UNKNOWN'}
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<Scan size={14} />}
              style={{ fontSize: '12px' }}
            >
              Scan Again
            </Button>
          </div>
        )}

        {/* GENERAL ERROR STATE */}
        {cameraState === 'ERROR' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            <AlertCircle size={36} color="#F87171" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FEE2E2', margin: '0 0 6px 0' }}>
              Camera Scanning Error
            </p>
            <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5, maxWidth: '320px' }}>
              {errorMessage || 'Unable to access the camera. You can upload an image or enter the tag below.'}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={startCamera}
                leftIcon={<RefreshCw size={14} />}
                style={{ fontSize: '12px' }}
              >
                Try Camera Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Alternative Options: Scan from Photo / Image File */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
          }}
        >
          <Upload size={13} />
          Scan from Photo / Image File
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '0' }}>
        <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
        <span
          style={{
            padding: '0 12px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          OR MANUAL LOOKUP
        </span>
        <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
      </div>

      {/* Manual Asset Tag Lookup Fallback */}
      <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label
            htmlFor="manual-asset-tag-input"
            style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#344054', marginBottom: '5px' }}
          >
            Asset Tag / Short Code
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="manual-asset-tag-input"
              type="text"
              placeholder="e.g. IT-01, AD-01, or ARCO-IT-0001"
              value={manualTag}
              onChange={(e) => {
                setManualTag(e.target.value.toUpperCase());
                setManualError(null);
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 38px 0 12px',
                borderRadius: '6px',
                border: '1px solid #D0D5DD',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.5px',
                color: '#101828',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#98A2B3',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {manualError && (
          <div
            style={{
              fontSize: '12px',
              color: '#B42318',
              backgroundColor: '#FEF3F2',
              border: '1px solid #FECDCA',
              borderRadius: '6px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={15} color="#D92D20" style={{ flexShrink: 0 }} />
            <span>{manualError}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isSearching || !manualTag.trim()}
          isLoading={isSearching}
          rightIcon={<ArrowRight size={15} />}
          style={{ width: '100%', justifyContent: 'center', height: '38px', fontSize: '13px' }}
        >
          Open Asset
        </Button>
      </form>
    </div>
  );
};
