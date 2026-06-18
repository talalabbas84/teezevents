"use server"

import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const NoteBodySchema = z.object({
  body: z.string().min(1, "Note body cannot be empty"),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createEventNote(eventId: string, body: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const parsed = NoteBodySchema.parse({ body })
    const prisma = getPrismaClient()

    const note = await prisma.eventNote.create({
      data: {
        eventId,
        body: parsed.body,
        authorEmail: "admin",
      },
    })

    revalidatePath(`/admin/planning/${eventId}/notes`)
    return { success: true, data: note }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function deleteEventNote(noteId: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    if (!noteId || typeof noteId !== "string") {
      return { success: false, error: "Invalid note ID." }
    }

    const prisma = getPrismaClient()

    const existing = await prisma.eventNote.findUnique({
      where: { id: noteId },
      select: { eventId: true },
    })

    if (!existing) {
      return { success: false, error: "Note not found." }
    }

    await prisma.eventNote.delete({ where: { id: noteId } })

    revalidatePath(`/admin/planning/${existing.eventId}/notes`)
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function toggleNotePin(noteId: string, isPinned: boolean) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    if (!noteId || typeof noteId !== "string") {
      return { success: false, error: "Invalid note ID." }
    }

    const prisma = getPrismaClient()

    const existing = await prisma.eventNote.findUnique({
      where: { id: noteId },
      select: { eventId: true },
    })

    if (!existing) {
      return { success: false, error: "Note not found." }
    }

    const updated = await prisma.eventNote.update({
      where: { id: noteId },
      data: { isPinned },
    })

    revalidatePath(`/admin/planning/${existing.eventId}/notes`)
    return { success: true, data: updated }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}
