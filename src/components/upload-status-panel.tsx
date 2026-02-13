'use client';

import { useUpload } from '@/context/upload-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  CircleDot,
  UploadCloud,
  XCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const StatusIcon = ({
  status,
}: {
  status: 'pending' | 'uploading' | 'success' | 'error';
}) => {
  switch (status) {
    case 'pending':
      return <CircleDot className="h-5 w-5 text-muted-foreground" />;
    case 'uploading':
      return <UploadCloud className="h-5 w-5 text-primary animate-pulse" />;
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
};

export function UploadStatusPanel() {
  const { uploadingFiles, clearCompleted, clearAll } = useUpload();
  const [isMinimized, setIsMinimized] = useState(false);

  const activeUploads = useMemo(
    () =>
      uploadingFiles.filter(
        (f) => f.status === 'uploading' || f.status === 'pending'
      ),
    [uploadingFiles]
  );

  const completedUploads = useMemo(
    () =>
      uploadingFiles.filter(
        (f) => f.status === 'success' || f.status === 'error'
      ),
    [uploadingFiles]
  );

  if (uploadingFiles.length === 0) {
    return null;
  }

  if (isMinimized) {
    const isUploading = activeUploads.length > 0;
    const allSuccessful =
      completedUploads.length > 0 &&
      completedUploads.length === uploadingFiles.length &&
      completedUploads.every((f) => f.status === 'success');

    let statusColor = 'bg-primary hover:bg-primary/90 text-primary-foreground';
    let statusIcon = <UploadCloud className="h-6 w-6 animate-pulse" />;
    let count = activeUploads.length;

    if (!isUploading) {
      if (allSuccessful) {
        statusColor = 'bg-green-500 hover:bg-green-500/90 text-white';
        statusIcon = <CheckCircle2 className="h-6 w-6" />;
      } else {
        statusColor =
          'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
        statusIcon = <XCircle className="h-6 w-6" />;
      }
      count = uploadingFiles.length;
    }

    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          className={cn(
            'pl-4 pr-5 shadow-2xl rounded-full h-14 flex items-center gap-2',
            statusColor
          )}
          onClick={() => setIsMinimized(false)}
        >
          {statusIcon}
          <span className="font-bold text-lg">{count}</span>
          <span className="sr-only">Show upload progress</span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-11/12 max-w-md z-50 shadow-2xl animate-in slide-in-from-bottom-5">
      <CardHeader className="flex flex-row items-center p-3">
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <CardTitle className="text-base font-semibold truncate">
            Uploading Files
          </CardTitle>
          {activeUploads.length > 0 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              ({activeUploads.length} in progress)
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(true)}
          >
            <ChevronDown className="h-5 w-5" />
            <span className="sr-only">Minimize</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearAll}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2">
          {uploadingFiles.map((item) => (
            <div key={item.id} className="grid gap-2">
              <div className="flex items-center gap-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.status === 'error'
                      ? item.message
                      : `${(item.file.size / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                </div>
              </div>
              {item.status === 'uploading' && (
                <Progress value={item.progress} className="h-2" />
              )}
              {item.status === 'success' && (
                <Progress value={100} className="h-2 [&>div]:bg-green-500" />
              )}
              {item.status === 'error' && (
                <Progress
                  value={100}
                  className="h-2 [&>div]:bg-destructive"
                />
              )}
            </div>
          ))}
        </div>
        {completedUploads.length > 0 && activeUploads.length === 0 && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              className="w-full"
            >
              Clear Completed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
