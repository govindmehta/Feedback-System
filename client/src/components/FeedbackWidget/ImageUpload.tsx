import { useRef, useCallback } from 'react';
import { ImageAttachment } from './types';

interface Props {
  attachment: ImageAttachment | null;
  onChange: (att: ImageAttachment | null) => void;
}

export default function ImageUpload({ attachment, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      // Revoke previous object URL to prevent memory leak
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      onChange({ file, previewUrl });
    },
    [attachment, onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="fw-image-upload">
      <p className="fw-label">
        Attach image{' '}
        <span className="fw-label-muted">(optional)</span>
      </p>

      {attachment ? (
        <div className="fw-image-preview">
          <img src={attachment.previewUrl} alt="Preview" />
          <button className="fw-image-remove" onClick={handleRemove} type="button" aria-label="Remove image">
            <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div
          className="fw-drop-zone"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={24} height={24}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Click or drag image here</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
