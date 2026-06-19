"use server"

import { z } from "zod"
import { getPrismaClient } from "@/lib/prisma"
import { canManageEvent, requireEventAccess } from "@/lib/team-access"
import { createNotification } from "@/lib/notifications"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"

function extractMentions(body: string) {
  const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  const mentions = new Set<string>()
  let match

  while ((match = mentionRegex.exec(body)) !== null) {
    mentions.add(match[1].toLowerCase())
  }

  return Array.from(mentions)
}

function revalidateCollaboration(eventId: string) {
  revalidatePath(`/admin/planning/${eventId}/collaboration`)
  revalidatePath(`/admin/planning/${eventId}/dashboard`)
  revalidatePath("/admin/notifications")
}

function emitCollaborationRealtime(eventId: string, action: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType: "EventComment",
    entityId,
  })
}

export async function createEventComment(data: {
  eventId: string
  body: string
  entityType?: string
  entityId?: string
  parentId?: string
}) {
  try {
    const session = await requireEventAccess(data.eventId, "COMMENT")
    z.object({
      eventId: z.string().min(1),
      body: z.string().min(1).max(5000),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      parentId: z.string().optional(),
    }).parse(data)

    const mentions = extractMentions(data.body)
    const prisma = getPrismaClient()
    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.eventComment.create({
        data: {
          eventId: data.eventId,
          authorEmail: session.email,
          authorName: session.name,
          body: data.body,
          entityType: data.entityType,
          entityId: data.entityId,
          parentId: data.parentId,
          mentions,
        },
        include: {
          replies: {
            include: { replies: false },
            orderBy: { createdAt: "asc" },
          },
        },
      })

      await tx.planningActivityLog.create({
        data: {
          eventId: data.eventId,
          actorEmail: session.email,
          action: data.parentId ? "REPLIED_TO_COMMENT" : "CREATED_EVENT_COMMENT",
          entityType: "EventComment",
          entityId: created.id,
          entityName: created.body.slice(0, 80),
          details: {
            mentions,
            attachedTo: data.entityType ? `${data.entityType}:${data.entityId ?? ""}` : null,
          },
        },
      })

      return created
    })

    await Promise.all(
      mentions
        .filter((email) => email !== session.email)
        .map((recipientEmail) =>
          createNotification({
            eventId: data.eventId,
            recipientEmail,
            type: "COMMENT_MENTION",
            title: "You were mentioned in a comment",
            body: comment.body,
            link: `/admin/planning/${data.eventId}/collaboration`,
            actorEmail: session.email,
            entityType: "EventComment",
            entityId: comment.id,
            dedupeKey: `comment-mention:${comment.id}:${recipientEmail}`,
            sendEmail: true,
          })
        )
    )

    revalidateCollaboration(data.eventId)
    emitCollaborationRealtime(data.eventId, data.parentId ? "COMMENT_REPLIED" : "COMMENT_CREATED", comment.id)
    return { success: true, data: comment }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateEventComment(commentId: string, body: string) {
  try {
    if (!body.trim()) return { success: false, error: "Comment cannot be empty." }

    const prisma = getPrismaClient()
    const comment = await prisma.eventComment.findUnique({ where: { id: commentId } })
    if (!comment) return { success: false, error: "Comment not found." }
    const session = await requireEventAccess(comment.eventId, "COMMENT")
    if (comment.authorEmail !== session.email && !canManageEvent(session.role)) {
      return { success: false, error: "Can only edit your own comments." }
    }

    const updated = await prisma.eventComment.update({
      where: { id: commentId },
      data: { body: body.trim(), mentions: extractMentions(body), isEdited: true },
    })

    revalidateCollaboration(comment.eventId)
    emitCollaborationRealtime(comment.eventId, "COMMENT_UPDATED", updated.id)
    return { success: true, data: updated }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteEventComment(commentId: string) {
  try {
    const prisma = getPrismaClient()
    const comment = await prisma.eventComment.findUnique({ where: { id: commentId } })
    if (!comment) return { success: false, error: "Comment not found." }
    const session = await requireEventAccess(comment.eventId, "COMMENT")
    if (comment.authorEmail !== session.email && !canManageEvent(session.role)) {
      return { success: false, error: "Can only delete your own comments." }
    }

    await prisma.eventComment.delete({ where: { id: commentId } })
    revalidateCollaboration(comment.eventId)
    emitCollaborationRealtime(comment.eventId, "COMMENT_DELETED", commentId)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function togglePinComment(commentId: string, isPinned: boolean) {
  try {
    const prisma = getPrismaClient()
    const comment = await prisma.eventComment.findUnique({ where: { id: commentId }, select: { eventId: true } })
    if (!comment) return { success: false, error: "Not found." }
    await requireEventAccess(comment.eventId, "MANAGE")
    await prisma.eventComment.update({ where: { id: commentId }, data: { isPinned } })
    revalidateCollaboration(comment.eventId)
    emitCollaborationRealtime(comment.eventId, isPinned ? "COMMENT_PINNED" : "COMMENT_UNPINNED", commentId)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function getEventCommentsAction(eventId: string, entityType?: string, entityId?: string) {
  try {
    await requireEventAccess(eventId, "VIEW")
    const prisma = getPrismaClient()
    const comments = await prisma.eventComment.findMany({
      where: {
        eventId,
        entityType: entityType || null,
        entityId: entityId || null,
        parentId: null, // only top-level
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
      take: 50,
    })

    const serialized = comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      replies: c.replies.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        replies: [],
      })),
    }))

    return { success: true as const, data: serialized }
  } catch (e: unknown) {
    return { success: false as const, data: [], error: e instanceof Error ? e.message : "Unknown error" }
  }
}
