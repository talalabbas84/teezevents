import "server-only"

import { getPrismaClient } from "@/lib/prisma"
import { publishRealtimeEvent } from "@/lib/realtime"
import {
  getEmailServiceSetupIssue,
  sendEmail as sendSystemEmail,
} from "@/lib/email-service"
import { sendPushNotificationForNotification } from "@/lib/web-push"

export type NotificationSummary = {
  id: string
  type: string
  recipientEmail: string | null
  title: string
  body: string | null
  link: string | null
  actorEmail: string | null
  emailStatus: string
  emailSentAt: string | null
  emailError: string | null
  pushStatus: string
  pushSentAt: string | null
  pushError: string | null
  dedupeKey: string | null
  isRead: boolean
  readAt: string | null
  eventId: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

const notificationSummarySelect = {
  id: true,
  type: true,
  recipientEmail: true,
  title: true,
  body: true,
  link: true,
  actorEmail: true,
  emailStatus: true,
  emailSentAt: true,
  emailError: true,
  pushStatus: true,
  pushSentAt: true,
  pushError: true,
  dedupeKey: true,
  isRead: true,
  readAt: true,
  eventId: true,
  entityType: true,
  entityId: true,
  createdAt: true,
} as const

function serializeNotification(row: {
  id: string
  type: string
  recipientEmail: string | null
  title: string
  body: string | null
  link: string | null
  actorEmail: string | null
  emailStatus: string
  emailSentAt: Date | null
  emailError: string | null
  pushStatus: string
  pushSentAt: Date | null
  pushError: string | null
  dedupeKey: string | null
  isRead: boolean
  readAt: Date | null
  eventId: string | null
  entityType: string | null
  entityId: string | null
  createdAt: Date
}): NotificationSummary {
  return {
    id: row.id,
    type: row.type,
    recipientEmail: row.recipientEmail,
    title: row.title,
    body: row.body,
    link: row.link,
    actorEmail: row.actorEmail,
    emailStatus: row.emailStatus,
    emailSentAt: row.emailSentAt ? row.emailSentAt.toISOString() : null,
    emailError: row.emailError,
    pushStatus: row.pushStatus,
    pushSentAt: row.pushSentAt ? row.pushSentAt.toISOString() : null,
    pushError: row.pushError,
    dedupeKey: row.dedupeKey,
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    eventId: row.eventId,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt.toISOString(),
  }
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
    select: notificationSummarySelect,
  })

  return rows.map(serializeNotification)
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

function toAbsoluteUrl(link?: string | null) {
  if (!link) return null
  if (/^https?:\/\//i.test(link)) return link

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()

  if (!baseUrl) return null
  const normalizedBase = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
  return new URL(link, normalizedBase).toString()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function buildNotificationEmail(input: {
  title: string
  body?: string | null
  link?: string | null
}) {
  const absoluteLink = toAbsoluteUrl(input.link)
  const escapedTitle = escapeHtml(input.title)
  const escapedBody = input.body ? escapeHtml(input.body) : ""
  const html = `
    <div style="font-family: Arial, sans-serif; color: #2f261f; line-height: 1.5;">
      <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a6a3d;">TEEZ Admin</p>
      <h1 style="margin: 0 0 12px; font-size: 22px;">${escapedTitle}</h1>
      ${escapedBody ? `<p style="margin: 0 0 20px; font-size: 15px;">${escapedBody}</p>` : ""}
      ${
        absoluteLink
          ? `<p style="margin: 0;"><a href="${absoluteLink}" style="display: inline-block; border-radius: 8px; background: #c57a3a; color: #ffffff; padding: 10px 14px; text-decoration: none; font-weight: 700;">Open in TEEZ</a></p>`
          : ""
      }
    </div>
  `
  const text = [input.title, input.body, absoluteLink ? `Open: ${absoluteLink}` : null]
    .filter(Boolean)
    .join("\n\n")

  return { html, text }
}

function emitNotificationRealtime(data: {
  eventId?: string | null
  entityType?: string | null
  entityId?: string | null
  actorEmail?: string | null
  recipientEmail?: string | null
  title?: string | null
  body?: string | null
  link?: string | null
  action: string
}) {
  publishRealtimeEvent({
    type: "notification:update",
    eventId: data.eventId,
    entityType: data.entityType ?? "Notification",
    entityId: data.entityId,
    action: data.action,
    actorEmail: data.actorEmail,
    recipientEmail: data.recipientEmail,
    title: data.title,
    body: data.body,
    link: data.link,
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
  dedupeKey?: string
  sendEmail?: boolean
  sendPush?: boolean
  emailSubject?: string
}): Promise<NotificationSummary | null> {
  const prisma = getPrismaClient()

  if (data.dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupeKey: data.dedupeKey },
      select: { id: true },
    })
    if (existing) return null
  }

  const shouldAttemptEmail = Boolean(data.sendEmail && data.recipientEmail)
  const shouldAttemptPush = data.sendPush !== false
  const notification = await prisma.notification.create({
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
      dedupeKey: data.dedupeKey ?? null,
      emailStatus: shouldAttemptEmail ? "NOT_REQUESTED" : "SKIPPED",
      pushStatus: shouldAttemptPush ? "NOT_REQUESTED" : "SKIPPED",
    },
  })

  emitNotificationRealtime({
    eventId: notification.eventId,
    entityType: notification.entityType,
    entityId: notification.id,
    actorEmail: notification.actorEmail,
    recipientEmail: notification.recipientEmail,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    action: "NOTIFICATION_CREATED",
  })

  if (shouldAttemptEmail && data.recipientEmail) {
    const setupIssue = getEmailServiceSetupIssue()
    if (setupIssue) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailStatus: "SKIPPED",
          emailError: setupIssue,
        },
      })
    } else {
      try {
        const email = buildNotificationEmail({
          title: data.title,
          body: data.body,
          link: data.link,
        })
        await sendSystemEmail({
          to: data.recipientEmail,
          subject: data.emailSubject ?? data.title,
          html: email.html,
          text: email.text,
        })
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            emailStatus: "SENT",
            emailSentAt: new Date(),
            emailError: null,
          },
        })
      } catch (error) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            emailStatus: "FAILED",
            emailError: error instanceof Error ? error.message : "Email delivery failed.",
          },
        })
      }
    }
  }

  if (shouldAttemptPush) {
    const result = await sendPushNotificationForNotification({
      recipientEmail: notification.recipientEmail,
      payload: {
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        type: notification.type,
      },
    })

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        pushStatus: result.status,
        pushSentAt: result.sent > 0 ? new Date() : null,
        pushError: result.error ?? null,
      },
    })
  }

  const summary = await prisma.notification.findUnique({
    where: { id: notification.id },
    select: notificationSummarySelect,
  })
  return summary ? serializeNotification(summary) : null
}
