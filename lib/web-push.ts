import "server-only"

import webpush from "web-push"

import { getPrismaClient } from "@/lib/prisma"

type PushPayload = {
  notificationId: string
  title: string
  body?: string | null
  link?: string | null
  type?: string | null
}

type PushDeliveryResult = {
  status: "SENT" | "PARTIAL" | "FAILED" | "SKIPPED"
  sent: number
  failed: number
  error?: string
}

function clean(value: string | undefined) {
  return value?.trim() || ""
}

export function getWebPushPublicKey() {
  return clean(process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY)
}

function getWebPushPrivateKey() {
  return clean(process.env.WEB_PUSH_PRIVATE_KEY)
}

function getWebPushSubject() {
  return clean(process.env.WEB_PUSH_SUBJECT) || (process.env.ADMIN_EMAIL ? `mailto:${process.env.ADMIN_EMAIL}` : "")
}

export function getWebPushSetupIssue() {
  const publicKey = getWebPushPublicKey()
  const privateKey = getWebPushPrivateKey()
  const subject = getWebPushSubject()

  if (!publicKey || !privateKey || !subject) {
    return "Missing WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, or WEB_PUSH_SUBJECT."
  }

  return null
}

function configureWebPush() {
  const issue = getWebPushSetupIssue()
  if (issue) throw new Error(issue)

  webpush.setVapidDetails(
    getWebPushSubject(),
    getWebPushPublicKey(),
    getWebPushPrivateKey(),
  )
}

function isGone(error: unknown) {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: number }).statusCode)
    : null

  return statusCode === 404 || statusCode === 410
}

export async function sendPushNotificationForNotification(input: {
  recipientEmail?: string | null
  payload: PushPayload
}): Promise<PushDeliveryResult> {
  const setupIssue = getWebPushSetupIssue()
  if (setupIssue) {
    return { status: "SKIPPED", sent: 0, failed: 0, error: setupIssue }
  }

  configureWebPush()

  const prisma = getPrismaClient()
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      isActive: true,
      ...(input.recipientEmail ? { userEmail: input.recipientEmail } : {}),
    },
  })

  if (subscriptions.length === 0) {
    return { status: "SKIPPED", sent: 0, failed: 0, error: "No active push subscriptions." }
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []
  const body = JSON.stringify({
    title: input.payload.title,
    body: input.payload.body,
    link: input.payload.link || "/admin/notifications",
    notificationId: input.payload.notificationId,
    type: input.payload.type,
  })

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
        )
        sent++
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: {
            lastSeenAt: new Date(),
            failedAt: null,
            failureReason: null,
          },
        })
      } catch (error) {
        failed++
        const message = error instanceof Error ? error.message : "Push delivery failed."
        errors.push(message)
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: {
            isActive: isGone(error) ? false : subscription.isActive,
            failedAt: new Date(),
            failureReason: message.slice(0, 500),
          },
        })
      }
    }),
  )

  if (sent > 0 && failed === 0) {
    return { status: "SENT", sent, failed }
  }

  if (sent > 0) {
    return { status: "PARTIAL", sent, failed, error: errors[0] }
  }

  return { status: "FAILED", sent, failed, error: errors[0] ?? "Push delivery failed." }
}
