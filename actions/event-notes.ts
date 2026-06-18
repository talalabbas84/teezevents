"use server"

import { getPrismaClient } from "@/lib/prisma"
import { requireEventAccess } from "@/lib/team-access"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const NoteBodySchema = z.object({
  body: z.string().min(1, "Note body cannot be empty"),
})

function emitNoteRealtime(eventId: string, action: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType: "EventNote",
    entityId,
  })
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createEventNote(eventId: string, body: string) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")

    const parsed = NoteBodySchema.parse({ body })
    const prisma = getPrismaClient()

    const note = await prisma.eventNote.create({
      data: {
        eventId,
        body: parsed.body,
        authorEmail: session.email,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "CREATED_EVENT_NOTE",
        entityType: "EventNote",
        entityId: note.id,
        entityName: note.body.slice(0, 80),
      },
    })

    revalidatePath(`/admin/planning/${eventId}/notes`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    emitNoteRealtime(eventId, "NOTE_CREATED", note.id)
    return {
      success: true,
      data: {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function deleteEventNote(noteId: string) {
  try {
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

    const session = await requireEventAccess(existing.eventId, "EDIT")
    await prisma.eventNote.delete({ where: { id: noteId } })
    await prisma.planningActivityLog.create({
      data: {
        eventId: existing.eventId,
        actorEmail: session.email,
        action: "DELETED_EVENT_NOTE",
        entityType: "EventNote",
        entityId: noteId,
      },
    })

    revalidatePath(`/admin/planning/${existing.eventId}/notes`)
    revalidatePath(`/admin/planning/${existing.eventId}/dashboard`)
    emitNoteRealtime(existing.eventId, "NOTE_DELETED", noteId)
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function toggleNotePin(noteId: string, isPinned: boolean) {
  try {
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

    await requireEventAccess(existing.eventId, "EDIT")
    const updated = await prisma.eventNote.update({
      where: { id: noteId },
      data: { isPinned },
    })

    revalidatePath(`/admin/planning/${existing.eventId}/notes`)
    emitNoteRealtime(existing.eventId, isPinned ? "NOTE_PINNED" : "NOTE_UNPINNED", noteId)
    return {
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: message }
  }
}
