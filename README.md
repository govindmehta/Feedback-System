# Feedback System

A clean, self-contained feedback widget built on React + Node.js/TypeScript. Designed to be dropped into any existing web app as a bottom-right floating button that expands into a 2×2 action menu.

---

## Project Structure

```
Feedback-System/
├── client/                      # React + Vite + TypeScript (frontend)
│   └── src/
│       ├── App.tsx              # Dummy landing page (the host app)
│       └── components/
│           └── FeedbackWidget/
│               ├── index.tsx            # Main widget (trigger + orchestrator)
│               ├── FeedbackMenu.tsx     # 2×2 circular grid menu
│               ├── TextFeedbackModal.tsx
│               ├── AudioFeedbackModal.tsx
│               ├── ScreenRecordModal.tsx
│               ├── ImageUpload.tsx      # Shared drag-and-drop image component
│               ├── FeedbackWidget.css   # All widget styles
│               └── types.ts             # Shared TypeScript types
│
├── server/                      # Express + TypeScript (backend)
│   └── src/
│       ├── index.ts             # Server entry point
│       ├── routes/
│       │   └── feedback.ts      # POST /api/feedback/{text,audio,screen}
│       └── services/
│           └── storageService.ts  # Local save + commented S3 placeholder
│
├── public/
│   └── feedback/                # Upload storage root (auto-created)
│       ├── audio/               # Audio .webm/.mp4 + optional image
│       ├── video/               # Screen recordings
│       └── text/                # Image attachments for text feedback
│
├── package.json                 # Root — concurrently dev script
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern browser (Chrome, Firefox, Edge — for screen recording / MediaRecorder API)

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
# From the root directory
npm run install:all
```

Or manually:

```bash
cd client && npm install
cd ../server && npm install
```

### Development

Run both the Vite dev server (port 5173) and the Express API server (port 3001) concurrently:

```bash
# From the root directory
npm run dev
```

Then open: **http://localhost:5173**

The Vite dev server proxies all `/api/*` requests to `http://localhost:3001` automatically.

---

## Features

### Give Feedback Button

Fixed to the bottom-right corner. Clicking it opens the 2×2 circular action menu. Clicking again (or closing a modal) collapses it.

### 1. Text Feedback

- Freeform `<textarea>` for written feedback
- Optional image attachment via click or drag-and-drop
- Image preview uses `URL.createObjectURL` (no memory leaks — revoked on close/submit)
- Submits to `POST /api/feedback/text`

### 2. Audio Feedback

- Uses `getUserMedia({ audio: true })` — voice only, no webcam
- Live recording timer
- Playback preview before submitting
- Optional image attachment with preview
- MIME type auto-selection with fallback chain
- Submits to `POST /api/feedback/audio`

### 3. Screen Recording

- Uses `getDisplayMedia` (screen) merged with `getUserMedia` (mic audio)
- **No webcam** — only screen + mic
- MIME type fallback: `video/webm;codecs=vp9,opus` → `video/webm` → `video/mp4`
- The feedback menu auto-hides before recording starts so it won't appear in the capture
- Video preview available before submitting
- Re-record option
- Submits to `POST /api/feedback/screen`

### 4. Schedule Call

- Opens your Calendly link in a new tab
- To configure: edit `FeedbackMenu.tsx` and replace `INSERT_YOUR_CALENDLY_URL` with your actual Calendly URL

---

## API Reference

All endpoints are under `/api/feedback`.

| Method | Path | Body (multipart) | Description |
|--------|------|-----------------|-------------|
| `POST` | `/api/feedback/text` | `textContent`, `currentUrl`, `userAgent`, `image?` | Save text feedback |
| `POST` | `/api/feedback/audio` | `audio`, `currentUrl`, `userAgent`, `image?` | Save audio recording |
| `POST` | `/api/feedback/screen` | `video`, `currentUrl`, `userAgent` | Save screen recording |

Each successful submission:
1. Saves the media file(s) to `public/feedback/<subFolder>/`
2. Writes a `<id>-manifest.json` in the same directory

### Manifest Schema

```json
{
  "id": "uuid-v4",
  "type": "text | audio | screen | schedule",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "currentUrl": "http://localhost:5173/",
  "userAgent": "Mozilla/5.0 ...",
  "transcriptPlaceholder": "[Integrate Whisper/Deepgram here]",
  "textContent": "(text feedback only)",
  "files": ["/absolute/path/to/file.webm"]
}
```

---

## Storage Configuration

Storage logic is centralized in `server/src/services/storageService.ts`.

### Local (default)

Files are saved to `public/feedback/` relative to the project root.

```env
STORAGE_TYPE=local
```

### S3 (future)

The `uploadToS3` function is fully scaffolded (commented out) using AWS SDK v3 `PutObjectCommand`. To enable:

1. Uncomment the S3 code in `storageService.ts`
2. Set the following in `server/.env`:

```env
STORAGE_TYPE=S3
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Mic permission denied | User-friendly inline error message inside the modal |
| Screen share denied | Same — clear inline error |
| Upload fails | Inline error message, user can retry |
| User cancels share dialog | Caught gracefully, no crash |
| Modal closed mid-recording | `track.stop()` called on every stream track — browser "in use" indicator clears |

---

## Calendly Integration

In `client/src/components/FeedbackWidget/FeedbackMenu.tsx`, find:

```ts
window.open('INSERT_YOUR_CALENDLY_URL', '_blank', 'noopener,noreferrer');
```

Replace `INSERT_YOUR_CALENDLY_URL` with your actual Calendly link, e.g.:

```ts
window.open('https://calendly.com/your-name/30min', '_blank', 'noopener,noreferrer');
```

---

## Embedding in a Real App

Drop the widget into any existing React app:

1. Copy `client/src/components/FeedbackWidget/` into your project
2. Copy `client/src/components/FeedbackWidget/FeedbackWidget.css` (or convert to your CSS system)
3. Import and render `<FeedbackWidget />` once at the root layout level (e.g., `App.tsx`)
4. Deploy the server or integrate the route handler into your existing Express/Next.js API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Plain CSS custom properties (dark theme) |
| Recording | Native `MediaRecorder` API, `getDisplayMedia`, `getUserMedia` |
| Backend | Node.js, Express, TypeScript, `ts-node-dev` |
| File Upload | `multer` (temp → local disk) |
| Storage Abstraction | `storageService.ts` — local or S3 (AWS SDK v3) |
| Unique IDs | `uuid` v4 |
