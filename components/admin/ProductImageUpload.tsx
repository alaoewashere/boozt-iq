"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

export function ProductImageUpload({
  previewUrl,
  onFileChange,
  onRemove,
  error,
  disabled,
  uploadProgress,
}: {
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  error: string | null;
  disabled?: boolean;
  /** null = idle; -1 = indeterminate; 0–100 = percent */
  uploadProgress: number | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const applyFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setLocalError(null);
        onFileChange(null);
        return;
      }
      const err = validateImageFile(file);
      if (err) {
        setLocalError(err);
        return;
      }
      setLocalError(null);
      onFileChange(file);
    },
    [onFileChange]
  );

  const handleFiles = (list: FileList | null) => {
    const f = list?.[0];
    applyFile(f ?? null);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          Product Image
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          Upload JPG, PNG, WebP (max 5MB)
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
          dragOver
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="relative aspect-square w-full max-w-xs">
            <Image
              src={previewUrl}
              alt=""
              fill
              className="rounded-lg object-cover"
              sizes="320px"
              unoptimized={previewUrl.startsWith("blob:")}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={disabled}
              className="absolute end-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-center text-sm text-[var(--text-secondary)]">
              Drag and drop an image here, or{" "}
              <span className="text-[var(--accent)] underline">click to browse</span>
            </p>
          </>
        )}
      </div>

      {(error ?? localError) && (
        <p className="text-sm text-[var(--error)]" role="alert">
          {error ?? localError}
        </p>
      )}

      {uploadProgress !== null && (
        <div className="space-y-1">
          {uploadProgress === -1 ? (
            <div className="h-2 w-full animate-pulse rounded-full bg-[var(--bg-secondary)]" />
          ) : (
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150"
                style={{ width: `${Math.min(100, uploadProgress)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            {uploadProgress === -1
              ? "Uploading…"
              : `Uploading… ${uploadProgress}%`}
          </p>
        </div>
      )}
    </div>
  );
}
