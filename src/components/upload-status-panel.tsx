'use client';

import { useUpload } from '@/context/upload-provider';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';

export function UploadStatusPanel() {
  const { uploadingFiles, clearAll } = useUpload();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorFiles, setErrorFiles] = useState<string[]>([]);

  useEffect(() => {
    if (uploadingFiles.length === 0) return;

    const allCompleted = uploadingFiles.every(
      (f) => f.status === 'success' || f.status === 'error'
    );

    if (allCompleted) {
      const successFiles = uploadingFiles.filter((f) => f.status === 'success');
      const failedFiles = uploadingFiles.filter((f) => f.status === 'error');

      if (successFiles.length > 0) {
        setSuccessCount(successFiles.length);
        setShowSuccessModal(true);
      }

      if (failedFiles.length > 0) {
        setErrorFiles(failedFiles.map((f) => f.file.name));
        setShowErrorModal(true);
      }
    }
  }, [uploadingFiles]);

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    clearAll();
  };

  const handleCloseError = () => {
    setShowErrorModal(false);
    clearAll();
  };

  const isUploading = uploadingFiles.some(
    (f) => f.status === 'uploading' || f.status === 'pending'
  );

  return (
    <>
      {/* Upload in progress indicator - bottom right */}
      {isUploading && (
        <div className="fixed bottom-20 right-4 z-50">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Uploading {uploadingFiles.filter((f) => f.status === 'uploading').length} file(s)...
            </span>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-center text-xl">Upload Successful!</DialogTitle>
            <DialogDescription className="text-center">
              {successCount} file{successCount > 1 ? 's' : ''} uploaded successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={handleCloseSuccess} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={handleCloseError}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl">Upload Failed</DialogTitle>
            <DialogDescription className="text-center">
              The following file{errorFiles.length > 1 ? 's' : ''} failed to upload:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto">
            <ul className="list-disc list-inside text-sm space-y-1">
              {errorFiles.map((fileName, idx) => (
                <li key={idx} className="text-destructive">{fileName}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={handleCloseError} variant="destructive" className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
