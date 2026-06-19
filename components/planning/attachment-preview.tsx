"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { X, Download, ExternalLink, FileText, File, ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentItem = {
  id: string
  url: string
  name: string
  mimeType?: string | null
  sizeBytes?: number | null
}

type Props = {
  attachments: AttachmentItem[]
  onRemove?: (id: string) => void
  compact?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType?: string | null, url?: string): boolean {
  if (mimeType) return mimeType.startsWith("image/")
  // Fallback: check URL extension
  const ext = (url ?? "").split(".").pop()?.split("?")[0]?.toLowerCase()
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext ?? "")
}

function isPdf(mimeType?: string | null, url?: string): boolean {
  if (mimeType) return mimeType === "application/pdf"
  const ext = (url ?? "").split(".").pop()?.split("?")[0]?.toLowerCase()
  return ext === "pdf"
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: AttachmentItem[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const current = images[idx]

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])
  const next = useCallback(
    () => setIdx((i) => Math.min(images.length - 1, i + 1)),
    [images.length]
  )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, prev, next])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            disabled={idx === 0}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 disabled:opacity-30 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            disabled={idx === images.length - 1}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 disabled:opacity-30 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.name}
          className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl"
        />
        <div className="flex items-center gap-3 text-white/80 text-sm">
          <span>{current.name}</span>
          {images.length > 1 && (
            <span className="text-white/50">
              {idx + 1} / {images.length}
            </span>
          )}
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttachmentPreview({ attachments, onRemove, compact = false }: Props) {
  const [lightboxImages, setLightboxImages] = useState<AttachmentItem[] | null>(null)
  const [lightboxStart, setLightboxStart] = useState(0)

  if (attachments.length === 0) return null

  const images = attachments.filter((a) => isImage(a.mimeType, a.url))
  const nonImages = attachments.filter((a) => !isImage(a.mimeType, a.url))

  function openLightbox(imageId: string) {
    const idx = images.findIndex((img) => img.id === imageId)
    setLightboxStart(idx >= 0 ? idx : 0)
    setLightboxImages(images)
  }

  return (
    <>
      {/* Image grid */}
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1.5",
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
              ? "grid-cols-2"
              : images.length === 3
              ? "grid-cols-3"
              : "grid-cols-4"
          )}
        >
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                onClick={() => openLightbox(img.id)}
                className={cn(
                  "w-full object-cover cursor-pointer transition-transform hover:scale-105",
                  compact ? "h-12" : "h-24"
                )}
              />
              {/* Remove button */}
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Remove "${img.name}"?`)) {
                      onRemove(img.id)
                    }
                  }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/75"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {!compact && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate">{img.name}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-image files */}
      {nonImages.length > 0 && (
        <div className={cn("space-y-1", images.length > 0 && "mt-1.5")}>
          {nonImages.map((file) => {
            const pdf = isPdf(file.mimeType, file.url)
            const sizeLabel = formatBytes(file.sizeBytes)
            return (
              <div
                key={file.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border border-border bg-white px-3 transition-colors hover:bg-muted/20",
                  compact ? "py-1.5" : "py-2"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center rounded font-bold text-white",
                    compact ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[10px]",
                    pdf ? "bg-red-500" : "bg-blue-500"
                  )}
                >
                  {pdf ? "PDF" : <File className={compact ? "h-3 w-3" : "h-4 w-4"} />}
                </div>

                {/* Name + size */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "truncate font-medium",
                      compact ? "text-[11px]" : "text-xs"
                    )}
                  >
                    {file.name}
                  </p>
                  {!compact && sizeLabel && (
                    <p className="text-[10px] text-muted-foreground">{sizeLabel}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-2 py-0.5 text-primary hover:bg-primary/10 transition-colors font-medium",
                      compact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    {pdf ? (
                      <>
                        <ExternalLink className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                        View
                      </>
                    ) : (
                      <>
                        <Download className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                        Download
                      </>
                    )}
                  </a>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(file.id)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      aria-label="Remove attachment"
                    >
                      <X className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImages && (
        <Lightbox
          images={lightboxImages}
          startIndex={lightboxStart}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </>
  )
}
