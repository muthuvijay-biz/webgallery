import { readdir, stat, readFile } from 'fs/promises';
import { join, parse } from 'path';
import { mkdir } from 'fs/promises';

export type FileMetadata = {
  'File Name': string;
  'File Size': string;
  'Last Modified': string;
  'Capture Date'?: string;
  'Location'?: string;
  'Description'?: string;
  type: 'image' | 'video' | 'document';
  path: string;
};

async function getFileMetadata(filePath: string, fileName: string, type: 'images' | 'videos' | 'documents'): Promise<FileMetadata> {
  const stats = await stat(filePath);
  const metadata: FileMetadata = {
    'File Name': fileName,
    'File Size': `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    'Last Modified': stats.mtime.toLocaleDateString(),
    type: type.slice(0, -1) as 'image' | 'video' | 'document',
    path: `/uploads/${type}/${fileName}`
  };

  // Check for description file
  const descriptionPath = `${filePath}.json`;
  try {
    const descriptionContent = await readFile(descriptionPath, 'utf-8');
    const descriptionData = JSON.parse(descriptionContent);
    if (descriptionData.description) {
      metadata['Description'] = descriptionData.description;
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
  const dirPath = join(process.cwd(), 'public', 'uploads', type);
  try {
    await mkdir(dirPath, { recursive: true });
    const fileNames = await readdir(dirPath);
    if (fileNames.length === 0) return [];
    
    const filesWithMetadata = await Promise.all(
      fileNames.filter(name => !name.endsWith('.json')).map(name => getFileMetadata(join(dirPath, name), name, type))
    );
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
