import { getFiles } from '@/lib/files';
import GalleryHero from '@/components/gallery-hero';
import { GalleryClient } from '@/components/gallery-client';

export default async function GalleryPage() {
  const photos = await getFiles('images');
  const videos = await getFiles('videos');
  const documents = await getFiles('documents');
  const audios = await getFiles('audios');

  return (
    <div className="bg-background">
      <GalleryClient
        photos={photos}
        videos={videos}
        documents={documents}
        audios={audios}
        isAdmin={false}
      />
    </div>
  );
}
