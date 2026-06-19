"use server"

import { getCurrentTeamContext } from "@/lib/team-access"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"

function notificationScope(email: string, isSuperAdmin: boolean) {
  return isSuperAdmin ? {} : { OR: [{ recipientEmail: null }, { recipientEmail: email }] }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentTeamContext()
    const prisma = getPrismaClient()

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        ...notificationScope(currentUser.email, currentUser.role === "SUPER_ADMIN"),
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/admin/notifications")
    publishRealtimeEvent({
      type: "notification:update",
      action: "NOTIFICATION_READ",
      entityType: "Notification",
      entityId: notificationId,
      recipientEmail: currentUser.role === "SUPER_ADMIN" ? null : currentUser.email,
    })

    return { success: true }
  } catch (error) {
    console.error("[markNotificationRead]", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to mark notification as read",
    }
  }
}

/**
 * Marks all unread notifications as read in a single updateMany.
 */
export async function markAllNotificationsRead(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const currentUser = await getCurrentTeamContext()
    const prisma = getPrismaClient()

    await prisma.notification.updateMany({
      where: {
        isRead: false,
        ...notificationScope(currentUser.email, currentUser.role === "SUPER_ADMIN"),
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/admin/notifications")
    publishRealtimeEvent({
      type: "notification:update",
      action: "NOTIFICATIONS_READ",
      entityType: "Notification",
      recipientEmail: currentUser.role === "SUPER_ADMIN" ? null : currentUser.email,
    })

    return { success: true }
  } catch (error) {
    console.error("[markAllNotificationsRead]", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark all notifications as read",
    }
  }
}

/**
 * Deletes a single notification record.
 */
export async function deleteNotification(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentTeamContext()
    const prisma = getPrismaClient()

    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        ...notificationScope(currentUser.email, currentUser.role === "SUPER_ADMIN"),
      },
    })

    revalidatePath("/admin/notifications")
    publishRealtimeEvent({
      type: "notification:update",
      action: "NOTIFICATION_DELETED",
      entityType: "Notification",
      entityId: notificationId,
      recipientEmail: currentUser.role === "SUPER_ADMIN" ? null : currentUser.email,
    })

    return { success: true }
  } catch (error) {
    console.error("[deleteNotification]", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete notification",
    }
  }
}

export async function sendTestPushNotification(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const currentUser = await getCurrentTeamContext()

    await createNotification({
      type: "GENERAL",
      title: "Phone notifications are enabled",
      body: "This is a test notification from TEEZ Admin.",
      link: "/admin/notifications",
      recipientEmail: currentUser.email,
      actorEmail: currentUser.email,
      entityType: "Notification",
      sendEmail: false,
      sendPush: true,
      dedupeKey: `test-push:${currentUser.email}:${Date.now()}`,
    })

    revalidatePath("/admin/notifications")

    return { success: true }
  } catch (error) {
    console.error("[sendTestPushNotification]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send test notification.",
    }
  }
}
