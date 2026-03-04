export type FeedbackMode = 'text' | 'audio' | 'screen' | 'schedule' | null;

export interface ImageAttachment {
  file: File;
  previewUrl: string; // URL.createObjectURL — revoke on cleanup
}
