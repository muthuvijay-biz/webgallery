'use server';

import { z } from 'zod';
import { ADMIN_USER } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/lib/supabaseAdmin';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function login(prevState: any, formData: FormData) {
  try {
    const parsed = loginSchema.parse(Object.fromEntries(formData));

    if (
      parsed.username === ADMIN_USER.username &&
      parsed.password === ADMIN_USER.password
    ) {
      return { success: true, message: 'Login successful!' };
    } else {
      return { success: false, message: 'Invalid username or password' };
    }
  } catch (error) {
    return { success: false, message: 'An error occurred' };
  }
}

export async function uploadFile(prevState: any, formData: FormData) {
  const files = formData.getAll('file') as File[];
  const file = files && files.length > 0 ? (files[0] as File) : (formData.get('file') as File);
  const type = formData.get('type') as 'images' | 'videos' | 'documents';
  const description = formData.get('description') as string | null;

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  if (!file || !type || file.size === 0) {
    return { success: false, message: 'Please select a file to upload.' };
  }

  if (files && files.length > 1) {
    return { success: false, message: 'Only one file may be uploaded at a time.' };
  }

  if (file.size > MAX_BYTES) {
    return { success: false, message: `File too large. Maximum allowed size is ${MAX_BYTES / 1024 / 1024} MB.` };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), 'public', 'uploads', type);
  // Sanitize file name to prevent directory traversal
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = join(uploadDir, sanitizedFileName);
  const descriptionPath = `${path}.json`;

  try {
    if (process.env.USE_SUPABASE === 'true') {
      const bucket = process.env.SUPABASE_BUCKET || '';
      if (!bucket) {
        return { success: false, message: 'SUPABASE_BUCKET not configured.' };
      }
      const dest = `${type}/${sanitizedFileName}`;

      const { error: uploadError } = await supabaseAdmin
        .storage
        .from(bucket)
        .upload(dest, buffer, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      if (description) {
        await supabaseAdmin
          .storage
          .from(bucket)
          .upload(`${dest}.json`, Buffer.from(JSON.stringify({ description })), { contentType: 'application/json', upsert: true })
          .catch(() => {});
      }

      const expiry = parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRY || '3600', 10);
      // Try to create a signed URL (works for private buckets). Fall back to public URL if that fails.
      const { data: signedData, error: signedErr } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(dest, expiry);

      const publicPath = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${dest}`;
      const finalPath = signedErr ? publicPath : signedData?.signedUrl ?? publicPath;

      revalidatePath('/');
      revalidatePath('/uploads');
      return {
        success: true,
        message: 'File uploaded successfully!',
        path: finalPath,
      };
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path, buffer);
    if (description) {
      await writeFile(descriptionPath, JSON.stringify({ description }));
    }
    revalidatePath('/');
    revalidatePath('/uploads');
    return { success: true, message: 'File uploaded successfully!' };
  } catch (err: any) {
    console.error('uploadFile error:', err);
    const message =
      err?.code === 'EACCES' || err?.code === 'EPERM'
        ? 'Write permission denied (filesystem likely read-only in production).'
        : err?.message || 'Failed to upload file.';
    return { success: false, message };
  }
}

export async function deleteFile(fileName: string, type: string) {
  if (!fileName || !type) {
    return { success: false, message: 'Invalid file information.' };
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = join(process.cwd(), 'public', 'uploads', type, sanitizedFileName);

  try {
    if (process.env.USE_SUPABASE === 'true') {
      const bucket = process.env.SUPABASE_BUCKET!;
      const dest = `${type}/${sanitizedFileName}`;

      const { error: removeError } = await supabaseAdmin
        .storage
        .from(bucket)
        .remove([dest]);

      if (removeError) throw removeError;

      await supabaseAdmin.storage.from(bucket).remove([`${dest}.json`]).catch(() => {});

      revalidatePath('/');
      revalidatePath('/uploads');
      return { success: true, message: 'File deleted successfully.' };
    }

    await unlink(path);
    // Also delete the metadata file if it exists
    await unlink(`${path}.json`).catch(() => {}); // Ignore error if it doesn't exist
    revalidatePath('/');
    revalidatePath('/uploads');
    return { success: true, message: 'File deleted successfully.' };
  } catch (err: any) {
    console.error('deleteFile error:', err);
    const message =
      err?.code === 'ENOENT'
        ? 'File not found on server.'
        : err?.code === 'EACCES' || err?.code === 'EPERM'
        ? 'Permission denied (filesystem likely read-only in production).'
        : err?.message || 'Failed to delete file.';
    return { success: false, message };
  }
}
