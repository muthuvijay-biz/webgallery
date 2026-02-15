import { getFiles } from '@/lib/files';
import { GalleryClient } from '@/components/gallery-client';

export default async function UploadsPage() {
  const photos = await getFiles('images');
  const videos = await getFiles('videos');
  const documents = await getFiles('documents');
  const audios = await getFiles('audios');

  return (
    <div className="min-h-screen bg-background">
      <GalleryClient
        photos={photos}
        videos={videos}
        documents={documents}
        audios={audios}
        isAdmin={true}
      />
    </div>
  );
}
