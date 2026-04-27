"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "video/webm": [".webm"],
  "video/x-matroska": [".mkv"],
};

export function UploadArea({ onFile, disabled }: UploadAreaProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxFiles: 1,
      disabled,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer",
        isDragActive && !isDragReject
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
          : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/30 dark:hover:border-gray-500 dark:hover:bg-gray-800/50",
        isDragReject && "border-red-500 bg-red-50 dark:bg-red-950/20",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700/60">
        {isDragActive ? (
          <Film className="h-8 w-8 text-indigo-500 animate-pulse" />
        ) : (
          <Upload className="h-8 w-8 text-gray-500 dark:text-gray-400" />
        )}
      </div>
      <div>
        <p className="text-base font-medium text-gray-800 dark:text-gray-200">
          {isDragActive
            ? isDragReject
              ? "Unsupported file type"
              : "Drop your video here"
            : "Drag & drop your video"}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          or click to browse &mdash; MP4, MOV, AVI, WebM, MKV &bull; up to 500 MB
        </p>
      </div>
    </div>
  );
}
