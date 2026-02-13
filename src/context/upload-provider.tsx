'use client';

import { uploadFile } from '@/app/actions';
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
  uploadFiles: (files: File[], type: 'images' | 'videos' | 'documents') => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFiles = async (
    files: File[],
    type: 'images' | 'videos' | 'documents'
  ) => {
    const newFiles: UploadingFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${new Date().getTime()}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploadingFiles((prev) => [...newFiles, ...prev]);

    for (const uploadingFile of newFiles) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? { ...f, status: 'uploading', progress: 5 }
            : f
        )
      );

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) => {
            if (f.id === uploadingFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + 5 };
            }
            return f;
          })
        );
      }, 200);

      const formData = new FormData();
      formData.append('file', uploadingFile.file);
      formData.append('type', type);

      const result = await uploadFile(null, formData);

      clearInterval(progressInterval);

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? {
                ...f,
                status: result.success ? 'success' : 'error',
                progress: 100,
                message: result.message,
              }
            : f
        )
      );
    }
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
      value={{ uploadingFiles, uploadFiles, clearCompleted, clearAll }}
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
