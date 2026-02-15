'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpload } from '@/context/upload-provider';
import { Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { Textarea } from './ui/textarea';

type UploadDialogProps = {
  type: 'images' | 'videos' | 'documents' | 'audios';
};

export function UploadDialog({ type }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const { uploadFile, uploadingFiles } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_BYTES = 50 * 1024 * 1024;
  const handleSubmit = () => {
    // prevent concurrent uploads
    const isUploading = uploadingFiles.some((u) => u.status === 'uploading');
    if (isUploading) return;

    if (file) {
      uploadFile(file, description, type);
      setOpen(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state on close
      setFile(null);
      setDescription('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload {type.charAt(0).toUpperCase() + type.slice(1, -1)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Upload new {type === 'images' ? 'image' : type.slice(0, -1)}
          </DialogTitle>
          <DialogDescription>
            Select a file from your device and optionally add a description.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              ref={inputRef}
              required
              onChange={(e) => {
                const f = e.target.files ? e.target.files[0] : null;
                setFile(f);
                if (f && f.size > MAX_BYTES) {
                  setFileError('Selected file is too large (max 50 MB). Use Link mode for larger files.');
                } else {
                  setFileError(null);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Max file size: 50 MB · One file at a time</p>
            {fileError && <p className="text-sm text-destructive mt-2">{fileError}</p>}          </div>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Type your description here."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <div className="flex items-center gap-2">
            {uploadingFiles.some(u => u.status === 'uploading') && (
              <p className="text-xs text-muted-foreground">An upload is in progress — please wait.</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!file || uploadingFiles.some(u => u.status === 'uploading') || !!fileError}
            >
              Upload
              <Upload className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
