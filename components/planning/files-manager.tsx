"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { addEventFile, deleteEventFile } from "@/actions/event-files"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  ExternalLink,
  Plus,
  FolderOpen,
  DollarSign,
  LayoutGrid,
  ClipboardList,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventFileCategory =
  | "CONTRACT"
  | "RECEIPT"
  | "FLOOR_PLAN"
  | "POSTER"
  | "MARKETING_ASSET"
  | "VENDOR_DOCUMENT"
  | "STAFF_INSTRUCTIONS"
  | "RUN_SHEET"
  | "PHOTO"
  | "OTHER"

export type FileSerialized = {
  id: string
  eventId: string
  category: EventFileCategory
  name: string
  url: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedBy: string
  taskId: string | null
  vendorId: string | null
  description: string | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<EventFileCategory, string> = {
  CONTRACT: "Contract",
  RECEIPT: "Receipt",
  FLOOR_PLAN: "Floor Plan",
  POSTER: "Poster",
  MARKETING_ASSET: "Marketing",
  VENDOR_DOCUMENT: "Vendor Doc",
  STAFF_INSTRUCTIONS: "Staff Instructions",
  RUN_SHEET: "Run Sheet",
  PHOTO: "Photo",
  OTHER: "Other",
}

const CATEGORY_BADGE_COLORS: Record<EventFileCategory, string> = {
  CONTRACT: "bg-blue-100 text-blue-800 border-blue-200",
  RECEIPT: "bg-green-100 text-green-800 border-green-200",
  FLOOR_PLAN: "bg-purple-100 text-purple-800 border-purple-200",
  POSTER: "bg-pink-100 text-pink-800 border-pink-200",
  MARKETING_ASSET: "bg-orange-100 text-orange-800 border-orange-200",
  VENDOR_DOCUMENT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  STAFF_INSTRUCTIONS: "bg-cyan-100 text-cyan-800 border-cyan-200",
  RUN_SHEET: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PHOTO: "bg-rose-100 text-rose-800 border-rose-200",
  OTHER: "bg-stone-100 text-stone-700 border-stone-200",
}

function CategoryIcon({
  category,
  className,
}: {
  category: EventFileCategory
  className?: string
}) {
  const cls = cn("h-5 w-5", className)
  switch (category) {
    case "CONTRACT":
      return <FileText className={cls} />
    case "RECEIPT":
      return <DollarSign className={cls} />
    case "PHOTO":
      return <Image className={cls} />
    case "FLOOR_PLAN":
      return <LayoutGrid className={cls} />
    case "RUN_SHEET":
      return <ClipboardList className={cls} />
    default:
      return <File className={cls} />
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const ALL_CATEGORIES: EventFileCategory[] = [
  "CONTRACT",
  "RECEIPT",
  "FLOOR_PLAN",
  "POSTER",
  "MARKETING_ASSET",
  "VENDOR_DOCUMENT",
  "STAFF_INSTRUCTIONS",
  "RUN_SHEET",
  "PHOTO",
  "OTHER",
]

type FilterTab = "ALL" | EventFileCategory

// ─── Component ────────────────────────────────────────────────────────────────

export function FilesClient({
  eventId,
  initialFiles,
}: {
  eventId: string
  initialFiles: FileSerialized[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [files, setFiles] = useState<FileSerialized[]>(initialFiles)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL")
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileSerialized | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [form, setForm] = useState({
    url: "",
    name: "",
    category: "OTHER" as EventFileCategory,
    description: "",
  })

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered =
    activeFilter === "ALL"
      ? files
      : files.filter((f) => f.category === activeFilter)

  // ── Add file ─────────────────────────────────────────────────────────────
  function handleAddOpen() {
    setForm({ url: "", name: "", category: "OTHER", description: "" })
    setError(null)
    setAddOpen(true)
  }

  async function handleAdd() {
    if (!form.url.trim() || !form.name.trim()) {
      setError("URL and name are required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addEventFile(eventId, {
        url: form.url.trim(),
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
      })
      if (res.success && res.data) {
        const added: FileSerialized = {
          id: (res.data as { id: string }).id,
          eventId,
          category: form.category,
          name: form.name.trim(),
          url: form.url.trim(),
          mimeType: null,
          sizeBytes: null,
          uploadedBy: "admin",
          taskId: null,
          vendorId: null,
          description: form.description.trim() || null,
          createdAt: new Date().toISOString(),
        }
        setFiles((prev) => [added, ...prev])
        setAddOpen(false)
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to add file.")
      }
    })
  }

  // ── Delete file ──────────────────────────────────────────────────────────
  async function handleDelete(file: FileSerialized) {
    startTransition(async () => {
      const res = await deleteEventFile(file.id)
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        setDeleteTarget(null)
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to delete file.")
        setDeleteTarget(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Upload notice ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-[#c57a3a]/30 bg-[#c57a3a]/10 px-4 py-3">
        <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[#c57a3a]" />
        <p className="text-sm text-stone-700">
          Upload files to{" "}
          <span className="font-semibold text-[#c57a3a]">Cloudinary</span> first,
          then paste the URL here — or paste any external URL directly.
        </p>
      </div>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={handleAddOpen}
          className="gap-2 bg-[#c57a3a] text-white hover:bg-[#a8652f]"
        >
          <Plus className="h-4 w-4" />
          Add File
        </Button>
      </div>

      {/* ── Category filter tabs ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            activeFilter === "ALL"
              ? "bg-[#c57a3a] text-white"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          )}
        >
          All ({files.length})
        </button>
        {ALL_CATEGORIES.filter((cat) =>
          files.some((f) => f.category === cat)
        ).map((cat) => {
          const count = files.filter((f) => f.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                activeFilter === cat
                  ? "bg-[#c57a3a] text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              )}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          )
        })}
      </div>

      {/* ── File grid ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 py-16 text-center">
          <FolderOpen className="h-10 w-10 text-stone-300" />
          <p className="text-stone-400">
            {activeFilter === "ALL"
              ? "No files yet. Add one above."
              : `No ${CATEGORY_LABELS[activeFilter]} files.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((file) => (
            <Card
              key={file.id}
              className="group border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7EDDB]">
                      <CategoryIcon
                        category={file.category}
                        className="text-[#c57a3a]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">
                        {file.name}
                      </p>
                      {file.sizeBytes && (
                        <p className="text-xs text-stone-400">
                          {formatBytes(file.sizeBytes)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      title="Open file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setDeleteTarget(file)}
                      className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      CATEGORY_BADGE_COLORS[file.category]
                    )}
                  >
                    {CATEGORY_LABELS[file.category]}
                  </Badge>
                </div>

                {file.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                    {file.description}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-xs text-stone-400">
                  <span>{file.uploadedBy}</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add File dialog ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#F7EDDB] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">
              Add File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="file-url">URL</Label>
              <Input
                id="file-url"
                placeholder="https://res.cloudinary.com/... or any URL"
                value={form.url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, url: e.target.value }))
                }
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                placeholder="e.g. Venue Contract Q3 2026"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as EventFileCategory }))
                }
              >
                <SelectTrigger id="file-category" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file-desc">Description (optional)</Label>
              <Textarea
                id="file-desc"
                placeholder="Brief note about this file…"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                className="bg-white"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isPending}
              className="bg-[#c57a3a] text-white hover:bg-[#a8652f]"
            >
              {isPending ? "Adding…" : "Add File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="bg-[#F7EDDB] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">
              Delete File
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deleteTarget?.name}</span>? This
            cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
