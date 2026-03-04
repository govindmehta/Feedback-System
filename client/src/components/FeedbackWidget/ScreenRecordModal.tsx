import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

type RecordState = 'idle' | 'recording' | 'stopped';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/** Pick the best supported MIME type with Safari fallback. */
function getSupportedVideoMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export default function ScreenRecordModal({ onClose }: Props) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // ── Cleanup all tracks ─────────────────────────────────────────────────────
  const stopAllTracks = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    micStreamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    // Stop any ongoing recording before closing
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    stopAllTracks();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    onClose();
  }, [stopAllTracks, videoUrl, onClose]);

  useEffect(() => {
    return () => {
      stopAllTracks();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg('');
    try {
      // 1. Capture screen (no video from camera)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false, // we handle audio separately
      });
      screenStreamRef.current = screenStream;

      // 2. Capture mic audio separately
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamRef.current = micStream;
      } catch (micErr: unknown) {
        const name = (micErr as DOMException).name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          throw Object.assign(new DOMException('Mic denied', 'NotAllowedError'), { isMic: true });
        }
        // Mic unavailable but not denied — proceed without audio
      }

      // 3. Merge: add mic audio track into the screen stream
      if (micStream) {
        micStream.getAudioTracks().forEach(track => screenStream.addTrack(track));
      }

      // 4. Initialize MediaRecorder with merged stream
      const mimeType = getSupportedVideoMime();
      const recorder = new MediaRecorder(screenStream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        videoBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        stopAllTracks();
        setRecordState('stopped');
      };

      // If user stops sharing via browser UI
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
          if (timerRef.current) clearInterval(timerRef.current);
        }
      });

      recorder.start(250);
      setRecordState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err: unknown) {
      stopAllTracks();
      const e = err as DOMException & { isMic?: boolean };
      if (e.isMic) {
        setErrorMsg('Microphone access is required for this feedback type. Please check your browser settings.');
      } else if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
        setErrorMsg('Screen sharing was denied. Please allow screen access when prompted.');
      } else {
        setErrorMsg('Unable to start screen recording. Your browser may not support this feature.');
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  // ── Preview video when ready ───────────────────────────────────────────────
  useEffect(() => {
    if (videoUrl && videoPreviewRef.current) {
      videoPreviewRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!videoBlobRef.current) return;
    setSubmitStatus('submitting');
    setErrorMsg('');

    try {
      const mimeType = videoBlobRef.current.type || 'video/webm';
      const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
      const videoFile = new File([videoBlobRef.current], `screen-recording${ext}`, { type: mimeType });

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('currentUrl', window.location.href);
      formData.append('userAgent', navigator.userAgent);

      const res = await fetch('/api/feedback/screen', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Server error');

      setSubmitStatus('success');
      setTimeout(() => handleClose(), 1800);
    } catch {
      setSubmitStatus('error');
      setErrorMsg('Upload failed. Please try again.');
    }
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const resetRecording = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    videoBlobRef.current = null;
    setRecordState('idle');
    setElapsed(0);
    setSubmitStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="fw-backdrop" onClick={handleClose}>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
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

        {submitStatus === 'success' ? (
          <div className="fw-success">
            <div className="fw-success-icon">✓</div>
            <p>Recording uploaded!</p>
          </div>
        ) : (
          <div className="fw-modal-body">
            <div className="fw-recorder">
              {recordState === 'idle' && (
                <div className="fw-screen-idle">
                  <div className="fw-screen-hint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40}>
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <p>Records your screen + microphone audio.<br />No webcam is captured.</p>
                  </div>
                  <button className="fw-record-btn fw-record-btn--start" onClick={startRecording}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    Start Screen Recording
                  </button>
                </div>
              )}

              {recordState === 'recording' && (
                <div className="fw-recording-active">
                  <div className="fw-pulse-ring fw-pulse-ring--screen" />
                  <span className="fw-timer">{fmtTime(elapsed)}</span>
                  <p className="fw-recording-hint">Recording your screen…</p>
                  <button className="fw-record-btn fw-record-btn--stop" onClick={stopRecording}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    Stop Recording
                  </button>
                </div>
              )}

              {recordState === 'stopped' && videoUrl && (
                <div className="fw-video-review">
                  <video
                    ref={videoPreviewRef}
                    controls
                    className="fw-video-player"
                    preload="metadata"
                  />
                  <button className="fw-record-btn fw-record-btn--secondary" onClick={resetRecording}>
                    Re-record
                  </button>
                </div>
              )}
            </div>

            {errorMsg && <p className="fw-error">{errorMsg}</p>}

            <div className="fw-modal-footer">
              <button type="button" className="fw-btn fw-btn--ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="fw-btn fw-btn--primary"
                onClick={handleSubmit}
                disabled={!videoBlobRef.current || submitStatus === 'submitting'}
              >
                {submitStatus === 'submitting' ? (
                  <><span className="fw-spinner" /> Uploading…</>
                ) : (
                  'Send Recording'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
