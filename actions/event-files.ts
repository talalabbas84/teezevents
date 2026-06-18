"use server"

import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated } from "@/lib/admin-auth"
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
  "OTHER",
])

const AddFileSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  name: z.string().min(1, "Name is required"),
  category: FileCategoryEnum.optional().default("OTHER"),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  uploadedBy: z.string().optional(),
})

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
      | "OTHER"
    mimeType?: string
    description?: string
    uploadedBy?: string
  }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const parsed = AddFileSchema.parse(data)
    const prisma = getPrismaClient()

    const file = await prisma.eventFile.create({
      data: {
        eventId,
        url: parsed.url,
        name: parsed.name,
        category: parsed.category as never,
        mimeType: parsed.mimeType ?? null,
        description: parsed.description ?? null,
        uploadedBy: parsed.uploadedBy ?? "admin",
      },
    })

    revalidatePath(`/admin/planning/${eventId}/files`)
    return { success: true, data: file }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function deleteEventFile(fileId: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

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

    await prisma.eventFile.delete({ where: { id: fileId } })

    revalidatePath(`/admin/planning/${existing.eventId}/files`)
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}
