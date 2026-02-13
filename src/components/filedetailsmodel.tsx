'use client';

import { FileMetadata } from '@/lib/files';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FileDetailsModalProps {
  file: FileMetadata;
  children: React.ReactNode;
}

export function FileDetailsModal({ file, children }: FileDetailsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold">Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              File Name
            </p>
            <p className="text-sm font-medium break-all">{file['File Name']}</p>
          </div>
          {file['Description'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm">{file['Description']}</p>
            </div>
          )}
          {file['Capture Date'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Capture Date
              </p>
              <p className="text-sm">{file['Capture Date']}</p>
            </div>
          )}
          {file['Upload Date'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Upload Date
              </p>
              <p className="text-sm">{file['Upload Date']}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}