"use server"

import { getPrismaClient } from "@/lib/prisma"
import { requireEventAccess } from "@/lib/team-access"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const FileCategoryEnum = z.enum([
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
])

const AddFileSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  name: z.string().min(1, "Name is required"),
  category: FileCategoryEnum.optional().default("OTHER"),
  folderId: z.string().optional().nullable(),
  folder: z.string().trim().min(1, "Folder is required").max(80, "Folder is too long").optional(),
  isImportant: z.boolean().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  uploadedBy: z.string().optional(),
})

const CreateFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Folder name is required")
    .max(80, "Folder name is too long")
    .refine((value) => !value.includes("/"), "Folder name cannot contain /."),
  parentId: z.string().optional().nullable(),
})

function emitFileRealtime(eventId: string, action: string, entityId?: string, entityType = "EventFile") {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType,
    entityId,
  })
}

function buildFolderPath(parentPath: string | null | undefined, name: string) {
  return parentPath ? `${parentPath}/${name}` : name
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function addEventFile(
  eventId: string,
  data: {
    url: string
    name: string
    category?:
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
    folder?: string
    isImportant?: boolean
    mimeType?: string
    sizeBytes?: number
    description?: string
    uploadedBy?: string
    folderId?: string | null
  }
) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")

    const parsed = AddFileSchema.parse(data)
    const prisma = getPrismaClient()
    const folder = parsed.folderId
      ? await prisma.eventFileFolder.findFirst({
          where: { id: parsed.folderId, eventId },
          select: { id: true, path: true },
        })
      : null

    if (parsed.folderId && !folder) {
      return { success: false, error: "Folder not found." }
    }

    const file = await prisma.eventFile.create({
      data: {
        eventId,
        url: parsed.url,
        name: parsed.name,
        category: parsed.category as never,
        folderId: folder?.id ?? null,
        folder: folder?.path ?? parsed.folder ?? "Resources",
        isImportant: parsed.isImportant ?? false,
        mimeType: parsed.mimeType ?? null,
        sizeBytes: parsed.sizeBytes ?? null,
        description: parsed.description ?? null,
        uploadedBy: parsed.uploadedBy ?? session.email,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "UPLOADED_EVENT_FILE",
        entityType: "EventFile",
        entityId: file.id,
        entityName: file.name,
      },
    })

    await prisma.notification.create({
      data: {
        eventId,
        type: "FILE_UPLOADED",
        title: "New event resource added",
        body: file.name,
        link: `/admin/planning/${eventId}/files`,
        actorEmail: session.email,
        entityType: "EventFile",
        entityId: file.id,
      },
    })

    revalidatePath(`/admin/planning/${eventId}/files`)
    revalidatePath(`/admin/planning/${eventId}/collaboration`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    emitFileRealtime(eventId, "FILE_UPLOADED", file.id)
    return { success: true, data: { ...file, createdAt: file.createdAt.toISOString() } }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function createEventFileFolder(
  eventId: string,
  data: {
    name: string
    parentId?: string | null
  }
) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const parsed = CreateFolderSchema.parse(data)
    const prisma = getPrismaClient()

    const parent = parsed.parentId
      ? await prisma.eventFileFolder.findFirst({
          where: { id: parsed.parentId, eventId },
          select: { id: true, path: true },
        })
      : null

    if (parsed.parentId && !parent) {
      return { success: false, error: "Parent folder not found." }
    }

    const path = buildFolderPath(parent?.path, parsed.name)
    const existing = await prisma.eventFileFolder.findUnique({
      where: { eventId_path: { eventId, path } },
      select: { id: true },
    })

    if (existing) {
      return { success: false, error: "A folder with this name already exists here." }
    }

    const folder = await prisma.eventFileFolder.create({
      data: {
        eventId,
        parentId: parent?.id ?? null,
        name: parsed.name,
        path,
        createdBy: session.email,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "CREATED_EVENT_FILE_FOLDER",
        entityType: "EventFileFolder",
        entityId: folder.id,
        entityName: folder.name,
      },
    })

    revalidatePath(`/admin/planning/${eventId}/files`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    emitFileRealtime(eventId, "FOLDER_CREATED", folder.id, "EventFileFolder")
    return { success: true, data: { ...folder, createdAt: folder.createdAt.toISOString(), updatedAt: folder.updatedAt.toISOString() } }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function deleteEventFile(fileId: string) {
  try {
    if (!fileId || typeof fileId !== "string") {
      return { success: false, error: "Invalid file ID." }
    }

    const prisma = getPrismaClient()

    const existing = await prisma.eventFile.findUnique({
      where: { id: fileId },
      select: { eventId: true },
    })

    if (!existing) {
      return { success: false, error: "File not found." }
    }

    const session = await requireEventAccess(existing.eventId, "EDIT")
    await prisma.eventFile.delete({ where: { id: fileId } })
    await prisma.planningActivityLog.create({
      data: {
        eventId: existing.eventId,
        actorEmail: session.email,
        action: "DELETED_EVENT_FILE",
        entityType: "EventFile",
        entityId: fileId,
      },
    })

    revalidatePath(`/admin/planning/${existing.eventId}/files`)
    revalidatePath(`/admin/planning/${existing.eventId}/collaboration`)
    revalidatePath(`/admin/planning/${existing.eventId}/dashboard`)
    emitFileRealtime(existing.eventId, "FILE_DELETED", fileId)
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}
