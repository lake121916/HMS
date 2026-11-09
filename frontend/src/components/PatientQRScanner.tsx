import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Camera, CameraOff, RefreshCw, AlertTriangle, ShieldCheck,
  ArrowRight, RotateCw, Smartphone, Monitor,
  AlertCircle, ShieldAlert, Sparkles, Search,
  Upload, HelpCircle, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface CameraOption {
  id: string;
  label: string;
}

export interface VerifiedPatient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  phone?: string;
  [key: string]: any;
}

export interface PatientQRScannerProps {
  onPatientVerified?: (result: { patient: VerifiedPatient; verified_at?: string }) => void;
  onContinue?: (result: { patient: VerifiedPatient; verified_at?: string }) => void;
  continueLabel?: string;
  autoStart?: boolean;
  compact?: boolean;
  allowManualInput?: boolean;
  showHeader?: boolean;
}

export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
};

export const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio context may require prior user interaction
  }
};

const triggerHaptic = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    // Ignore unsupported haptics
  }
};

export const PatientQRScanner: React.FC<PatientQRScannerProps> = ({
  onPatientVerified,
  onContinue,
  continueLabel,
  autoStart = false,
  compact = false,
  allowManualInput = true,
  showHeader = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string>('');
  const [permissionNotice, setPermissionNotice] = useState<string>('');
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{ patient: VerifiedPatient; verified_at?: string } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [lastScannedPayload, setLastScannedPayload] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanLockRef = useRef<boolean>(false);
  const uniqueId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const regionElementId = `patient-scanner-view-${uniqueId}`;

  const isSecure = typeof window !== 'undefined' &&
    (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const mobile = isMobileDevice();

  // Helper to determine role-appropriate default continue action
  const getDefaultContinueLabel = () => {
    if (continueLabel) return continueLabel;
    switch (user?.role) {
      case 'receptionist': return 'Open in Reception Workflow';
      case 'doctor': return 'Start Clinical Consultation';
      case 'nurse': return 'Open Triage / Vitals Record';
      case 'lab_technician': return 'Open Lab Dashboard';
      case 'pharmacist': return 'Open Pharmacy Prescriptions';
      case 'cashier': return 'Open Cashier Invoices';
      default: return 'Open Patient Profile';
    }
  };

  const handleRoleNavigation = (patient: VerifiedPatient) => {
    if (onContinue) {
      onContinue({ patient, verified_at: verifiedResult?.verified_at });
      return;
    }
    switch (user?.role) {
      case 'receptionist':
        navigate(`/reception-workflow?patient_id=${patient.id}`);
        break;
      case 'doctor':
        navigate(`/consultation?patient_id=${patient.id}`);
        break;
      case 'nurse':
        navigate(`/nurse?patient_id=${patient.id}`);
        break;
      case 'lab_technician':
        navigate(`/lab-dashboard?patient_id=${patient.id}`);
        break;
      case 'pharmacist':
        navigate(`/pharmacy?patient_id=${patient.id}`);
        break;
      case 'cashier':
        navigate(`/cashier?patient_id=${patient.id}`);
        break;
      default:
        navigate(`/patients/${patient.id}`);
        break;
    }
  };

  // Enumerate cameras
  const refreshAvailableCameras = async (scanner?: Html5Qrcode) => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const mapped = devices.map((d, index) => ({
          id: d.id,
          label: d.label || `Camera ${index + 1}`
        }));
        setCameras(mapped);

        if (scanner) {
          try {
            const trackSettings = scanner.getRunningTrackSettings();
            if (trackSettings?.deviceId) {
              setSelectedCameraId(trackSettings.deviceId);
            }
          } catch {
            // Track settings not available
          }
        }
      }
    } catch (camErr) {
      console.warn('Unable to list cameras:', camErr);
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch (stopErr) {
      console.warn('Error while stopping QR scanner:', stopErr);
    }
  };

  // Process decoded QR content with backend
  const verifyTokenWithBackend = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    const token = rawCode.trim();

    // Prevent repeated duplicate requests if user is just holding the code in view
    if (scanLockRef.current && lastScannedPayload === token) {
      return;
    }

    scanLockRef.current = true;
    setLastScannedPayload(token);
    setLoading(true);
    setError('');

    // Audio and haptic feedback
    playScanBeep();
    triggerHaptic();

    // Pause video scanner while verifying
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        scannerRef.current.pause(true);
      } catch {
        // Fallback if pause not supported
      }
    }

    try {
      const response = await api.post('/patients/scan', { qrContent: token });
      if (response.data.success && response.data.data?.patient) {
        const payload = response.data.data;
        setVerifiedResult(payload);
        if (onPatientVerified) {
          onPatientVerified(payload);
        }
      } else {
        setError('Verification response did not contain patient record.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 404) {
        setError(message || 'Patient QR code is invalid, expired, or has been revoked.');
      } else if (status === 400) {
        setError(message || 'The scanned QR code is not a valid patient identification token.');
      } else if (status === 403) {
        setError('Your user account role is not authorized to scan patient QR codes.');
      } else if (status === 401) {
        setError('Your session has expired. Please sign in again to scan patients.');
      } else {
        setError(message || 'Unable to verify QR token with hospital server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start QR scanning
  const startScanner = async (targetCameraId?: string) => {
    if (scannerRef.current || scanning) return;

    setError('');
    setPermissionNotice('');
    scanLockRef.current = false;

    // Check secure context
    if (!isSecure) {
      setError('Secure Context Warning: Browser camera access generally requires HTTPS. Please access this system via HTTPS or localhost.');
    }

    const scanner = new Html5Qrcode(regionElementId);
    scannerRef.current = scanner;

    // Resolve optimal camera configuration
    let activeCamera = targetCameraId || selectedCameraId;
    if (!activeCamera && cameras.length > 0) {
      if (mobile) {
        const rear = cameras.find(c => /back|rear|environment/i.test(c.label));
        activeCamera = rear ? rear.id : cameras[0].id;
      } else {
        activeCamera = cameras[0].id;
      }
      setSelectedCameraId(activeCamera);
    }

    let cameraConfig: string | MediaTrackConstraints;
    if (activeCamera) {
      cameraConfig = activeCamera;
    } else if (mobile) {
      cameraConfig = { facingMode: facingMode };
    } else {
      cameraConfig = { facingMode: 'user' };
    }

    try {
      await scanner.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(180, Math.min(Math.floor(minEdge * 0.72), 340));
            return { width: size, height: size };
          },
          aspectRatio: compact ? 1.0 : undefined
        },
        decodedText => {
          if (!scanLockRef.current) {
            void verifyTokenWithBackend(decodedText);
          }
        },
        () => {
          // Frame-level decode miss callback (ignore)
        }
      );

      if (scannerRef.current !== scanner) {
        await scanner.stop();
        scanner.clear();
        return;
      }

      setScanning(true);
      await refreshAvailableCameras(scanner);
    } catch (startErr: any) {
      const errString = String(startErr?.name || startErr?.message || startErr);
      console.error('Camera startup error:', startErr);

      // Attempt immediate fallback if constraint failed on specific hardware
      if (errString.includes('OverconstrainedError') || errString.includes('ConstraintNotSatisfied')) {
        try {
          console.warn('Attempting fallback camera configuration...');
          const fallbackScanner = new Html5Qrcode(regionElementId);
          scannerRef.current = fallbackScanner;
          await fallbackScanner.start(
            mobile ? { facingMode: 'environment' } : { facingMode: 'user' },
            {
              fps: 12,
              qrbox: { width: 220, height: 220 }
            },
            decodedText => {
              if (!scanLockRef.current) void verifyTokenWithBackend(decodedText);
            },
            () => {}
          );
          setScanning(true);
          await refreshAvailableCameras(fallbackScanner);
          return;
        } catch (fbErr) {
          console.warn('Fallback camera also failed:', fbErr);
        }
      }

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
        setScanning(false);
      }

      if (errString.includes('NotAllowedError') || errString.includes('PermissionDeniedError')) {
        setPermissionNotice(
          mobile
            ? 'Camera permission was denied. Tap the lock/info icon in your browser address bar (Chrome or Safari), enable Camera permissions, then tap Start Scan again.'
            : 'Camera permission was denied. Click the camera or lock icon in your browser address bar to allow camera access for this hospital portal, then click Start Scan again.'
        );
        setError('Camera permission denied.');
      } else if (errString.includes('NotFoundError') || errString.includes('DevicesNotFoundError')) {
        setError('No camera was detected. Please verify your laptop or desktop webcam is plugged in and recognized.');
      } else if (errString.includes('NotReadableError') || errString.includes('TrackStartError')) {
        setError('Camera is currently busy or reserved by another application (e.g., Zoom, Teams, or another open browser tab). Please close conflicting apps and retry.');
      } else if (errString.includes('OverconstrainedError')) {
        setError('Camera settings were not supported by your hardware. Attempting standard fallback...');
      } else {
        setError('Unable to activate camera. Ensure your device supports WebRTC camera capture over HTTPS or localhost.');
      }

      try {
        scanner.clear();
      } catch {
        // No-op
      }
    }
  };

  const handleSelectCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (!scanning) return;
    await stopScanner();
    await startScanner(cameraId);
  };

  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    if (cameras.length > 1) {
      // Cycle through identified camera devices
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextCam = cameras[(currentIndex + 1) % cameras.length];
      await handleSelectCamera(nextCam.id);
    } else if (scanning) {
      await stopScanner();
      // Restart with new facingMode
      const scanner = new Html5Qrcode(regionElementId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: nextMode },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          decodedText => {
            if (!scanLockRef.current) void verifyTokenWithBackend(decodedText);
          },
          () => undefined
        );
        setScanning(true);
        await refreshAvailableCameras(scanner);
      } catch (e) {
        console.error('Failed to toggle camera facing mode:', e);
      }
    }
  };

  // Rescan / Scan Another Patient
  const handleResetForNewScan = () => {
    setVerifiedResult(null);
    setError('');
    setPermissionNotice('');
    setLastScannedPayload(null);
    scanLockRef.current = false;

    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch {
        // If resume is not supported, start fresh
        void stopScanner().then(() => startScanner());
      }
    } else {
      void startScanner();
    }
  };

  // Manual token submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    void verifyTokenWithBackend(manualToken);
  };

  // Scan from uploaded image or native camera photo snapshot
  const handleScanImageFile = async (file: File) => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await stopScanner();
        } else {
          try {
            scannerRef.current.clear();
          } catch {
            // ignore clear error
          }
        }
        scannerRef.current = null;
      }

      const html5QrCode = new Html5Qrcode(regionElementId);
      scannerRef.current = html5QrCode;

      const decodedText = await html5QrCode.scanFile(file, false);
      try {
        html5QrCode.clear();
        scannerRef.current = null;
      } catch {
        // ignore clear error
      }

      await verifyTokenWithBackend(decodedText);
    } catch (fileErr: any) {
      console.warn('Image QR scan failed:', fileErr);
      const errMsg = typeof fileErr === 'string' ? fileErr : fileErr?.message || '';
      if (errMsg.includes('Cannot start file scan')) {
        setError('Scanner was busy. Please try uploading the image again.');
      } else {
        setError('No valid patient QR code was detected in this photo. Please ensure the QR code is centered, well-lit, and in clear focus, then try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleScanImageFile(file);
    }
    e.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Lifecycle
  useEffect(() => {
    void refreshAvailableCameras();
    if (autoStart) {
      void startScanner();
    }
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        const stopPromise = scanner.isScanning ? scanner.stop() : Promise.resolve();
        void stopPromise
          .then(() => scanner.clear())
          .catch(cleanupErr => console.warn('QR scanner cleanup:', cleanupErr));
      }
    };
  }, []);

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden ${compact ? 'p-4' : 'p-6 lg:p-8'}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Dual-Device Patient QR Scanner
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-full border border-teal-200 dark:border-teal-800">
                  {mobile ? 'Mobile Ready' : 'Webcam Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scan patient QR identity card or wristband token via webcam, laptop, Android or iPhone
              </p>
            </div>
          </div>

          {/* Device Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              {mobile ? <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> : <Monitor className="w-3.5 h-3.5 text-teal-500" />}
              <span>{mobile ? 'Rear Camera Preferred' : 'Desktop / Webcam'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Preview on Left/Top, Controls & Results on Right/Bottom */}
      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        {/* Camera Preview Section */}
        <div className={compact ? 'w-full' : 'lg:col-span-7 flex flex-col'}>
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] lg:min-h-[420px]">
            {/* Target element for html5-qrcode */}
            <div
              id={regionElementId}
              className="w-full h-full min-h-[280px] sm:min-h-[360px] lg:min-h-[400px] flex items-center justify-center"
            />

            {/* Inactive Overlay Placeholder */}
            {!scanning && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-xs text-white">
                <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 ring-8 ring-teal-500/10">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Camera is Standby</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-5">
                  Click <span className="font-bold text-teal-400">Start Scan</span> to activate live camera, or upload/snap a photo if camera access is restricted.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void startScanner()}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-teal-400" />
                    <span>Upload QR / Snap Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scanning Laser Beam Overlay */}
            {scanning && !verifiedResult && !loading && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-6">
                <div className="flex items-center justify-between w-full text-[11px] font-bold text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Optical Feed Active
                  </span>
                  <span>{facingMode === 'environment' ? 'Rear Camera' : 'Front/Webcam'}</span>
                </div>

                {/* Animated Targeting Overlay */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-teal-400/60 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                  {/* Corner accents */}
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                  {/* Horizontal animated scanning laser */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse shadow-[0_0_12px_#2dd4bf]" />
                </div>

                <p className="text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-xl">
                  Align patient QR code steady inside the bounding box
                </p>
              </div>
            )}

            {/* Loading Verification Spinner Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center z-20">
                <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mb-3" />
                <h4 className="text-sm font-bold text-white">Validating Patient Token…</h4>
                <p className="text-xs text-slate-300 mt-1">Verifying cryptographic patient token with hospital backend</p>
              </div>
            )}
          </div>

          {/* Camera Controls Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {!scanning ? (
                <button
                  type="button"
                  onClick={() => void startScanner()}
                  disabled={loading}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Scan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void stopScanner()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Scan</span>
                </button>
              )}

              {/* Upload QR Image / Snap Photo fallback button */}
              <button
                type="button"
                onClick={triggerFileUpload}
                disabled={loading}
                title="Scan QR from saved photo or use camera snapshot without WebRTC permission"
                className="px-3.5 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Upload / Snap Photo</span>
              </button>

              {/* Mobile / Multi-Camera Switch Button */}
              {(cameras.length > 1 || mobile) && (
                <button
                  type="button"
                  onClick={() => void handleToggleFacingMode()}
                  disabled={!scanning}
                  title="Switch between rear and front cameras"
                  className="px-3.5 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden sm:inline">Switch Camera</span>
                </button>
              )}
            </div>

            {/* Camera Dropdown if Multiple Available */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xs">
                <select
                  value={selectedCameraId}
                  onChange={e => void handleSelectCamera(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-teal-500 truncate"
                  aria-label="Select camera hardware"
                >
                  {cameras.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right / Bottom Section: Results, Alerts & Manual Input */}
        <div className={compact ? 'w-full space-y-4' : 'lg:col-span-5 flex flex-col space-y-4'}>
          {/* Permission Instructions Notice if blocked */}
          {permissionNotice && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-2xl text-amber-900 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Camera Access Blocked</h4>
                  <p className="text-xs mt-1 leading-relaxed">{permissionNotice}</p>
                </div>
              </div>

              {/* Instant Alternative: Snap Photo / Upload */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/80 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Snap Photo / Upload QR Instead</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHelpGuide(!showHelpGuide)}
                  className="px-3 py-2 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                  <span>{showHelpGuide ? 'Hide Steps' : 'How to Unblock Camera'}</span>
                  {showHelpGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible Step-by-Step Browser Permission Guide */}
              {showHelpGuide && (
                <div className="mt-2 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-3 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                  <div>
                    <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Google Chrome &amp; Microsoft Edge (PC / Laptop):
                    </h5>
                    <ol className="list-decimal list-inside ml-1 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Look at your browser&apos;s address bar at the very top.</li>
                      <li>Click the <strong>padlock (🔒)</strong>, <strong>tune (🎛️)</strong>, or <strong>camera (📹)</strong> icon on the left edge of the URL.</li>
                      <li>Find <strong>Camera</strong> and toggle it from <em>Block</em> to <strong>Allow</strong>.</li>
                      <li>Reload the page or press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-mono">F5</kbd>, then click <strong>Start Scan</strong>.</li>
                      <li><em>Windows Check:</em> In Windows Settings &gt; Privacy &amp; Security &gt; Camera, confirm &quot;Let desktop apps access your camera&quot; is ON.</li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                      Android Smartphones (Chrome):
                    </h5>
                    <ol className="list-decimal list-inside ml-1 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Tap the <strong>Lock / Settings</strong> icon next to the website URL.</li>
                      <li>Tap <strong>Permissions</strong> &gt; <strong>Camera</strong> &gt; select <strong>Allow</strong>.</li>
                      <li>Reload this page and tap <strong>Start Scan</strong>.</li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                      iPhones &amp; iPads (Safari):
                    </h5>
                    <ol className="list-decimal list-inside ml-1 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Tap the <strong>&quot;aA&quot;</strong> icon on the left of the address bar.</li>
                      <li>Tap <strong>Website Settings</strong> &gt; <strong>Camera</strong> &gt; set to <strong>Allow</strong>.</li>
                      <li>Refresh and tap <strong>Start Scan</strong>.</li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 bg-slate-50 dark:bg-slate-800/50 -mx-3.5 -mb-3.5 p-3 rounded-b-xl text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Accessing via Local Wi-Fi IP (e.g. 192.168.x.x)?</strong> Modern browsers forbid live WebRTC video on plain HTTP. Use <strong>&quot;Snap Photo / Upload QR&quot;</strong> above, which works everywhere on HTTP!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Notification */}
          {error && !permissionNotice && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Scan Rejection</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={handleResetForNewScan}
                    className="mt-2 text-xs font-bold underline hover:no-underline text-red-800 dark:text-red-200 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESSFUL VERIFIED RESULT CARD */}
          {verifiedResult && (
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-800 dark:via-slate-850 dark:to-teal-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Verified Hospital Identity
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                      {verifiedResult.patient.first_name} {verifiedResult.patient.last_name}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs font-black px-3 py-1 bg-teal-700 text-white rounded-xl shadow-xs">
                    {verifiedResult.patient.mrn}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    ID #{verifiedResult.patient.id}
                  </span>
                </div>
              </div>

              {/* Role-Authorized Clinical / Demographic Details */}
              {(verifiedResult.patient.gender || verifiedResult.patient.date_of_birth || verifiedResult.patient.blood_type) && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {verifiedResult.patient.gender && (
                    <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Gender</span>
                      <span className="font-black capitalize text-slate-800 dark:text-slate-100">
                        {verifiedResult.patient.gender}
                      </span>
                    </div>
                  )}

                  {verifiedResult.patient.date_of_birth && (
                    <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">DOB / Age</span>
                      <span className="font-black text-slate-800 dark:text-slate-100">
                        {new Date(verifiedResult.patient.date_of_birth).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  )}

                  {verifiedResult.patient.blood_type && (
                    <div className="bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Type</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {verifiedResult.patient.blood_type}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Allergies Highlight (Clinical & Pharmacist) */}
              {verifiedResult.patient.allergies && (
                <div className="p-3 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Allergies: {verifiedResult.patient.allergies}</span>
                </div>
              )}

              {/* Phone (Receptionist / Manager / Clinical) */}
              {verifiedResult.patient.phone && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-400">Contact:</span> {verifiedResult.patient.phone}
                </div>
              )}

              {/* Primary Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleNavigation(verifiedResult.patient)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>{getDefaultContinueLabel()}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetForNewScan}
                  className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>
            </div>
          )}

          {/* Scanning Instructions Card (When no result is active) */}
          {!verifiedResult && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Scanning Instructions
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Hold the patient’s ID card or wristband 15–25 cm away from the camera.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Ensure good lighting and avoid direct glare on glossy ID card surfaces.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>On mobile phones, tap <strong>Switch Camera</strong> to alternate between rear and front sensors.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>Tokens are cryptographically verified and audited in the hospital access log.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Quick 1-Click Demo Patients for Instant Testing */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Quick Test Verification (1-Click Test)
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">No Camera Needed</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Click any sample patient below to test end-to-end verification and role-based actions immediately:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void verifyTokenWithBackend('1V4F8_NihlS0zk6DEspAqXAdrv0yXUfKTNPR4po-rnU')}
                disabled={loading}
                className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Azanaw Nega (PAT-0001)</span>
              </button>
              <button
                type="button"
                onClick={() => void verifyTokenWithBackend('RoKtAwYAUMp-FRqVJxnL9lsFKyhovP8Ys9KqPK6d0AY')}
                disabled={loading}
                className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>TestSafety Patient (PAT-0002)</span>
              </button>
              <button
                type="button"
                onClick={() => void verifyTokenWithBackend('XJt3mGMewgZmrTwvTO2OsApNOS_hyb-sAmnbmUk3SHQ')}
                disabled={loading}
                className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Dawit Kebede (PAT-0005)</span>
              </button>
            </div>
          </div>

          {/* Manual Token / Barcode Gun Input (Standard in hospital clinics) */}
          {allowManualInput && (
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Barcode Gun / MRN / Manual Token
                </label>
                <span className="text-[10px] text-slate-400">Press Enter or Verify</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="Enter token, MRN (e.g. PAT-0001), or scan with USB gun..."
                  disabled={loading}
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={loading || !manualToken.trim()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Supports QR token (<code className="font-mono">AKEH:PATIENT:...</code>), MRN (<code className="font-mono">PAT-0001</code>), wristband barcode (<code className="font-mono">*PAT-0001*</code>), or numeric ID (<code className="font-mono">1</code>).
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Hidden File Input for Native Camera Snapshot or Uploaded QR Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
};

export default PatientQRScanner;
