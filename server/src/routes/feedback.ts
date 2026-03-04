import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { storeFile, saveManifest, ManifestData } from '../services/storageService';

export const feedbackRouter = Router();

// ─── Multer — store uploads in OS temp dir first ─────────────────────────────

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
});

// ─── Helper: pick mime-appropriate extension ─────────────────────────────────

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'video/webm': '.webm',
    'video/mp4': '.mp4',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  const base = mime.split(';')[0].trim();
  return map[base] ?? path.extname(mime).replace(/^\./, '.') ?? '.bin';
}

// ─── POST /api/feedback/text ─────────────────────────────────────────────────

feedbackRouter.post(
  '/text',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const id = uuidv4();
      const { textContent, currentUrl, userAgent } = req.body as Record<string, string>;
      const savedFiles: string[] = [];

      if (req.file) {
        const ext = extFromMime(req.file.mimetype);
        const dest = await storeFile({
          subFolder: 'text',
          fileName: `${id}-image${ext}`,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
        });
        savedFiles.push(dest);
      }

      const manifest: ManifestData = {
        id,
        type: 'text',
        timestamp: new Date().toISOString(),
        currentUrl: currentUrl || '',
        userAgent: userAgent || '',
        transcriptPlaceholder: '[Text feedback — no transcript needed]',
        textContent: textContent || '',
        files: savedFiles,
      };

      saveManifest('text', id, manifest);

      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[feedback/text]', err);
      res.status(500).json({ success: false, error: 'Failed to save text feedback.' });
    }
  }
);

// ─── POST /api/feedback/audio ─────────────────────────────────────────────────

feedbackRouter.post(
  '/audio',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const id = uuidv4();
      const { currentUrl, userAgent } = req.body as Record<string, string>;
      const files = req.files as Record<string, Express.Multer.File[]>;
      const savedFiles: string[] = [];

      if (files?.audio?.[0]) {
        const f = files.audio[0];
        const ext = extFromMime(f.mimetype);
        const dest = await storeFile({
          subFolder: 'audio',
          fileName: `${id}-audio${ext}`,
          filePath: f.path,
          mimeType: f.mimetype,
        });
        savedFiles.push(dest);
      }

      if (files?.image?.[0]) {
        const f = files.image[0];
        const ext = extFromMime(f.mimetype);
        const dest = await storeFile({
          subFolder: 'audio',
          fileName: `${id}-image${ext}`,
          filePath: f.path,
          mimeType: f.mimetype,
        });
        savedFiles.push(dest);
      }

      const manifest: ManifestData = {
        id,
        type: 'audio',
        timestamp: new Date().toISOString(),
        currentUrl: currentUrl || '',
        userAgent: userAgent || '',
        transcriptPlaceholder: '[Audio transcript — integrate Whisper/Deepgram here]',
        files: savedFiles,
      };

      saveManifest('audio', id, manifest);

      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[feedback/audio]', err);
      res.status(500).json({ success: false, error: 'Failed to save audio feedback.' });
    }
  }
);

// ─── POST /api/feedback/screen ────────────────────────────────────────────────

feedbackRouter.post(
  '/screen',
  upload.single('video'),
  async (req: Request, res: Response) => {
    try {
      const id = uuidv4();
      const { currentUrl, userAgent } = req.body as Record<string, string>;
      const savedFiles: string[] = [];

      if (req.file) {
        const ext = extFromMime(req.file.mimetype);
        const dest = await storeFile({
          subFolder: 'video',
          fileName: `${id}-screen${ext}`,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
        });
        savedFiles.push(dest);
      }

      const manifest: ManifestData = {
        id,
        type: 'screen',
        timestamp: new Date().toISOString(),
        currentUrl: currentUrl || '',
        userAgent: userAgent || '',
        transcriptPlaceholder: '[Screen recording transcript — integrate speech-to-text here]',
        files: savedFiles,
      };

      saveManifest('video', id, manifest);

      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[feedback/screen]', err);
      res.status(500).json({ success: false, error: 'Failed to save screen recording.' });
    }
  }
);
