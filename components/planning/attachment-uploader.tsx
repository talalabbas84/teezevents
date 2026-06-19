"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Paperclip, ImageIcon, FileText, File, UploadCloud, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadedFile = {
  url: string
  name: string
  mimeType: string
  sizeBytes: number
}

type CloudinaryUploadResult = {
  secure_url: string
  resource_type?: string
  bytes?: number
  format?: string
  original_filename?: string
}

export type AttachmentUploaderProps = {
  onUpload: (file: UploadedFile) => void
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
  compact?: boolean
}

// ─── Cloudinary upload (XHR) ──────────────────────────────────────────────────

function uploadToCloudinary({
  file,
  onProgress,
}: {
  file: File
  onProgress: (progress: number) => void
}): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    return Promise.reject(
      new Error(
        "Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for uploads."
      )
    )
  }

  const body = new FormData()
  body.append("file", file)
  body.append("upload_preset", uploadPreset)
  body.append("folder", "teez-events/attachments")

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`)

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      const payload = JSON.parse(request.responseText || "null") as
        | (CloudinaryUploadResult & { error?: { message?: string } })
        | null

      if (
        request.status < 200 ||
        request.status >= 300 ||
        typeof payload?.secure_url !== "string"
      ) {
        reject(new Error(payload?.error?.message || "Cloudinary upload failed."))
        return
      }

      resolve(payload)
    }

    request.onerror = () =>
      reject(new Error("Cloudinary upload failed. Check your connection and try again."))
    request.send(body)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttachmentUploader({
  onUpload,
  accept = "image/*,application/pdf,.doc,.docx,.xlsx,.csv",
  maxSizeMb = 10,
  disabled = false,
  compact = false,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function resetError() {
    setError(null)
  }

  async function handleFile(file: File) {
    if (disabled || uploading) return
    resetError()

    const maxBytes = maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`File is too large. Maximum size is ${maxSizeMb} MB.`)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const result = await uploadToCloudinary({
        file,
        onProgress: (p) => setProgress(p),
      })

      onUpload({
        url: result.secure_url,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      setProgress(0)
      // Reset file input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  // ── Compact mode: just a paperclip button ────────────────────────────────
  if (compact) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => {
            resetError()
            inputRef.current?.click()
          }}
          title="Attach file"
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
            uploading
              ? "text-primary cursor-wait"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || uploading}
        />
        {/* Inline progress shown as a small overlay badge */}
        {uploading && progress > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-primary text-white text-[9px] font-bold leading-none px-1 py-0.5">
            {progress}%
          </span>
        )}
        {error && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-lg whitespace-normal">
            <div className="flex items-start gap-1.5">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={resetError}
                className="shrink-0 text-red-400 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Default: drop zone ───────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading) {
            resetError()
            inputRef.current?.click()
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors cursor-pointer select-none",
          isDragging
            ? "border-primary/60 bg-primary/5"
            : error
            ? "border-red-300 bg-red-50"
            : "border-border hover:border-primary/40 hover:bg-muted/20",
          (disabled || uploading) && "cursor-not-allowed opacity-60"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <svg
              className="h-6 w-6 animate-spin text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-sm font-medium text-foreground">Uploading… {progress}%</p>
            <div className="w-full rounded-full bg-muted h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud
              className={cn(
                "h-8 w-8",
                isDragging ? "text-primary" : "text-muted-foreground/60"
              )}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary">Click to attach</span> or drag &amp; drop
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Images, PDF, Word, Excel, CSV — up to {maxSizeMb} MB
              </p>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground/50">
              <ImageIcon className="h-4 w-4" />
              <FileText className="h-4 w-4" />
              <File className="h-4 w-4" />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={resetError}
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />
    </div>
  )
}
