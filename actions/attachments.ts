"use server"

import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated, requireAdminSession } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

// ─── Task Attachments ─────────────────────────────────────────────────────────

export async function addTaskAttachment(
  taskId: string,
  file: { url: string; name: string; mimeType?: string; sizeBytes?: number }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    const session = await requireAdminSession()
    const prisma = getPrismaClient()

    const task = await prisma.planningTask.findUnique({
      where: { id: taskId },
      select: { eventId: true },
    })
    if (!task) return { success: false as const, error: "Task not found." }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        url: file.url,
        name: file.name,
        mimeType: file.mimeType ?? null,
        sizeBytes: file.sizeBytes ?? null,
        uploadedBy: session.email,
      },
    })

    revalidatePath(`/admin/planning/${task.eventId}/tasks`)
    revalidatePath(`/admin/planning/${task.eventId}`)

    return {
      success: true as const,
      data: {
        id: attachment.id,
        taskId: attachment.taskId,
        url: attachment.url,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt.toISOString(),
      },
    }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

export async function removeTaskAttachment(attachmentId: string, taskId: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    const prisma = getPrismaClient()

    const task = await prisma.planningTask.findUnique({
      where: { id: taskId },
      select: { eventId: true },
    })

    await prisma.taskAttachment.delete({ where: { id: attachmentId } })

    if (task) {
      revalidatePath(`/admin/planning/${task.eventId}/tasks`)
      revalidatePath(`/admin/planning/${task.eventId}`)
    }

    return { success: true as const }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

export async function getTaskAttachmentsAction(taskId: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, data: [], error: "Not authorized." }
    }
    const prisma = getPrismaClient()
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    })
    return {
      success: true as const,
      data: attachments.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        url: a.url,
        name: a.name,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt.toISOString(),
      })),
    }
  } catch (e: unknown) {
    return {
      success: false as const,
      data: [],
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

// ─── Comment Attachments ──────────────────────────────────────────────────────

export async function addCommentAttachment(
  commentId: string,
  eventId: string,
  file: { url: string; name: string; mimeType?: string; sizeBytes?: number }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    const session = await requireAdminSession()
    const prisma = getPrismaClient()

    const comment = await prisma.eventComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    })
    if (!comment) return { success: false as const, error: "Comment not found." }

    const attachment = await prisma.commentAttachment.create({
      data: {
        commentId,
        url: file.url,
        name: file.name,
        mimeType: file.mimeType ?? null,
        sizeBytes: file.sizeBytes ?? null,
        uploadedBy: session.email,
      },
    })

    revalidatePath(`/admin/planning/${eventId}/collaboration`)

    return {
      success: true as const,
      data: {
        id: attachment.id,
        commentId: attachment.commentId,
        url: attachment.url,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt.toISOString(),
      },
    }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

export async function removeCommentAttachment(
  attachmentId: string,
  commentId: string,
  eventId: string
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    await prisma_delete(attachmentId)
    revalidatePath(`/admin/planning/${eventId}/collaboration`)
    return { success: true as const }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

async function prisma_delete(attachmentId: string) {
  const prisma = getPrismaClient()
  await prisma.commentAttachment.delete({ where: { id: attachmentId } })
}

// ─── Checklist Item Attachments (stored as EventFile) ─────────────────────────

export async function addChecklistItemAttachment(
  eventId: string,
  itemId: string,
  uploaderEmail: string,
  file: { url: string; name: string; mimeType: string; sizeBytes: number }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    const prisma = getPrismaClient()
    const created = await prisma.eventFile.create({
      data: {
        eventId,
        url: file.url,
        name: file.name,
        category: "OTHER",
        folder: "Checklist Attachments",
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedBy: uploaderEmail,
        description: `checklist-item:${itemId}`,
      },
    })

    revalidatePath(`/admin/planning/${eventId}/checklists`)
    revalidatePath(`/admin/planning/${eventId}`)

    return {
      success: true as const,
      data: {
        id: created.id,
        url: created.url,
        name: created.name,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      },
    }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}

export async function removeChecklistItemAttachmentAction(
  fileId: string,
  eventId: string
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false as const, error: "Not authorized." }
    }
    const prisma = getPrismaClient()
    await prisma.eventFile.delete({ where: { id: fileId } })
    revalidatePath(`/admin/planning/${eventId}/checklists`)
    revalidatePath(`/admin/planning/${eventId}`)
    return { success: true as const }
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }
  }
}
