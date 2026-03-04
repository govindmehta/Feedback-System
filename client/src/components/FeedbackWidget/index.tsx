import { useState, useCallback, useRef } from 'react';
import FeedbackMenu from './FeedbackMenu.jsx';
import TextFeedbackModal from './TextFeedbackModal.jsx';
import AudioFeedbackModal from './AudioFeedbackModal.jsx';
import ScreenRecordModal from './ScreenRecordModal.jsx';
import { FeedbackMode } from './types';
import './FeedbackWidget.css';

export default function FeedbackWidget() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<FeedbackMode>(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const stopScreenRecordingRef = useRef<(() => void) | null>(null);

  const openMode = useCallback((m: FeedbackMode) => {
    setMenuOpen(false);
    setMode(m);
  }, []);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setMode(null);
    setIsScreenRecording(false);
  }, []);

  const handleRegisterStop = useCallback((fn: () => void) => {
    stopScreenRecordingRef.current = fn;
  }, []);

  const handleMiniStop = () => {
    stopScreenRecordingRef.current?.();
  };

  return (
    <div className="fw-container">
      {/* Modals */}
      {mode === 'text' && <TextFeedbackModal onClose={closeAll} />}
      {mode === 'audio' && <AudioFeedbackModal onClose={closeAll} />}
      {mode === 'screen' && (
        <ScreenRecordModal
          onClose={closeAll}
          onRecordingStateChange={setIsScreenRecording}
          onRegisterStop={handleRegisterStop}
        />
      )}

      {/* Mini floating stop pill — shown only while screen recording is active */}
      {isScreenRecording && (
        <button
          className="fw-recording-pill"
          onClick={handleMiniStop}
          aria-label="Stop recording"
        >
          <span className="fw-recording-pill-dot" />
          <span className="fw-recording-pill-label">Recording</span>
          <span className="fw-recording-pill-stop">
            <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
              <rect x="4" y="4" width="12" height="12" rx="2" />
            </svg>
          </span>
        </button>
      )}

      {/* Main trigger button — hidden while screen recording is active */}
      {!isScreenRecording && (
        <>
          {/* 2×2 circular grid menu */}
          {menuOpen && !mode && (
            <FeedbackMenu onSelect={openMode} onClose={() => setMenuOpen(false)} />
          )}

          <button
            className={`fw-trigger${menuOpen ? ' fw-trigger--active' : ''}`}
            onClick={() => {
              if (!mode) setMenuOpen(v => !v);
            }}
            aria-label="Give Feedback"
          >
            <span className="fw-trigger-icon">
              {menuOpen ? (
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            <span className="fw-trigger-label">Give Feedback</span>
          </button>
        </>
      )}
    </div>
  );
}
