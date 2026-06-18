import "server-only"

import { getPrismaClient } from "@/lib/prisma"

export type NotificationSummary = {
  id: string
  type: string
  recipientEmail: string | null
  title: string
  body: string | null
  link: string | null
  actorEmail: string | null
  isRead: boolean
  readAt: string | null
  eventId: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

/**
 * Returns unread + recent read notifications, ordered by createdAt desc.
 * Default limit: 50.
 */
export async function getNotifications(
  limit: number = 50,
  recipientEmail?: string,
): Promise<NotificationSummary[]> {
  const prisma = getPrismaClient()

  const rows = await prisma.notification.findMany({
    where: recipientEmail
      ? {
          OR: [{ recipientEmail: null }, { recipientEmail }],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      recipientEmail: true,
      title: true,
      body: true,
      link: true,
      actorEmail: true,
      isRead: true,
      readAt: true,
      eventId: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  })

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    recipientEmail: row.recipientEmail,
    title: row.title,
    body: row.body,
    link: row.link,
    actorEmail: row.actorEmail,
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    eventId: row.eventId,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * Fast count of unread notifications.
 */
export async function getUnreadCount(recipientEmail?: string): Promise<number> {
  const prisma = getPrismaClient()

  return prisma.notification.count({
    where: recipientEmail
      ? {
          isRead: false,
          OR: [{ recipientEmail: null }, { recipientEmail }],
        }
      : { isRead: false },
  })
}

/**
 * Creates a Notification record.
 * No auth check — intended to be called from server actions internally.
 */
export async function createNotification(data: {
  type: string
  title: string
  body?: string
  link?: string
  actorEmail?: string
  recipientEmail?: string
  eventId?: string
  entityType?: string
  entityId?: string
}): Promise<void> {
  const prisma = getPrismaClient()

  await prisma.notification.create({
    data: {
      type: data.type as never,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
      actorEmail: data.actorEmail ?? null,
      recipientEmail: data.recipientEmail ?? null,
      eventId: data.eventId ?? null,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
    },
  })
}
