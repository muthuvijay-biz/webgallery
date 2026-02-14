'use client';

import { uploadFile as serverUploadFile } from '@/app/actions';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

type UploadingFile = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  message?: string;
};

type UploadContextType = {
  uploadingFiles: UploadingFile[];
  uploadFile: (
    file: File,
    description: string,
    type: 'images' | 'videos' | 'documents'
  ) => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = async (
    file: File,
    description: string,
    type: 'images' | 'videos' | 'documents'
  ) => {
    const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB (match server limit)

    const newFile: UploadingFile = {
      id: `${file.name}-${new Date().getTime()}`,
      file,
      status: 'pending',
      progress: 0,
    };

    setUploadingFiles((prev) => [newFile, ...prev]);

    // Client-side size validation
    if (file.size > MAX_UPLOAD_SIZE) {
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
      formData.append('file', file);
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
