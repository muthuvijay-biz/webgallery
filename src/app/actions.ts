'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_USER } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

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
      cookies().set('is_admin', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    } else {
      return { message: 'Invalid username or password' };
    }
  } catch (error) {
    return { message: 'An error occurred' };
  }
  redirect('/');
}

export async function logout() {
  cookies().delete('is_admin');
  redirect('/login');
}

export async function uploadFile(prevState: any, formData: FormData) {
  const file = formData.get('file') as File;
  const type = formData.get('type') as 'images' | 'videos' | 'documents';

  if (!file || !type || file.size === 0) {
    return { success: false, message: 'Please select a file to upload.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), 'public', 'uploads', type);
  // Sanitize file name to prevent directory traversal
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = join(uploadDir, sanitizedFileName);

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path, buffer);
    revalidatePath('/');
    return { success: true, message: 'File uploaded successfully!' };
  } catch (e) {
    return { success: false, message: 'Failed to upload file.' };
  }
}

export async function deleteFile(fileName: string, type: string) {
  if (!fileName || !type) {
    return { success: false, message: 'Invalid file information.' };
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = join(process.cwd(), 'public', 'uploads', type, sanitizedFileName);

  try {
    await unlink(path);
    revalidatePath('/');
    return { success: true, message: 'File deleted successfully.' };
  } catch (e) {
    return { success: false, message: 'Failed to delete file.' };
  }
}
