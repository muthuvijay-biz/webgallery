'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { FileMetadata } from '@/lib/files';
import { ScrollArea } from './ui/scroll-area';

type FileDetailsModalProps = {
  file: FileMetadata;
  children: React.ReactNode;
};

export function FileDetailsModal({ file, children }: FileDetailsModalProps) {
  const detailsToShow = [
    { key: 'File Name', value: file['File Name'] },
    { key: 'File Size', value: file['File Size'] },
    { key: 'Description', value: file['Description'] },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96 pr-6">
            <div className="mt-4 space-y-3 text-sm">
            {detailsToShow.map(({ key, value }) => {
                if (!value) return null;
                return (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-2 items-start">
                    <p className="font-semibold text-muted-foreground break-words">{key}</p>
                    <p className="break-words">{value.toString()}</p>
                </div>
                );
            })}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
