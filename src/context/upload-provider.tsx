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
    const newFile: UploadingFile = {
      id: `${file.name}-${new Date().getTime()}`,
      file,
      status: 'pending',
      progress: 0,
    };

    setUploadingFiles((prev) => [newFile, ...prev]);

    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === newFile.id ? { ...f, status: 'uploading', progress: 5 } : f
      )
    );

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadingFiles((prev) =>
        prev.map((f) => {
          if (f.id === newFile.id && f.progress < 90) {
            return { ...f, progress: f.progress + 5 };
          }
          return f;
        })
      );
    }, 200);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('description', description);

    const result = await serverUploadFile(null, formData);

    clearInterval(progressInterval);

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
