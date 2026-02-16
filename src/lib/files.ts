import { readdir, stat, readFile } from 'fs/promises';
import { join, parse } from 'path';
import { mkdir } from 'fs/promises';
import supabaseAdmin from './supabaseAdmin';

// sanitize extracted URL-like strings (strip surrounding quotes/extra punctuation)
function cleanExtractedUrl(s: any) {
  if (!s) return '';
  let u = String(s).trim();
  // strip surrounding quotes
  u = u.replace(/^['\"]+/, '').replace(/['\"]+$/, '');
  // remove trailing punctuation that commonly follows URLs in text
  u = u.replace(/[)\]\.,;:]+$/g, '');
  // reject known invalid/error placeholder strings (these sometimes appear when a fetch returns an error/redirect body)
  if (/error_204|jserror/i.test(u)) return '';
  return u;
}

// Try to find the best URL in arbitrary text — prefer known providers (YouTube, Drive, Vimeo, direct media)
function findUrlInText(text: string): string | null {
  if (!text) return null;
  const t = String(text || '');
  // external: prefix
  const ext = t.match(/external:\s*(\S+)/i);
  if (ext) return cleanExtractedUrl(ext[1]);
  // YouTube (watch, youtu.be, embed, shorts)
  const yt = t.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[A-Za-z0-9_\-]{4,}/i);
  if (yt) return cleanExtractedUrl(yt[0]);
  // Vimeo
  const vimeo = t.match(/https?:\/\/vimeo\.com\/(?:video\/)?\d+/i);
  if (vimeo) return cleanExtractedUrl(vimeo[0]);
  // Google Drive file links
  const drive = t.match(/https?:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)[A-Za-z0-9_\-]+/i);
  if (drive) return cleanExtractedUrl(drive[0]);
  // direct media files (mp4/webm/mp3/ogg)
  const media = t.match(/https?:\/\/[^\s"'\)\]]+\.(?:mp4|webm|ogg|mp3|wav)(?:\?[^\s"'\)\]]*)?/i);
  if (media) return cleanExtractedUrl(media[0]);
  // fallback: any http(s) URL
  const any = t.match(/https?:\/\/[^\s"'\)\]]+/i);
  if (any) return cleanExtractedUrl(any[0]);
  return null;
}

export type FileMetadata = {
  'File Name': string;           // display name (user-facing)
  storedName?: string;           // actual stored filename on disk / bucket
  'File Size': string;
  'Last Modified': string;
  'Capture Date'?: string;
  'Location'?: string;
  'Description'?: string;
  type: 'image' | 'video' | 'document';
  path: string;
  // optional same-origin proxy URL (served by /api/storage) to avoid CORP/ORB issues
  proxyPath?: string;
  // optional timestamps for sorting
  mtimeMs?: number;
};

async function getFileMetadata(filePath: string, fileName: string, type: 'images' | 'videos' | 'documents'): Promise<FileMetadata> {
  const stats = await stat(filePath);
  const metadata: FileMetadata = {
    'File Name': fileName,
    storedName: fileName,
    'File Size': `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    'Last Modified': stats.mtime.toLocaleDateString(),
    type: type.slice(0, -1) as 'image' | 'video' | 'document',
    path: `/uploads/${type}/${fileName}`,
    proxyPath: `/api/storage?file=${encodeURIComponent(`${type}/${fileName}`)}`,
    mtimeMs: stats.mtime.getTime(),
  };

  // Check for description / companion metadata file
  const descriptionPath = `${filePath}.json`;
  try {
    const descriptionContent = await readFile(descriptionPath, 'utf-8');
    const descriptionData = JSON.parse(descriptionContent);
    if (descriptionData.description) {
      metadata['Description'] = descriptionData.description;
    }
    // If JSON contains a saved display name, prefer it for UI (trimmed by uploader)
    if (descriptionData.displayName) {
      metadata['File Name'] = String(descriptionData.displayName);
    }

    // If the JSON contains an externalUrl, treat this entry as an external reference
    if (descriptionData.externalUrl) {
      metadata.path = descriptionData.externalUrl;
      // show a friendly display name (strip the .link placeholder suffix) unless displayName was provided
      if (!descriptionData.displayName) metadata['File Name'] = fileName.replace(/\.link$/i, '') || metadata['File Name'];
      metadata.storedName = fileName;
      if (descriptionData.size) {
        metadata['File Size'] = `${(descriptionData.size / 1024 / 1024).toFixed(2)} MB`;
      } else {
        metadata['File Size'] = 'External';
      }
    }
  } catch (error) {
    // If there's no companion JSON but this is a .link placeholder, try to read the .link file content
    if (/\.link$/i.test(fileName)) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const extracted = String(content || '').replace(/^external:\s*/i, '').trim();
        if (extracted) {
          const cleaned = cleanExtractedUrl(extracted);
          if (cleaned) {
            metadata.path = cleaned;
            metadata['File Size'] = 'External';
            metadata['File Name'] = fileName.replace(/\.link$/i, '');
          }
        }
      } catch (_) {
        // ignore
      }
    }
  }

  // Additional detection: small local files that contain placeholder text or a raw URL
  try {
    if (stats.size > 0 && stats.size < 2048 && metadata['File Size'] !== 'External') {
      const txt = await readFile(filePath, 'utf-8').catch(() => '');
      const body = String(txt || '');
      // accept both `external: <url>` and a plain URL inside the small text file
      const m = body.match(/external:\s*(\S+)/i) || body.match(/https?:\/\/[^\s"'\)\]]+/i);
      if (m) {
        const raw = m[1] || m[0];
        const url = cleanExtractedUrl(raw);
        if (url) {
          metadata.path = url;
          metadata['File Size'] = 'External';
          metadata['File Name'] = fileName.replace(/\.link$/i, '');
        }
      }
    }
  } catch (e) {
    // ignore read errors for binaries
  }

  if (type === 'images') {
    // Mock EXIF data. In a real app, you would use a library like 'exif-parser'.
    metadata['Capture Date'] = new Date(stats.birthtime).toLocaleString();
    const locations = ['Paris, France', 'Kyoto, Japan', 'New York, USA', 'Cairo, Egypt', 'Sydney, Australia'];
    // Simple hash of filename to get a consistent random location
    const hash = fileName.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const index = Math.abs(hash % locations.length);
    metadata['Location'] = locations[index];
  }

  return metadata;
}


export async function getFiles(type: 'images' | 'videos' | 'documents'): Promise<FileMetadata[]> {
  if (process.env.USE_SUPABASE === 'true') {
    try {
      const bucket = process.env.SUPABASE_BUCKET!;
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(type, { limit: 1000, offset: 0 });
      if (error) {
        console.error('Supabase storage list error:', error);
        return [];
      }
      if (!data || data.length === 0) return [];

      const expiry = parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRY || '3600', 10);

      // prepare items with timestamps, sort newest-first
      const items = data.filter((item: any) => !item.name.endsWith('.json'))
        .map((item: any) => ({ item, updatedMs: Date.parse((item as any).updated_at ?? (item as any).created_at ?? '') || 0 }));
      items.sort((a: any, b: any) => b.updatedMs - a.updatedMs);

      const filesWithMetadata: FileMetadata[] = await Promise.all(
        items.map(async ({ item }: any) => {
          let size = (item.metadata as any)?.size ?? 0; // allow override from companion JSON
          const updated = (item as any).updated_at ?? (item as any).created_at ?? '';
          const filePath = `${type}/${item.name}`;

          const { data: signedData, error: signedErr } = await supabaseAdmin
            .storage
            .from(bucket)
            .createSignedUrl(filePath, expiry);

          let path = signedErr
            ? `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`
            : signedData?.signedUrl ?? `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;

          // Try to detect placeholder content for small/text files (some placeholders may not end with .link)
          try {
            const metaContentType = (item.metadata as any)?.contentType || '';
            // increase threshold so slightly larger text placeholders are detected server-side
            const smallTextCandidate = metaContentType.startsWith('text') || (size && size < 65536);
            if (smallTextCandidate) {
              const probe = await fetch(path).catch(() => null);
              if (probe && probe.ok) {
                const body = await probe.text().catch(() => '');
                const bodyStr = String(body || '');
                // prefer provider-specific matches, then fallback to any URL
                const candidate = findUrlInText(bodyStr);
                if (candidate) path = candidate;
              }
            }
          } catch (e) {
            // ignore probe failures
          }

          // attempt to load companion JSON description (fileName.json)
          let description: string | undefined = undefined;
          let isExternal = false;
          let jsonDisplayName: string | undefined = undefined;
          try {
            const jsonPath = `${type}/${item.name}.json`;
            const { data: jsonSigned, error: jsonSignedErr } = await supabaseAdmin
              .storage
              .from(bucket)
              .createSignedUrl(jsonPath, Math.min(expiry, 60));

            if (!jsonSignedErr && jsonSigned?.signedUrl) {
              const res = await fetch(jsonSigned.signedUrl);
              if (res.ok) {
                const json = await res.json().catch(() => null);
                if (json && typeof json.description === 'string') description = json.description;
                // capture any saved displayName
                if (json && typeof json.displayName === 'string') {
                  jsonDisplayName = String(json.displayName).trim();
                }
                // if JSON contains externalUrl, override path and mark external
                if (json && typeof json.externalUrl === 'string') {
                  path = json.externalUrl;
                  isExternal = true;
                  if (json.size) {
                    // if meta provides a size, use it
                    size = json.size;
                  }
                }
              }
            }
          } catch (e) {
            // ignore — description is optional
          }
          // Extra probe: files without a typical extension (e.g. 'Ant', 'Filename2')
          // are often placeholders stored as small text — try fetching and extracting a URL.
          if (!isExternal && !/\.[a-z0-9]{1,6}$/i.test(item.name)) {
            try {
              const probeRes = await fetch(path).catch(() => null);
              if (probeRes && probeRes.ok) {
                const probeBody = await probeRes.text().catch(() => '');
                const candidate = findUrlInText(String(probeBody || ''));
                if (candidate) {
                  path = candidate;
                  isExternal = true;
                }
              }
            } catch (e) {
              /* ignore */
            }
          }
          // If this item is a .link placeholder but JSON didn't indicate externalUrl,
          // try to fetch the .link file content (signed URL is in `path`) and extract the external URL.
          if (!isExternal && /\.link$/i.test(item.name)) {
            try {
              const resLink = await fetch(path);
              if (resLink.ok) {
                const text = await resLink.text().catch(() => '');
                const textBody = String(text || '');
                const candidate = findUrlInText(textBody) || cleanExtractedUrl(textBody.replace(/^external:\s*/i, '').trim());
                if (candidate) {
                  path = candidate;
                  isExternal = true;
                }
              }
            } catch (err) {
              // ignore
            }
          }

          // prefer any displayName saved in companion JSON; fall back to item.name (strip ".link" for external placeholders)
          const displayName = jsonDisplayName ?? (isExternal ? item.name.replace(/\.link$/i, '') : item.name);
          const displaySize = isExternal && (!size || size === 0) ? 'External' : `${(size / 1024 / 1024).toFixed(2)} MB`;

          return {
            'File Name': displayName,
            storedName: item.name,
            'File Size': displaySize,
            'Last Modified': updated ? new Date(updated).toLocaleDateString() : '',
            type: type.slice(0, -1) as 'image' | 'video' | 'document',
            path,
            proxyPath: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/storage?file=${encodeURIComponent(`${type}/${item.name}`)}`,
            mtimeMs: Date.parse(updated) || 0,
            Description: description,
          } as FileMetadata;
        })
      );

      // debug: surface metadata for problem filenames
      for (const f of filesWithMetadata) {
        if (f['File Name'] === 'Ant' || f['File Name'] === 'Filename2') {
          console.log('[getFiles] debug:', type, f);
        }
      }

      return filesWithMetadata;
    } catch (err) {
      console.error('Error listing Supabase storage:', err);
      return [];
    }
  }

  const dirPath = join(process.cwd(), 'public', 'uploads', type);
  try {
    await mkdir(dirPath, { recursive: true });
    const fileNames = await readdir(dirPath);
    if (fileNames.length === 0) return [];
    
    let filesWithMetadata = await Promise.all(
      fileNames.filter(name => !name.endsWith('.json')).map(name => getFileMetadata(join(dirPath, name), name, type))
    );
    // sort newest uploads first
    filesWithMetadata = filesWithMetadata.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
    return filesWithMetadata;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist, which is fine, just return empty array.
        return [];
    }
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}
