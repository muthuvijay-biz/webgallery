'use client';

import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  LogOut,
  Video as VideoIcon,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadDialog } from './upload-dialog';
import { DeleteButton } from './delete-button';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type GalleryClientProps = {
  photos: string[];
  videos: string[];
  documents: string[];
};

export function GalleryClient({
  photos,
  videos,
  documents,
}: GalleryClientProps) {
  const [activeTab, setActiveTab] = useState('photos');
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
      router.replace('/login');
    } else {
      setIsClient(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('is_admin');
    router.push('/login');
  };

  if (!isClient) {
    // Render nothing or a loading spinner until the client-side auth check is complete
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex items-center justify-between pb-6 border-b mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Static Gallery
        </h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="photos">
              <ImageIcon className="mr-2 h-4 w-4" />
              Photos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <VideoIcon className="mr-2 h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>
          <div className="w-full sm:w-auto">
            {activeTab === 'photos' && <UploadDialog type="images" />}
            {activeTab === 'videos' && <UploadDialog type="videos" />}
            {activeTab === 'documents' && <UploadDialog type="documents" />}
          </div>
        </div>

        <TabsContent value="photos">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <Card key={photo} className="overflow-hidden group animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-0 relative aspect-square">
                  <Image
                    src={`/uploads/images/${photo}`}
                    alt={photo}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  />
                  <div className="absolute top-2 right-2">
                    <DeleteButton fileName={photo} type="images" />
                  </div>
                </CardContent>
              </Card>
            ))}
             {photos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No photos uploaded yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="videos">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card key={video} className="overflow-hidden group animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-0 relative aspect-video bg-black">
                  <video
                    controls
                    src={`/uploads/videos/${video}`}
                    className="w-full h-full"
                  />
                  <div className="absolute top-2 right-2">
                    <DeleteButton fileName={video} type="videos" />
                  </div>
                </CardContent>
                <CardFooter className="p-2">
                    <p className="text-sm truncate font-medium">{video}</p>
                </CardFooter>
              </Card>
            ))}
             {videos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No videos uploaded yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex flex-col gap-4">
            {documents.map((doc) => (
              <Card key={doc} className="animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <a
                      href={`/uploads/documents/${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {doc}
                    </a>
                  </div>
                  <DeleteButton fileName={doc} type="documents" />
                </CardContent>
              </Card>
            ))}
             {documents.length === 0 && <p className="text-muted-foreground text-center py-10">No documents uploaded yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
