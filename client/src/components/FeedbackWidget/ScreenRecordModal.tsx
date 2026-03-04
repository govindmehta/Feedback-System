import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onClose: () => void;
  onRecordingStateChange: (recording: boolean) => void;
  onRegisterStop: (stopFn: () => void) => void;
}

type Phase = 'setup' | 'selecting' | 'recording' | 'stopped' | 'success';
type SubmitStatus = 'idle' | 'submitting' | 'error';

interface SelectionRect { x: number; y: number; width: number; height: number; }

/** Best supported video MIME with Safari fallback. */
function getSupportedVideoMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

export default function ScreenRecordModal({ onClose, onRecordingStateChange, onRegisterStop }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Area-select drag state
  // isDraggingRef / dragStartRef are refs so mouse-move handlers always read fresh values
  // (useState setters are async → stale closure in onMouseMove)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // mirrors isDraggingRef for JSX rendering
  const [selRect, setSelRect] = useState<SelectionRect | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>('');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const stopAllTracks = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    micStreamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (hiddenVideoRef.current) { hiddenVideoRef.current.srcObject = null; hiddenVideoRef.current = null; }
    canvasRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    stopAllTracks();
    onRecordingStateChange(false);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    onClose();
  }, [stopAllTracks, videoUrl, onClose, onRecordingStateChange]);

  useEffect(() => {
    return () => { stopAllTracks(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stop function exposed to parent widget ────────────────────────────────
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    recorderRef.current?.stop();
  }, []);

  useEffect(() => {
    onRegisterStop(stopRecording);
  }, [stopRecording, onRegisterStop]);

  // ── Begin MediaRecorder on a stream ──────────────────────────────────────
  const beginRecording = useCallback(async (
    screenStream: MediaStream,
    cropRect: SelectionRect | null
  ) => {
    setPhase('recording');
    onRecordingStateChange(true);

    // Acquire mic (best effort — proceed without if denied)
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = micStream;
    } catch { /* continue without audio */ }

    let streamToRecord: MediaStream;

    if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
      // ── Canvas crop path ──────────────────────────────────────────────────
      const settings = screenStream.getVideoTracks()[0].getSettings();
      const capW = settings.width || window.innerWidth;
      const capH = settings.height || window.innerHeight;
      const scaleX = capW / window.innerWidth;
      const scaleY = capH / window.innerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropRect.width);
      canvas.height = Math.round(cropRect.height);
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d')!;

      const hv = document.createElement('video');
      hv.srcObject = screenStream;
      hv.muted = true;
      hiddenVideoRef.current = hv;

      const drawFrame = () => {
        ctx.drawImage(
          hv,
          Math.round(cropRect.x * scaleX), Math.round(cropRect.y * scaleY),
          Math.round(cropRect.width * scaleX), Math.round(cropRect.height * scaleY),
          0, 0, canvas.width, canvas.height
        );
        animFrameRef.current = requestAnimationFrame(drawFrame);
      };
      // Play directly — loadedmetadata is unreliable with srcObject MediaStreams
      hv.play().then(drawFrame).catch(() => {
        // Retry once on autoplay block
        hv.muted = true;
        hv.play().then(drawFrame).catch(console.error);
      });

      const canvasStream = canvas.captureStream(30);
      micStream?.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      streamToRecord = canvasStream;
    } else {
      // ── Full tab path ─────────────────────────────────────────────────────
      micStream?.getAudioTracks().forEach(t => screenStream.addTrack(t));
      streamToRecord = screenStream;
    }

    const mimeType = getSupportedVideoMime();
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(streamToRecord, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const finalMime = mimeTypeRef.current || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      videoBlobRef.current = blob;
      setVideoUrl(URL.createObjectURL(blob));
      stopAllTracks();
      onRecordingStateChange(false);
      setPhase('stopped');
    };

    recorder.start(250);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }, [stopAllTracks, onRecordingStateChange]);

  // ── Initiate browser tab-only capture ────────────────────────────────────
  const initiateCapture = async (type: 'full' | 'area') => {
    setErrorMsg('');
    try {
      // preferCurrentTab   — Chrome 107+: pre-selects this tab, hides other tabs
      // selfBrowserSurface  — ensures the current tab is always in the list
      // surfaceSwitching    — removes the "Switch tab" control from the share bar
      // displaySurface      — restricts the picker to browser tabs only
      const displayOptions = {
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        video: { displaySurface: 'browser', frameRate: 30 },
        audio: false,
      } as DisplayMediaStreamOptions;

      const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      screenStreamRef.current = stream;

      // If user stops via browser's native share bar
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorderRef.current?.state === 'recording') stopRecording();
      });

      if (type === 'area') {
        setSelRect(null);
        setPhase('selecting');
      } else {
        await beginRecording(stream, null);
      }
    } catch (err: unknown) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
        setErrorMsg('Recording permission denied. Click \'Allow\' on the browser prompt to record this tab.');
      } else {
        setErrorMsg('Unable to start recording. Please use Chrome 107+ and ensure the page is served over HTTPS.');
      }
    }
  };

  // ── Area selection drag handlers ─────────────────────────────────────────
  const onOverlayMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setSelRect(null);
  };
  const onOverlayMouseMove = (e: React.MouseEvent) => {
    // Read from ref — never stale, unlike reading isDragging state in a closure
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const ds = dragStartRef.current;
    setSelRect({
      x: Math.min(e.clientX, ds.x),
      y: Math.min(e.clientY, ds.y),
      width: Math.abs(e.clientX - ds.x),
      height: Math.abs(e.clientY - ds.y),
    });
  };
  const onOverlayMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };
  const cancelSelection = () => { stopAllTracks(); setPhase('setup'); setSelRect(null); };
  const confirmSelection = () => {
    if (!selRect || selRect.width < 20 || selRect.height < 20 || !screenStreamRef.current) return;
    beginRecording(screenStreamRef.current, selRect);
  };

  // ── Preview video ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoUrl && videoPreviewRef.current) videoPreviewRef.current.src = videoUrl;
  }, [videoUrl]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!videoBlobRef.current) return;
    setSubmitStatus('submitting');
    setErrorMsg('');
    try {
      // blob.type can be empty in some browsers — fall back to the mime we
      // explicitly configured in mimeTypeRef before starting the MediaRecorder
      const rawMime = videoBlobRef.current.type || mimeTypeRef.current || 'video/webm';
      const baseMime = rawMime.split(';')[0].trim(); // strip codecs suffix
      const ext = baseMime.includes('mp4') ? '.mp4' : '.webm';
      // Send baseMime as the File type so multer gets a clean content-type header
      const videoFile = new File([videoBlobRef.current], `screen-recording${ext}`, { type: baseMime });
      const fd = new FormData();
      fd.append('video', videoFile);
      fd.append('currentUrl', window.location.href);
      fd.append('userAgent', navigator.userAgent);
      const res = await fetch('/api/feedback/screen', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Server error');
      setPhase('success');
      setTimeout(() => handleClose(), 1800);
    } catch {
      setSubmitStatus('error');
      setErrorMsg('Upload failed. Please try again.');
    }
  };

  const resetRecording = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    videoBlobRef.current = null;
    setPhase('setup');
    setElapsed(0);
    setSubmitStatus('idle');
    setErrorMsg('');
    setSelRect(null);
  };

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  // ── Area selection overlay ────────────────────────────────────────────────
  if (phase === 'selecting') {
    return (
      <div
        className="fw-area-overlay"
        onMouseDown={onOverlayMouseDown}
        onMouseMove={onOverlayMouseMove}
        onMouseUp={onOverlayMouseUp}
      >
        {(!selRect || selRect.width < 5) && (
          <div className="fw-area-instructions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4" />
            </svg>
            Click and drag to select the area to record
          </div>
        )}

        {selRect && selRect.width > 4 && selRect.height > 4 && (
          <div
            className="fw-selection-box"
            style={{ left: selRect.x, top: selRect.y, width: selRect.width, height: selRect.height }}
          >
            <span className="fw-sel-dim">{Math.round(selRect.width)} × {Math.round(selRect.height)}</span>
          </div>
        )}

        {!isDragging && selRect && selRect.width >= 20 && selRect.height >= 20 && (
          <div
            className="fw-area-confirm"
            style={{
              left: Math.min(selRect.x + selRect.width / 2, window.innerWidth - 220),
              top: Math.min(selRect.y + selRect.height + 14, window.innerHeight - 68),
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <button className="fw-btn fw-btn--primary" onClick={confirmSelection}>
              Record This Area
            </button>
            <button className="fw-btn fw-btn--ghost" onClick={() => setSelRect(null)}>
              Re-draw
            </button>
          </div>
        )}

        <button
          className="fw-area-cancel-btn"
          onMouseDown={e => e.stopPropagation()}
          onClick={cancelSelection}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}>
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Cancel
        </button>
      </div>
    );
  }

  // ── During recording → render nothing; parent widget renders mini stop pill
  if (phase === 'recording') {
    return <span aria-hidden data-elapsed={elapsed} style={{ display: 'none' }} />;
  }

  // ── Modal (setup / stopped / success) ────────────────────────────────────
  return (
    <div className="fw-backdrop" onClick={phase === 'setup' ? handleClose : undefined}>
      <div
        className="fw-modal fw-modal--wide"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Screen recording"
      >
        <div className="fw-modal-header">
          <h2 className="fw-modal-title">
            <span className="fw-modal-icon fw-modal-icon--screen">
              {/* Video-camera icon — clearly recording, not screen-sharing */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </span>
            Screen Recording
          </h2>
          <button className="fw-modal-close" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Success */}
        {phase === 'success' && (
          <div className="fw-success">
            <div className="fw-success-icon">✓</div>
            <p>Recording uploaded!</p>
          </div>
        )}

        {/* Review */}
        {phase === 'stopped' && (
          <div className="fw-modal-body">
            {videoUrl && (
              <div className="fw-video-review">
                <video ref={videoPreviewRef} controls className="fw-video-player" preload="metadata" />
                <button className="fw-record-btn fw-record-btn--secondary" onClick={resetRecording}>
                  Re-record
                </button>
              </div>
            )}
            {errorMsg && <p className="fw-error">{errorMsg}</p>}
            <div className="fw-modal-footer">
              <button type="button" className="fw-btn fw-btn--ghost" onClick={handleClose}>Discard</button>
              <button
                type="button"
                className="fw-btn fw-btn--primary"
                onClick={handleSubmit}
                disabled={!videoBlobRef.current || submitStatus === 'submitting'}
              >
                {submitStatus === 'submitting' ? <><span className="fw-spinner" /> Uploading…</> : 'Send Recording'}
              </button>
            </div>
          </div>
        )}

        {/* Setup: single start button — no confusing share-style picker */}
        {phase === 'setup' && (
          <div className="fw-modal-body">
            <div className="fw-rec-start-area">
              <div className="fw-rec-dot-ring">
                <span className="fw-rec-dot" />
              </div>
              <p className="fw-screen-desc">
                Records only this browser tab. No other windows or tabs are accessible.
              </p>
              <button
                type="button"
                className="fw-btn fw-btn--primary fw-btn--lg"
                onClick={() => initiateCapture('full')}
              >
                Start Recording
              </button>
              <button
                type="button"
                className="fw-btn-link"
                onClick={() => initiateCapture('area')}
              >
                Select a specific area instead
              </button>
            </div>
            {errorMsg && <p className="fw-error">{errorMsg}</p>}
            <div className="fw-modal-footer">
              <button type="button" className="fw-btn fw-btn--ghost" onClick={handleClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
