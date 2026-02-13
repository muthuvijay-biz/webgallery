'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpload } from '@/context/upload-provider';
import { Upload } from 'lucide-react';
import { useState, useRef } from 'react';

type UploadDialogProps = {
  type: 'images' | 'videos' | 'documents';
};

export function UploadDialog({ type }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const { uploadFiles } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (files) {
      uploadFiles(Array.from(files), type);
      setOpen(false);
      setFiles(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload {type.charAt(0).toUpperCase() + type.slice(1, -1)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Upload new {type === 'images' ? 'images' : type.slice(0, -1)}
          </DialogTitle>
          <DialogDescription>
            Select one or more files from your device. They will be added to the
            gallery.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Files</Label>
            <Input
              id="file"
              name="file"
              type="file"
              ref={inputRef}
              multiple
              required
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!files || files.length === 0}
          >
            Upload
            <Upload className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
