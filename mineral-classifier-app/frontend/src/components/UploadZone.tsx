import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  isLoading?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onImageSelected, 
  isLoading = false 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      setFileSize(formatSize(file.size));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onImageSelected(file);
    }
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024,
    disabled: isLoading
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative group rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
        ${isLoading ? 'pointer-events-none' : ''}
        ${preview ? 'border-0' : 'border-2 border-dashed'}
        ${isDragActive 
          ? 'border-violet-500 bg-violet-50 ring-4 ring-violet-100' 
          : preview 
            ? '' 
            : 'border-gray-300 bg-gray-50/50 hover:border-violet-400 hover:bg-violet-50/50'
        }
      `}
    >
      <input {...getInputProps()} />
      
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Image Preview */}
            <div className="relative aspect-video max-h-80 overflow-hidden rounded-2xl bg-gray-900">
              <img 
                src={preview} 
                alt="Mineral specimen" 
                className="w-full h-full object-contain"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                    </svg>
                  </div>
                  <p className="text-white text-sm font-medium">Click to change image</p>
                </div>
              </div>
            </div>
            
            {/* File info bar */}
            <div className="flex items-center gap-3 mt-3 px-1">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.414-1.414a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                <p className="text-xs text-gray-400">{fileSize}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-xs font-medium text-emerald-700">Ready</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 px-8"
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className={`
                w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300
                ${isDragActive 
                  ? 'bg-violet-100 scale-110' 
                  : 'bg-gray-100 group-hover:bg-violet-100 group-hover:scale-105'
                }
              `}>
                <svg 
                  className={`w-9 h-9 transition-colors duration-300 ${
                    isDragActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-violet-500'
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>

              {/* Text */}
              {isDragActive ? (
                <div>
                  <p className="text-lg font-bold text-violet-700">Drop your image here</p>
                  <p className="text-sm text-violet-500 mt-1">Release to upload</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold text-gray-800">
                    Drop a mineral photo here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    or <span className="text-violet-600 font-semibold hover:text-violet-700">browse files</span> from your device
                  </p>
                </div>
              )}

              {/* Supported formats */}
              <div className="flex items-center gap-3 mt-6">
                {['JPG', 'PNG', 'WebP'].map((fmt) => (
                  <span key={fmt} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {fmt}
                  </span>
                ))}
                <span className="text-[11px] text-gray-400 font-medium">Max 5MB</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
