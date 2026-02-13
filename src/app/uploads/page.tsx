import { getFiles } from '@/lib/files';
import { GalleryClient } from '@/components/gallery-client';

export default async function UploadsPage() {
  const photos = await getFiles('images');
  const videos = await getFiles('videos');
  const documents = await getFiles('documents');

  return (
    <div className="min-h-screen bg-background">
      <GalleryClient
        photos={photos}
        videos={videos}
        documents={documents}
        isAdmin={true}
      />
    </div>
  );
}
