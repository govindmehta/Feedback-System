import fs from 'fs';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoragePayload {
  subFolder: 'audio' | 'video' | 'text' | 'image';
  fileName: string;
  filePath: string; // temp path from multer
  mimeType: string;
}

export interface ManifestData {
  id: string;
  type: 'text' | 'audio' | 'screen' | 'schedule';
  timestamp: string;
  currentUrl: string;
  userAgent: string;
  transcriptPlaceholder: string;
  textContent?: string;
  files: string[];
}

// ─── Local storage base path ─────────────────────────────────────────────────

const LOCAL_BASE = path.resolve(__dirname, '../../../public/feedback');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ─── Local Save ──────────────────────────────────────────────────────────────

export function saveToLocal(payload: StoragePayload): string {
  const targetDir = path.join(LOCAL_BASE, payload.subFolder);
  ensureDir(targetDir);

  const destPath = path.join(targetDir, payload.fileName);
  fs.renameSync(payload.filePath, destPath);

  return destPath;
}

// ─── Manifest Save ───────────────────────────────────────────────────────────

export function saveManifest(subFolder: string, id: string, data: ManifestData): void {
  const targetDir = path.join(LOCAL_BASE, subFolder);
  ensureDir(targetDir);

  const manifestPath = path.join(targetDir, `${id}-manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── S3 Upload (placeholder) ─────────────────────────────────────────────────
//
// To enable S3 uploads, set STORAGE_TYPE=S3 in your .env file and fill in
// your AWS credentials (AWS_REGION, AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY).
//
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import { createReadStream } from 'fs';
//
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || 'us-east-1',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
//   },
// });
//
// export async function uploadToS3(payload: StoragePayload): Promise<string> {
//   const key = `feedback/${payload.subFolder}/${payload.fileName}`;
//   const fileStream = createReadStream(payload.filePath);
//
//   const command = new PutObjectCommand({
//     Bucket: process.env.AWS_BUCKET_NAME || '',
//     Key: key,
//     Body: fileStream,
//     ContentType: payload.mimeType,
//   });
//
//   await s3Client.send(command);
//   fs.unlinkSync(payload.filePath); // clean up temp file
//
//   return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
// }

// ─── Unified Entry Point ─────────────────────────────────────────────────────

export async function storeFile(payload: StoragePayload): Promise<string> {
  if (process.env.STORAGE_TYPE === 'S3') {
    // return uploadToS3(payload); // Uncomment when S3 is configured
    throw new Error('S3 storage is configured but uploadToS3 is not yet implemented. See storageService.ts.');
  }
  return saveToLocal(payload);
}
