'use client';

import { useUpload } from '@/context/upload-provider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  CircleDot,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Button } from './ui/button';

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
  const { uploadingFiles, clearCompleted } = useUpload();

  const activeUploads = uploadingFiles.filter(
    (f) => f.status === 'uploading' || f.status === 'pending'
  );
  const completedUploads = uploadingFiles.filter(
    (f) => f.status === 'success' || f.status === 'error'
  );

  if (uploadingFiles.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl">
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Uploading Files</h3>
                {activeUploads.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({activeUploads.length} in progress)
                  </span>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-2">
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
                    <Progress value={100} className="h-2" />
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
            {completedUploads.length > 0 && (
              <div className="mt-4">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
