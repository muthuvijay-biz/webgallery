'use client';

import { uploadFile as serverUploadFile } from '@/app/actions';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

type RemoteFileDescriptor = { name: string; url?: string; size?: number; mime?: string };

type UploadingFile = {
  id: string;
  file: File | RemoteFileDescriptor;
  status: UploadStatus;
  progress: number;
  message?: string;
};

type UploadContextType = {
  uploadingFiles: UploadingFile[];
  uploadFile: (
    file: File,
    description: string,
    type: 'images' | 'videos' | 'documents' | 'audios'
  ) => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = async (
    fileOrUrl: File | { url: string; name?: string; size?: number; mime?: string },
    description: string,
    type: 'images' | 'videos' | 'documents' | 'audios'
  ) => {
    const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB (match server limit)

    const fileName = 'name' in fileOrUrl ? fileOrUrl.name ?? 'remote-file' : fileOrUrl.name;

    const newFile: UploadingFile = {
      id: `${fileName}-${new Date().getTime()}`,
      file: fileOrUrl as any,
      status: 'pending',
      progress: 0,
    };

    setUploadingFiles((prev) => [newFile, ...prev]);

    // Client-side size validation (only possible for local File or when size provided)
    const sizeToCheck = 'size' in fileOrUrl ? (fileOrUrl as any).size : ('size' in fileOrUrl ? (fileOrUrl as any).size : undefined);
    if (sizeToCheck && sizeToCheck > MAX_UPLOAD_SIZE) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: 'error',
                progress: 100,
                message: `File is too large (max ${MAX_UPLOAD_SIZE / 1024 / 1024} MB).`,
              }
            : f
        )
      );
      return;
    }

    // Use a small timeout to ensure the UI updates to 'pending' before 'uploading'
    setTimeout(async () => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, status: 'uploading', progress: 50 } // Set to 50% to show it's in progress
            : f
        )
      );

      const formData = new FormData();

      // If fileOrUrl is a File, append as file; otherwise append url + optional filename/mime
      if (fileOrUrl instanceof File) {
        formData.append('file', fileOrUrl);
      } else {
        formData.append('url', fileOrUrl.url);
        if (fileOrUrl.name) formData.append('fileName', fileOrUrl.name);
        if (fileOrUrl.mime) formData.append('mime', fileOrUrl.mime);
      }

      formData.append('type', type);
      formData.append('description', description);

      let result: { success: boolean; message?: string } = { success: false, message: 'Unknown error' };
      try {
        result = await serverUploadFile(null, formData);
      } catch (err: any) {
        console.error('serverUploadFile threw:', err);
        result = { success: false, message: err?.message || 'Upload failed' };
      }

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: result.success ? 'success' : 'error',
                progress: 100,
                message: result.message,
              }
            : f
        )
      );
    }, 100);
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.status === 'uploading' || f.status === 'pending')
    );
  };

  const clearAll = () => {
    setUploadingFiles([]);
  };

  return (
    <UploadContext.Provider
      value={{ uploadingFiles, uploadFile, clearCompleted, clearAll }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
