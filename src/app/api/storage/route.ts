import fs from 'fs';
import path from 'path';
import supabaseAdmin from '@/lib/supabaseAdmin';
import type { NextRequest } from 'next/server';

function guessMime(filename: string) {
  const ext = String(filename).split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'mp4': return 'video/mp4';
    case 'mp3': return 'audio/mpeg';
    default: return 'application/octet-stream';
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const file = url.searchParams.get('file') || '';

  // expect a path like "documents/filename.pdf" (only allow known top-level folders)
  if (!/^(images|videos|documents)\/.+$/i.test(file)) {
    return new Response('Invalid file parameter', { status: 400 });
  }

  // If Supabase is enabled, fetch the file from storage (server-side) and stream it to the client.
  if (process.env.USE_SUPABASE === 'true') {
    const bucket = process.env.SUPABASE_BUCKET || '';
    if (!bucket) return new Response('Storage not configured', { status: 500 });

    try {
      // create a short-lived signed URL and fetch it server-side to avoid X-Frame-Options/CSP issues
      const expiry = Math.min(parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRY || '3600', 10), 60);
      const { data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(file, expiry);
      if (error || !signed?.signedUrl) {
        return new Response('Not found', { status: 404 });
      }

      const upstream = await fetch(signed.signedUrl);
      if (!upstream.ok) return new Response('Error fetching file', { status: upstream.status });

      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('content-type') || guessMime(file));
      headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(upstream.body, { status: 200, headers });
    } catch (err) {
      return new Response('Server error', { status: 500 });
    }
  }

  // Fallback: serve files directly from the local `public/uploads` folder when not using Supabase.
  const fsPath = path.join(process.cwd(), 'public', 'uploads', file);
  try {
    if (!fs.existsSync(fsPath)) return new Response('Not found', { status: 404 });
    const data = await fs.promises.readFile(fsPath);
    const headers = new Headers();
    headers.set('Content-Type', guessMime(fsPath));
    headers.set('Cache-Control', 'public, max-age=60');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(data, { status: 200, headers });
  } catch (err) {
    return new Response('Server error', { status: 500 });
  }
}
