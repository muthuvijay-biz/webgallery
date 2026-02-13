'use client';

import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Video as VideoIcon,
  Info,
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
import { UploadStatusPanel } from './upload-status-panel';
import { FileMetadata } from '@/lib/files';
import { FileDetailsModal } from './file-details-modal';

type GalleryClientProps = {
  photos: FileMetadata[];
  videos: FileMetadata[];
  documents: FileMetadata[];
  isAdmin?: boolean;
};

export function GalleryClient({
  photos,
  videos,
  documents,
  isAdmin = false,
}: GalleryClientProps) {
  const [activeTab, setActiveTab] = useState('photos');
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const authenticated = localStorage.getItem('is_admin') === 'true';
      if (!authenticated) {
        router.replace('/securelogin');
      } else {
        setIsClient(true);
      }
    } else {
      setIsClient(true);
    }
  }, [router, isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem('is_admin');
    router.push('/securelogin');
  };

  if (isAdmin && !isClient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg font-medium text-muted-foreground">
            Loading Gallery...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex items-center justify-between pb-6 border-b mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Static Gallery
        </h1>
        {isAdmin && (
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        )}
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
          {isAdmin && (
            <div className="w-full sm:w-auto">
              {activeTab === 'photos' && <UploadDialog type="images" />}
              {activeTab === 'videos' && <UploadDialog type="videos" />}
              {activeTab === 'documents' && <UploadDialog type="documents" />}
            </div>
          )}
        </div>

        <TabsContent value="photos">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <Card key={photo['File Name']} className="overflow-hidden group animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-0 relative aspect-square bg-black">
                  <Image
                    src={photo.path}
                    alt={photo['File Name']}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <FileDetailsModal file={photo}>
                      <Button variant="outline" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Details</span>
                      </Button>
                    </FileDetailsModal>
                    {isAdmin && (
                      <DeleteButton fileName={photo['File Name']} type="images" />
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-2 flex-col items-start">
                  <p className="text-sm truncate font-medium">{photo['File Name']}</p>
                  {photo['Description'] && <p className="text-xs text-muted-foreground truncate">{photo['Description']}</p>}
                  {photo['Capture Date'] && <p className="text-xs text-muted-foreground">{photo['Capture Date']}</p>}
                </CardFooter>
              </Card>
            ))}
             {photos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No photos uploaded yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="videos">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card key={video['File Name']} className="overflow-hidden group animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-0 relative aspect-video bg-black">
                  <video
                    controls
                    src={video.path}
                    className="w-full h-full"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <FileDetailsModal file={video}>
                      <Button variant="outline" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity !text-white bg-black/20 hover:bg-black/50 border-white/50">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Details</span>
                      </Button>
                    </FileDetailsModal>
                    {isAdmin && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteButton fileName={video['File Name']} type="videos" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-2">
                    <p className="text-sm truncate font-medium">{video['File Name']}</p>
                </CardFooter>
              </Card>
            ))}
             {videos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No videos uploaded yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex flex-col gap-4">
            {documents.map((doc) => (
              <Card key={doc['File Name']} className="animate-in fade-in-0 zoom-in-95 duration-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                    <a
                      href={doc.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline truncate"
                    >
                      {doc['File Name']}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                     <FileDetailsModal file={doc}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Details</span>
                      </Button>
                    </FileDetailsModal>
                    {isAdmin && <DeleteButton fileName={doc['File Name']} type="documents" />}
                  </div>
                </CardContent>
              </Card>
            ))}
             {documents.length === 0 && <p className="text-muted-foreground text-center py-10">No documents uploaded yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
      {isAdmin && <UploadStatusPanel />}
    </div>
  );
}
