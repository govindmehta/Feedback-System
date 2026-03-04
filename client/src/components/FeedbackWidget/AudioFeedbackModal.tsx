import { useState, useRef, useEffect, useCallback } from 'react';
import ImageUpload from './ImageUpload';
import { ImageAttachment } from './types';

interface Props {
  onClose: () => void;
}

type RecordState = 'idle' | 'recording' | 'stopped';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export default function AudioFeedbackModal({ onClose }: Props) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [image, setImage] = useState<ImageAttachment | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // ── Cleanup all resources ──────────────────────────────────────────────────
  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    stopAllTracks();
    recorderRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    onClose();
  }, [stopAllTracks, audioUrl, image, onClose]);

  useEffect(() => {
    return () => {
      stopAllTracks();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopAllTracks();
        setRecordState('stopped');
      };

      recorder.start(250);
      setRecordState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err: unknown) {
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setErrorMsg('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
      } else {
        setErrorMsg('Could not access microphone. Please check your device settings.');
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!audioBlobRef.current) return;
    setSubmitStatus('submitting');
    setErrorMsg('');

    try {
      const mimeType = audioBlobRef.current.type || 'audio/webm';
      const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('ogg') ? '.ogg' : '.webm';
      const audioFile = new File([audioBlobRef.current], `recording${ext}`, { type: mimeType });

      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('currentUrl', window.location.href);
      formData.append('userAgent', navigator.userAgent);
      if (image?.file) formData.append('image', image.file);

      const res = await fetch('/api/feedback/audio', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Server error');

      setSubmitStatus('success');
      setTimeout(() => handleClose(), 1800);
    } catch {
      setSubmitStatus('error');
      setErrorMsg('Upload failed. Please try again.');
    }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fw-backdrop" onClick={handleClose}>
      <div className="fw-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal aria-label="Audio feedback">
        <div className="fw-modal-header">
          <h2 className="fw-modal-title">
            <span className="fw-modal-icon fw-modal-icon--audio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </span>
            Audio Feedback
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
            <p>Audio feedback saved!</p>
          </div>
        ) : (
          <div className="fw-modal-body">
            {/* Recorder UI */}
            <div className="fw-recorder">
              {recordState === 'idle' && (
                <button className="fw-record-btn fw-record-btn--start" onClick={startRecording}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  Start Recording
                </button>
              )}

              {recordState === 'recording' && (
                <div className="fw-recording-active">
                  <div className="fw-pulse-ring" />
                  <span className="fw-timer">{fmtTime(elapsed)}</span>
                  <button className="fw-record-btn fw-record-btn--stop" onClick={stopRecording}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    Stop
                  </button>
                </div>
              )}

              {recordState === 'stopped' && audioUrl && (
                <div className="fw-audio-review">
                  <audio controls src={audioUrl} className="fw-audio-player" />
                  <button
                    className="fw-record-btn fw-record-btn--secondary"
                    onClick={() => {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl(null);
                      audioBlobRef.current = null;
                      setRecordState('idle');
                      setElapsed(0);
                    }}
                  >
                    Re-record
                  </button>
                </div>
              )}
            </div>

            <ImageUpload attachment={image} onChange={setImage} />

            {errorMsg && <p className="fw-error">{errorMsg}</p>}

            <div className="fw-modal-footer">
              <button type="button" className="fw-btn fw-btn--ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="fw-btn fw-btn--primary"
                onClick={handleSubmit}
                disabled={!audioBlobRef.current || submitStatus === 'submitting'}
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
