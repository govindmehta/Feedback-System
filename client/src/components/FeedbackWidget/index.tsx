import { useState, useCallback } from 'react';
import FeedbackMenu from './FeedbackMenu.jsx';
import TextFeedbackModal from './TextFeedbackModal.jsx';
import AudioFeedbackModal from './AudioFeedbackModal.jsx';
import ScreenRecordModal from './ScreenRecordModal.jsx';
import { FeedbackMode } from './types';
import './FeedbackWidget.css';

export default function FeedbackWidget() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<FeedbackMode>(null);

  const openMode = useCallback((m: FeedbackMode) => {
    setMenuOpen(false);
    setMode(m);
  }, []);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setMode(null);
  }, []);

  // When screen recording starts, menu must already be hidden (handled by openMode).

  return (
    <div className="fw-container">
      {/* 2×2 circular grid — hidden during active recording */}
      {menuOpen && !mode && (
        <FeedbackMenu onSelect={openMode} onClose={() => setMenuOpen(false)} />
      )}

      {/* Modals */}
      {mode === 'text' && <TextFeedbackModal onClose={closeAll} />}
      {mode === 'audio' && <AudioFeedbackModal onClose={closeAll} />}
      {mode === 'screen' && <ScreenRecordModal onClose={closeAll} />}

      {/* Trigger button */}
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
    </div>
  );
}
