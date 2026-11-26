import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Optional Supabase client
const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    : null;

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
}

export async function uploadFile(
  file: Express.Multer.File,
  subfolder: string = 'general'
): Promise<UploadResult> {
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueName = `${subfolder}/${Date.now()}-${baseName}${ext}`;

  // If Supabase is configured, upload to Supabase Storage bucket
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_BUCKET)
      .upload(uniqueName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('[Storage:Supabase] Upload error, falling back to local storage:', error);
    } else {
      const { data: urlData } = supabase.storage
        .from(env.SUPABASE_BUCKET)
        .getPublicUrl(data.path);

      return {
        storageKey: data.path,
        publicUrl: urlData.publicUrl,
      };
    }
  }

  // Local storage fallback
  const targetDir = path.join(UPLOADS_DIR, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, `${Date.now()}-${baseName}${ext}`);
  await fs.promises.writeFile(filePath, file.buffer);

  const relativeKey = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return {
    storageKey: relativeKey,
    publicUrl: `/api/v1/documents/download?key=${encodeURIComponent(relativeKey)}`,
  };
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (supabase) {
    await supabase.storage.from(env.SUPABASE_BUCKET).remove([storageKey]);
  }

  const localPath = path.resolve(process.cwd(), storageKey);
  if (fs.existsSync(localPath)) {
    await fs.promises.unlink(localPath).catch(() => {});
  }
}
