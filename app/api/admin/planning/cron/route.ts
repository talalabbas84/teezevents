import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getTaskAssignees(task: { assigneeEmails: string[]; assignedTo?: string | null }) {
  return task.assigneeEmails.length > 0
    ? task.assigneeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    : task.assignedTo
      ? [task.assignedTo.trim().toLowerCase()]
      : []
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function dueLabel(value: Date | null) {
  if (!value) return "No due date"
  return value.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export async function GET(request: Request) {
  // ── Auth: verify CRON_SECRET if configured ─────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const prisma = getPrismaClient()
  let notificationsCreated = 0
  let emailsSent = 0
  let emailsSkipped = 0
  let emailsFailed = 0
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    const inactivePlanningStatuses: Array<"COMPLETED" | "CANCELLED" | "ARCHIVED"> = [
      "COMPLETED",
      "CANCELLED",
      "ARCHIVED",
    ]
    const activeEventWhere = {
      planningStatus: {
        notIn: inactivePlanningStatuses,
      },
    }

    const eventsChecked = await prisma.event.count({
      where: activeEventWhere,
    })

    const trackNotification = (notification: Awaited<ReturnType<typeof createNotification>>) => {
      if (!notification) return
      notificationsCreated++
      if (notification.emailStatus === "SENT") emailsSent++
      if (notification.emailStatus === "SKIPPED") emailsSkipped++
      if (notification.emailStatus === "FAILED") emailsFailed++
    }

    // ── 1. Overdue assigned tasks ────────────────────────────────────────────
    const overdueTasks = await prisma.planningTask.findMany({
      where: {
        event: activeEventWhere,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now },
        OR: [
          { assignedTo: { not: null } },
          { assigneeEmails: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        title: true,
        assignedTo: true,
        assigneeEmails: true,
        dueDate: true,
        eventId: true,
        event: {
          select: { title: true },
        },
      },
    })

    for (const task of overdueTasks) {
      for (const recipientEmail of getTaskAssignees(task)) {
        const notification = await createNotification({
          type: "TASK_OVERDUE",
          title: `Overdue task: ${task.title}`,
          body: `Task "${task.title}" was due ${dueLabel(task.dueDate)} for "${task.event.title}".`,
          link: `/admin/planning/${task.eventId}/tasks`,
          recipientEmail,
          eventId: task.eventId,
          entityType: "PlanningTask",
          entityId: task.id,
          dedupeKey: `task-overdue:${task.id}:${recipientEmail}:${dayKey(now)}`,
          sendEmail: true,
        })
        trackNotification(notification)
      }
    }

    // ── 2. Assigned tasks due in 24 hours ────────────────────────────────────
    const dueSoonTasks = await prisma.planningTask.findMany({
      where: {
        event: activeEventWhere,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { gte: now, lte: in24h },
        OR: [
          { assignedTo: { not: null } },
          { assigneeEmails: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        title: true,
        assignedTo: true,
        assigneeEmails: true,
        dueDate: true,
        eventId: true,
        event: {
          select: { title: true },
        },
      },
    })

    for (const task of dueSoonTasks) {
      for (const recipientEmail of getTaskAssignees(task)) {
        const notification = await createNotification({
          type: "TASK_DUE_SOON",
          title: `Task due soon: ${task.title}`,
          body: `Task "${task.title}" is due ${dueLabel(task.dueDate)} for "${task.event.title}".`,
          link: `/admin/planning/${task.eventId}/tasks`,
          recipientEmail,
          eventId: task.eventId,
          entityType: "PlanningTask",
          entityId: task.id,
          dedupeKey: `task-due-soon:${task.id}:${recipientEmail}:${task.dueDate ? dayKey(task.dueDate) : dayKey(now)}`,
          sendEmail: true,
        })
        trackNotification(notification)
      }
    }

    // ── 3. Events starting soon with unconfirmed vendors ─────────────────────
    const eventsStartingSoon = await prisma.event.findMany({
      where: {
        ...activeEventWhere,
        startsAt: { gte: now, lte: in7d },
      },
      select: {
        id: true,
        title: true,
        eventVendors: {
          where: {
            status: { notIn: ["CONFIRMED", "CANCELLED", "REJECTED"] },
          },
          select: { id: true, name: true },
        },
      },
    })

    for (const event of eventsStartingSoon) {
      if (event.eventVendors.length > 0) {
        const notification = await createNotification({
          type: "VENDOR_STATUS_CHANGED",
          title: `Unconfirmed vendors for "${event.title}"`,
          body: `${event.eventVendors.length} vendor(s) are not confirmed. Event starts within 7 days.`,
          link: `/admin/planning/${event.id}/vendors`,
          eventId: event.id,
          entityType: "Event",
          entityId: event.id,
          dedupeKey: `vendors-unconfirmed:${event.id}:${dayKey(now)}`,
        })
        trackNotification(notification)
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      emailsSent,
      emailsSkipped,
      emailsFailed,
      eventsChecked,
      overdueTasksChecked: overdueTasks.length,
      dueSoonTasksChecked: dueSoonTasks.length,
      ranAt: now.toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[cron] Planning automation error:", message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
