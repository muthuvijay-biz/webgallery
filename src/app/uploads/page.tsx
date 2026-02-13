import { readdir } from 'fs/promises';
import { join } from 'path';
import { GalleryClient } from '@/components/gallery-client';
import { mkdir } from 'fs/promises';

async function getFiles(type: string): Promise<string[]> {
  const dirPath = join(process.cwd(), 'public', 'uploads', type);
  try {
    // Ensure directory exists
    await mkdir(dirPath, { recursive: true });
    return await readdir(dirPath);
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    // If directory doesn't exist or other error, return empty array
    return [];
  }
}

export default async function UploadsPage() {
  const photos = await getFiles('images');
  const videos = await getFiles('videos');
  const documents = await getFiles('documents');

  return (
    <div className="min-h-screen bg-background">
      <GalleryClient photos={photos} videos={videos} documents={documents} isAdmin={true} />
    </div>
  );
}
