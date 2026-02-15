import { readdir, stat, readFile } from 'fs/promises';
import { join, parse } from 'path';
import { mkdir } from 'fs/promises';
import supabaseAdmin from './supabaseAdmin';

export type FileMetadata = {
  'File Name': string;
  'File Size': string;
  'Last Modified': string;
  'Capture Date'?: string;
  'Location'?: string;
  'Description'?: string;
  type: 'image' | 'video' | 'document';
  path: string;
  // optional timestamps for sorting
  mtimeMs?: number;
};

async function getFileMetadata(filePath: string, fileName: string, type: 'images' | 'videos' | 'documents'): Promise<FileMetadata> {
  const stats = await stat(filePath);
  const metadata: FileMetadata = {
    'File Name': fileName,
    'File Size': `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    'Last Modified': stats.mtime.toLocaleDateString(),
    type: type.slice(0, -1) as 'image' | 'video' | 'document',
    path: `/uploads/${type}/${fileName}`,
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
    // If the JSON contains an externalUrl, treat this entry as an external reference
    if (descriptionData.externalUrl) {
      metadata.path = descriptionData.externalUrl;
      if (descriptionData.size) {
        metadata['File Size'] = `${(descriptionData.size / 1024 / 1024).toFixed(2)} MB`;
      } else {
        metadata['File Size'] = 'External';
      }
    }
  } catch (error) {
    // Ignore if description file doesn't exist or is invalid
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
      const items = data.filter(item => !item.name.endsWith('.json'))
        .map(item => ({ item, updatedMs: Date.parse((item as any).updated_at ?? (item as any).created_at ?? '') || 0 }));
      items.sort((a, b) => b.updatedMs - a.updatedMs);

      const filesWithMetadata: FileMetadata[] = await Promise.all(
        items.map(async ({ item }) => {
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

          // attempt to load companion JSON description (fileName.json)
          let description: string | undefined = undefined;
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
                // if JSON contains externalUrl, override path
                if (json && typeof json.externalUrl === 'string') {
                  path = json.externalUrl;
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

          return {
            'File Name': item.name,
            'File Size': `${(size / 1024 / 1024).toFixed(2)} MB`,
            'Last Modified': updated ? new Date(updated).toLocaleDateString() : '',
            type: type.slice(0, -1) as 'image' | 'video' | 'document',
            path,
            mtimeMs: Date.parse(updated) || 0,
            Description: description,
          } as FileMetadata;
        })
      );

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
