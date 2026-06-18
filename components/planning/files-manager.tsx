"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { addEventFile, createEventFileFolder, deleteEventFile } from "@/actions/event-files"

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
import { Checkbox } from "@/components/ui/checkbox"
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
  UploadCloud,
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
  Loader2,
  Link as LinkIcon,
  Star,
  ChevronRight,
  FolderPlus,
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
  | "LINK"
  | "OTHER"

export type FileSerialized = {
  id: string
  eventId: string
  category: EventFileCategory
  folderId: string | null
  folder: string
  isImportant: boolean
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

export type FileFolderSerialized = {
  id: string
  eventId: string
  parentId: string | null
  name: string
  path: string
  createdAt: string
  updatedAt: string
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
  LINK: "Link",
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
  LINK: "bg-sky-100 text-sky-800 border-sky-200",
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
    case "LINK":
      return <LinkIcon className={cls} />
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
  "LINK",
  "OTHER",
]

const DEFAULT_FOLDER_BY_CATEGORY: Record<EventFileCategory, string> = {
  CONTRACT: "Contracts",
  RECEIPT: "Receipts",
  FLOOR_PLAN: "Floor Plans",
  POSTER: "Marketing Assets",
  MARKETING_ASSET: "Marketing Assets",
  VENDOR_DOCUMENT: "Vendor Documents",
  STAFF_INSTRUCTIONS: "Staff Instructions",
  RUN_SHEET: "Run Sheets",
  PHOTO: "Photos",
  LINK: "Important Links",
  OTHER: "Resources",
}

function getDefaultFolder(category: EventFileCategory) {
  return DEFAULT_FOLDER_BY_CATEGORY[category] ?? "Resources"
}

function getDisplayFolder(folder?: string | null) {
  return folder?.trim() || "Resources"
}

function inferCategoryFromFile(file: File | null, fallback: EventFileCategory) {
  if (!file) return fallback
  if (file.type.startsWith("image/")) return "PHOTO"
  if (file.type === "application/pdf") return "VENDOR_DOCUMENT"
  return fallback === "LINK" ? "OTHER" : fallback
}

const ROOT_VIEW = "ROOT"
const ALL_VIEW = "ALL"
const IMPORTANT_VIEW = "IMPORTANT"
const ROOT_FOLDER_VALUE = "__root__"

function folderViewId(folderId: string) {
  return `folder:${folderId}`
}

function getFolderIdFromView(view: string) {
  return view.startsWith("folder:") ? view.slice("folder:".length) : null
}

function getFolderPath(folder: FileFolderSerialized | null | undefined) {
  return folder?.path ?? "Resources"
}

type CloudinaryUploadResult = {
  secure_url: string
  resource_type?: string
  bytes?: number
  format?: string
  original_filename?: string
}

function uploadToCloudinary({
  file,
  eventId,
  onProgress,
}: {
  file: File
  eventId: string
  onProgress: (progress: number) => void
}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    return Promise.reject(new Error("Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for uploads."))
  }

  const body = new FormData()
  body.append("file", file)
  body.append("upload_preset", uploadPreset)
  body.append("folder", `teez-events/${eventId}/documents`)

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

      if (request.status < 200 || request.status >= 300 || typeof payload?.secure_url !== "string") {
        reject(new Error(payload?.error?.message || "Cloudinary upload failed."))
        return
      }

      resolve(payload)
    }

    request.onerror = () => reject(new Error("Cloudinary upload failed. Check your connection and try again."))
    request.send(body)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilesClient({
  eventId,
  initialFiles,
  initialFolders,
  uploaderEmail,
}: {
  eventId: string
  initialFiles: FileSerialized[]
  initialFolders: FileFolderSerialized[]
  uploaderEmail: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [files, setFiles] = useState<FileSerialized[]>(initialFiles)
  const [folders, setFolders] = useState<FileFolderSerialized[]>(initialFolders)
  const [activeView, setActiveView] = useState(ROOT_VIEW)
  const [addOpen, setAddOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileSerialized | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [folderError, setFolderError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newFolderName, setNewFolderName] = useState("")

  // Add form state
  const [form, setForm] = useState({
    url: "",
    name: "",
    category: "OTHER" as EventFileCategory,
    folderId: null as string | null,
    folder: "Resources",
    isImportant: false,
    description: "",
    selectedFile: null as File | null,
  })

  const folderById = useMemo(() => {
    return new Map(folders.map((folder) => [folder.id, folder]))
  }, [folders])

  const folderCounts = useMemo(() => {
    return files.reduce<Record<string, number>>((counts, file) => {
      if (!file.folderId) return counts
      counts[file.folderId] = (counts[file.folderId] ?? 0) + 1
      return counts
    }, {})
  }, [files])

  const folderTree = useMemo(() => {
    const byParent = new Map<string, FileFolderSerialized[]>()
    folders.forEach((folder) => {
      const parent = folder.parentId ?? ROOT_FOLDER_VALUE
      byParent.set(parent, [...(byParent.get(parent) ?? []), folder])
    })
    byParent.forEach((items) => items.sort((a, b) => a.name.localeCompare(b.name)))

    const flattened: Array<FileFolderSerialized & { depth: number }> = []
    const visit = (parentId: string, depth: number) => {
      for (const folder of byParent.get(parentId) ?? []) {
        flattened.push({ ...folder, depth })
        visit(folder.id, depth + 1)
      }
    }
    visit(ROOT_FOLDER_VALUE, 0)
    return flattened
  }, [folders])

  const currentFolderId = getFolderIdFromView(activeView)
  const currentFolder = currentFolderId ? folderById.get(currentFolderId) ?? null : null
  const currentChildFolders =
    activeView === ROOT_VIEW || currentFolderId
      ? folders
          .filter((folder) => (currentFolderId ? folder.parentId === currentFolderId : folder.parentId === null))
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return []
    const trail: FileFolderSerialized[] = []
    let cursor: FileFolderSerialized | undefined = currentFolder
    while (cursor) {
      trail.unshift(cursor)
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined
    }
    return trail
  }, [currentFolder, folderById])

  const importantCount = files.filter((file) => file.isImportant).length
  const filtered =
    activeView === ALL_VIEW
      ? files
      : activeView === IMPORTANT_VIEW
        ? files.filter((file) => file.isImportant)
        : activeView === ROOT_VIEW
          ? files.filter((file) => !file.folderId)
          : files.filter((file) => file.folderId === currentFolderId)
  const activeTitle =
    activeView === ALL_VIEW
      ? "All Resources"
      : activeView === IMPORTANT_VIEW
        ? "Important"
        : currentFolder?.name ?? "Folders"

  function getDefaultFolderId(category: EventFileCategory) {
    const path = getDefaultFolder(category)
    return folders.find((folder) => folder.path === path)?.id ?? null
  }

  function getCurrentUploadFolderId(category: EventFileCategory) {
    return currentFolderId ?? getDefaultFolderId(category)
  }

  // ── Add file ─────────────────────────────────────────────────────────────
  function handleAddOpen() {
    const folderId = getCurrentUploadFolderId("OTHER")
    const folder = folderId ? folderById.get(folderId) : null
    setForm({
      url: "",
      name: "",
      category: "OTHER",
      folderId,
      folder: getFolderPath(folder),
      isImportant: false,
      description: "",
      selectedFile: null,
    })
    setError(null)
    setUploadProgress(0)
    setAddOpen(true)
  }

  function handleFileSelected(file: File | null) {
    setError(null)
    setUploadProgress(0)
    setForm((current) => {
      const category = inferCategoryFromFile(file, current.category)
      const folderId = file ? getCurrentUploadFolderId(category) : current.folderId
      const folder = folderId ? folderById.get(folderId) : null
      return {
        ...current,
        selectedFile: file,
        name: file && !current.name.trim() ? file.name.replace(/\.[^/.]+$/, "") : current.name,
        category,
        folderId,
        folder: file ? getFolderPath(folder) : current.folder,
      }
    })
  }

  async function handleAdd() {
    if (!form.selectedFile && !form.url.trim()) {
      setError("Choose a file to upload or provide an external URL.")
      return
    }
    if (!form.name.trim()) {
      setError("File name is required.")
      return
    }
    setError(null)
    setIsUploading(true)
    setUploadProgress(form.selectedFile ? 1 : 0)

    startTransition(async () => {
      let uploadedUrl = form.url.trim()
      let uploadedMimeType = form.selectedFile?.type || undefined
      let uploadedSizeBytes = form.selectedFile?.size
      const finalCategory =
        !form.selectedFile && form.category === "OTHER" ? "LINK" : form.category
      const finalFolderId = form.folderId ?? getDefaultFolderId(finalCategory)
      const finalFolder = finalFolderId ? folderById.get(finalFolderId) : null
      const finalFolderPath = finalFolder
        ? finalFolder.path
        : getDisplayFolder(form.folder || getDefaultFolder(finalCategory))

      try {
        if (form.selectedFile) {
          const uploaded = await uploadToCloudinary({
            file: form.selectedFile,
            eventId,
            onProgress: setUploadProgress,
          })
          uploadedUrl = uploaded.secure_url
          uploadedSizeBytes = uploaded.bytes ?? form.selectedFile.size
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.")
        setIsUploading(false)
        return
      }

      const res = await addEventFile(eventId, {
        url: uploadedUrl,
        name: form.name.trim(),
        category: finalCategory,
        folderId: finalFolderId,
        folder: finalFolderPath,
        isImportant: form.isImportant,
        mimeType: uploadedMimeType,
        sizeBytes: uploadedSizeBytes,
        description: form.description.trim() || undefined,
      })
      if (res.success && res.data) {
        const added: FileSerialized = {
          id: (res.data as { id: string }).id,
          eventId,
          category: finalCategory,
          folderId: finalFolderId,
          folder: finalFolderPath,
          isImportant: form.isImportant,
          name: form.name.trim(),
          url: uploadedUrl,
          mimeType: uploadedMimeType ?? null,
          sizeBytes: uploadedSizeBytes ?? null,
          uploadedBy: uploaderEmail,
          taskId: null,
          vendorId: null,
          description: form.description.trim() || null,
          createdAt: new Date().toISOString(),
        }
        setFiles((prev) => [added, ...prev])
        setAddOpen(false)
        setUploadProgress(0)
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to add file.")
      }
      setIsUploading(false)
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

  function handleFolderOpen() {
    setNewFolderName("")
    setFolderError(null)
    setFolderOpen(true)
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) {
      setFolderError("Folder name is required.")
      return
    }
    if (name.includes("/")) {
      setFolderError("Folder name cannot contain /.")
      return
    }

    setFolderError(null)
    startTransition(async () => {
      const res = await createEventFileFolder(eventId, {
        name,
        parentId: currentFolderId,
      })

      if (res.success && res.data) {
        const created = res.data as {
          id: string
          eventId: string
          parentId: string | null
          name: string
          path: string
          createdAt: string
          updatedAt: string
        }
        setFolders((prev) => [...prev, created])
        setActiveView(folderViewId(created.id))
        setFolderOpen(false)
        setNewFolderName("")
        router.refresh()
      } else {
        setFolderError((res as { error?: string }).error ?? "Failed to create folder.")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Upload notice ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-[#c57a3a]/30 bg-[#c57a3a]/10 px-4 py-3">
        <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[#c57a3a]" />
        <p className="text-sm text-stone-700">
          Upload documents directly here. They are stored in Cloudinary and linked to this event.
        </p>
      </div>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleFolderOpen}
            className="gap-2 bg-white"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button
            onClick={handleAddOpen}
            className="gap-2 bg-[#c57a3a] text-white hover:bg-[#a8652f]"
          >
            <Plus className="h-4 w-4" />
            Add File
          </Button>
        </div>
      </div>

      {/* ── Folder browser ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Folders
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveView(ALL_VIEW)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                activeView === ALL_VIEW
                  ? "border-[#c57a3a] bg-white text-[#a8652f] shadow-sm"
                  : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-white"
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">All Resources</span>
              </span>
              <span className="text-xs text-stone-400">{files.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView(IMPORTANT_VIEW)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                activeView === IMPORTANT_VIEW
                  ? "border-[#c57a3a] bg-white text-[#a8652f] shadow-sm"
                  : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-white"
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Star className="h-4 w-4 shrink-0" />
                <span className="truncate">Important</span>
              </span>
              <span className="text-xs text-stone-400">{importantCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView(ROOT_VIEW)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                activeView === ROOT_VIEW
                  ? "border-[#c57a3a] bg-white text-[#a8652f] shadow-sm"
                  : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-white"
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">Folders</span>
              </span>
              <span className="text-xs text-stone-400">{folders.length}</span>
            </button>
            {folderTree.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveView(folderViewId(folder.id))}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border py-2 pr-3 text-sm transition-colors",
                  activeView === folderViewId(folder.id)
                    ? "border-[#c57a3a] bg-white text-[#a8652f] shadow-sm"
                    : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-white"
                )}
                style={{ paddingLeft: `${12 + folder.depth * 14}px` }}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {folder.name === "Important Links" ? (
                    <LinkIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <FolderOpen className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="text-xs text-stone-400">
                  {folderCounts[folder.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-stone-500">
                <button
                  type="button"
                  onClick={() => setActiveView(ROOT_VIEW)}
                  className="rounded px-1 py-0.5 hover:bg-white hover:text-stone-800"
                >
                  Folders
                </button>
                {breadcrumbs.map((folder) => (
                  <span key={folder.id} className="inline-flex min-w-0 items-center gap-1">
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setActiveView(folderViewId(folder.id))}
                      className="max-w-32 truncate rounded px-1 py-0.5 hover:bg-white hover:text-stone-800"
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </div>
              <h2 className="truncate text-lg font-semibold text-stone-900">
                {activeTitle}
              </h2>
              <p className="text-sm text-stone-500">
                {currentChildFolders.length + filtered.length} item
                {currentChildFolders.length + filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleFolderOpen}
              className="gap-2 bg-white"
            >
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
          </div>

          {currentChildFolders.length === 0 && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 py-16 text-center">
              <FolderOpen className="h-10 w-10 text-stone-300" />
              <p className="text-stone-400">
                {activeView === ALL_VIEW
                  ? "No files yet. Add one above."
                  : `No items in ${activeTitle}.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {currentChildFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveView(folderViewId(folder.id))}
                  className="rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7EDDB] text-[#c57a3a]">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-800">
                          {folder.name}
                        </p>
                        <p className="truncate text-xs text-stone-400">
                          {folder.path}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                  </div>
                </button>
              ))}
              {filtered.map((file) => (
                <Card
                  key={file.id}
                  className="group border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
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
                          <p className="flex items-center gap-1 truncate text-xs text-stone-400">
                            <FolderOpen className="h-3 w-3 shrink-0" />
                            {getDisplayFolder(file.folder)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
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

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          CATEGORY_BADGE_COLORS[file.category]
                        )}
                      >
                        {CATEGORY_LABELS[file.category]}
                      </Badge>
                      {file.isImportant && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-800"
                        >
                          <Star className="h-3 w-3" />
                          Important
                        </Badge>
                      )}
                      {file.sizeBytes ? (
                        <span className="text-xs text-stone-400">
                          {formatBytes(file.sizeBytes)}
                        </span>
                      ) : null}
                    </div>

                    {file.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                        {file.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-xs text-stone-400">
                      <span className="truncate pr-2">{file.uploadedBy}</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Add File dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && (isUploading || isPending)) return
          setAddOpen(open)
        }}
      >
        <DialogContent className="bg-[#F7EDDB] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">
              Upload File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="file-upload">File</Label>
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white px-4 py-6 text-center transition-colors hover:border-[#c57a3a]/60 hover:bg-[#c57a3a]/5"
              >
                <UploadCloud className="mb-2 h-8 w-8 text-[#c57a3a]" />
                <span className="text-sm font-semibold text-stone-800">
                  {form.selectedFile ? form.selectedFile.name : "Choose a file"}
                </span>
                <span className="mt-1 text-xs text-stone-500">
                  PDF, images, spreadsheets, docs, and vendor files
                </span>
                {form.selectedFile && (
                  <span className="mt-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {formatBytes(form.selectedFile.size)}
                  </span>
                )}
              </label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                disabled={isUploading || isPending}
              />
              {isUploading && (
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-[#c57a3a] transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file-url">External URL fallback</Label>
              <div className="relative">
                <LinkIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  id="file-url"
                  placeholder="Optional: paste a URL instead of uploading"
                  value={form.url}
                  onChange={(e) => {
                    const url = e.target.value
                    setForm((p) => {
                      if (!p.selectedFile && url.trim() && p.category === "OTHER") {
                        const folderId = getDefaultFolderId("LINK")
                        const folder = folderId ? folderById.get(folderId) : null
                        return {
                          ...p,
                          url,
                          category: "LINK",
                          folderId,
                          folder: getFolderPath(folder),
                          isImportant: true,
                        }
                      }
                      return { ...p, url }
                    })
                  }}
                  className="bg-white pl-9"
                  disabled={isUploading || isPending}
                />
              </div>
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
                disabled={isUploading || isPending}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="file-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => {
                    const category = v as EventFileCategory
                    const folderId = getDefaultFolderId(category)
                    const folder = folderId ? folderById.get(folderId) : null
                    setForm((p) => ({
                      ...p,
                      category,
                      folderId,
                      folder: getFolderPath(folder),
                      isImportant: category === "LINK" ? true : p.isImportant,
                    }))
                  }}
                  disabled={isUploading || isPending}
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
                <Label htmlFor="file-folder">Folder</Label>
                <Select
                  value={form.folderId ?? ROOT_FOLDER_VALUE}
                  onValueChange={(value) => {
                    if (value === ROOT_FOLDER_VALUE) {
                      setForm((p) => ({ ...p, folderId: null, folder: "Resources" }))
                      return
                    }
                    const folder = folderById.get(value)
                    setForm((p) => ({
                      ...p,
                      folderId: value,
                      folder: getFolderPath(folder),
                    }))
                  }}
                  disabled={isUploading || isPending}
                >
                  <SelectTrigger id="file-folder" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_FOLDER_VALUE}>Root</SelectItem>
                    {folderTree.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {"  ".repeat(folder.depth)}
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label
              htmlFor="file-important"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3"
            >
              <Checkbox
                id="file-important"
                checked={form.isImportant}
                onCheckedChange={(checked) =>
                  setForm((p) => {
                    const folderId =
                      checked === true && p.category === "LINK"
                        ? getDefaultFolderId("LINK")
                        : p.folderId
                    const folder = folderId ? folderById.get(folderId) : null
                    return {
                      ...p,
                      isImportant: checked === true,
                      folderId,
                      folder:
                        checked === true && p.category === "LINK"
                          ? getFolderPath(folder)
                          : p.folder,
                    }
                  })
                }
                disabled={isUploading || isPending}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-stone-800">
                  Mark as important
                </span>
                <span className="block text-xs text-stone-500">
                  Shows this resource in the Important folder for fast access.
                </span>
              </span>
            </label>

            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
              Saving to{" "}
              <span className="font-medium text-stone-700">{form.folder}</span>
              {form.isImportant ? " and Important" : ""}.
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
                disabled={isUploading || isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isPending || isUploading}
              className="bg-[#c57a3a] text-white hover:bg-[#a8652f]"
            >
              {isPending || isUploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </span>
              ) : (
                "Upload File"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create folder dialog ───────────────────────────────────────────── */}
      <Dialog
        open={folderOpen}
        onOpenChange={(open) => {
          if (!open && isPending) return
          setFolderOpen(open)
        }}
      >
        <DialogContent className="bg-[#F7EDDB] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-stone-900">
              New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {folderError && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {folderError}
              </p>
            )}
            <p className="text-sm text-stone-600">
              Create inside{" "}
              <span className="font-medium text-stone-800">
                {currentFolder?.path ?? "Folders"}
              </span>
              .
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. VIP guests"
                className="bg-white"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFolderOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={isPending}
              className="bg-[#c57a3a] text-white hover:bg-[#a8652f]"
            >
              {isPending ? "Creating..." : "Create Folder"}
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
