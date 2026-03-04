import { useState, useEffect, useCallback } from 'react';
import ImageUpload from './ImageUpload';
import { ImageAttachment } from './types';

interface Props {
  onClose: () => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function TextFeedbackModal({ onClose }: Props) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  const handleClose = useCallback(() => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    onClose();
  }, [image, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('textContent', text.trim());
      formData.append('currentUrl', window.location.href);
      formData.append('userAgent', navigator.userAgent);
      if (image?.file) formData.append('image', image.file);

      const res = await fetch('/api/feedback/text', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Server error');

      setStatus('success');
      setTimeout(() => handleClose(), 1800);
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fw-backdrop" onClick={handleClose}>
      <div className="fw-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal aria-label="Text feedback">
        <div className="fw-modal-header">
          <h2 className="fw-modal-title">
            <span className="fw-modal-icon fw-modal-icon--text">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            Text Feedback
          </h2>
          <button className="fw-modal-close" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="fw-success">
            <div className="fw-success-icon">✓</div>
            <p>Thanks for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="fw-modal-body">
            <div className="fw-field">
              <label className="fw-label" htmlFor="fw-text">
                What's on your mind?
              </label>
              <textarea
                id="fw-text"
                className="fw-textarea"
                placeholder="Describe your feedback, issue, or suggestion…"
                rows={5}
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={status === 'submitting'}
                autoFocus
              />
            </div>

            <ImageUpload attachment={image} onChange={setImage} />

            {errorMsg && <p className="fw-error">{errorMsg}</p>}

            <div className="fw-modal-footer">
              <button type="button" className="fw-btn fw-btn--ghost" onClick={handleClose} disabled={status === 'submitting'}>
                Cancel
              </button>
              <button
                type="submit"
                className="fw-btn fw-btn--primary"
                disabled={!text.trim() || status === 'submitting'}
              >
                {status === 'submitting' ? (
                  <><span className="fw-spinner" /> Sending…</>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
