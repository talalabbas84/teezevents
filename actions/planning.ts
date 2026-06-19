"use server";

import { getPrismaClient } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createNotification } from "@/lib/notifications";
import { publishRealtimeEvent } from "@/lib/realtime";
import { getCurrentTeamContext } from "@/lib/team-access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Tasks ───────────────────────────────────────────────────────────────────

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "NEEDS_REVIEW", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  assigneeEmails: z.array(z.string().email()).optional(),
  dueDate: z.coerce.date().optional(),
  parentTaskId: z.string().optional(),
});

const UpdateTaskSchema = TaskSchema.partial().extend({
  assignedTo: z.string().optional().nullable(),
  assigneeEmails: z.array(z.string().email()).optional(),
  dueDate: z.union([z.coerce.date(), z.null()]).optional(),
});

function normalizeAssigneeEmails(value: string[] | undefined) {
  if (!value) return undefined
  return Array.from(new Set(value.map((email) => email.trim().toLowerCase()).filter(Boolean)))
}

function getTaskAssignees(task: { assigneeEmails: string[]; assignedTo?: string | null }) {
  return task.assigneeEmails.length > 0
    ? task.assigneeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    : task.assignedTo
      ? [task.assignedTo.trim().toLowerCase()]
      : []
}

function formatTaskDueDate(value?: Date | null) {
  if (!value) return "No due date set."
  return `Due ${value.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}.`
}

function emitPlanningRealtime(eventId: string, action: string, entityType: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType,
    entityId,
  })
}

async function notifyTaskAssignees(input: {
  eventId: string
  eventTitle: string
  taskId: string
  taskTitle: string
  dueDate?: Date | null
  assigneeEmails: string[]
  actorEmail?: string | null
  action: "assigned" | "completed"
}) {
  const recipients = Array.from(new Set(input.assigneeEmails))
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email && email !== input.actorEmail)

  await Promise.all(
    recipients.map((recipientEmail) => {
      const isCompleted = input.action === "completed"
      return createNotification({
        type: isCompleted ? "TASK_COMPLETED" : "TASK_ASSIGNED",
        title: isCompleted ? `Task completed: ${input.taskTitle}` : `Task assigned: ${input.taskTitle}`,
        body: isCompleted
          ? `A task assigned to you was completed for "${input.eventTitle}".`
          : `You were assigned to "${input.taskTitle}" for "${input.eventTitle}". ${formatTaskDueDate(input.dueDate)}`,
        link: `/admin/planning/${input.eventId}/tasks`,
        actorEmail: input.actorEmail ?? undefined,
        recipientEmail,
        eventId: input.eventId,
        entityType: "PlanningTask",
        entityId: input.taskId,
        dedupeKey: isCompleted
          ? `task-completed:${input.taskId}:${recipientEmail}`
          : `task-assigned:${input.taskId}:${recipientEmail}`,
        sendEmail: true,
      })
    })
  )
}

export async function createTask(
  eventId: string,
  data: {
    title: string;
    description?: string;
    status?: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "NEEDS_REVIEW" | "COMPLETED" | "CANCELLED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    category?: string;
    assignedTo?: string;
    assigneeEmails?: string[];
    dueDate?: Date;
    parentTaskId?: string;
  }
) {
  try {
    const currentUser = await getCurrentTeamContext();
    const parsed = TaskSchema.parse(data);
    const prisma = getPrismaClient();
    const assigneeEmails = normalizeAssigneeEmails(parsed.assigneeEmails);
    const result = await prisma.planningTask.create({
      data: {
        ...parsed,
        eventId,
        assigneeEmails: assigneeEmails ?? (parsed.assignedTo ? [parsed.assignedTo.trim().toLowerCase()] : []),
        assignedTo: assigneeEmails?.[0] ?? parsed.assignedTo?.trim().toLowerCase() ?? null,
      },
      include: {
        event: { select: { title: true } },
      },
    });
    const assignedRecipients = getTaskAssignees(result);
    if (assignedRecipients.length > 0) {
      await prisma.planningActivityLog.create({
        data: {
          eventId,
          actorEmail: currentUser.email,
          action: "ASSIGNED_TASK",
          entityType: "PlanningTask",
          entityId: result.id,
          entityName: result.title,
          details: {
            assigneeEmails: assignedRecipients,
          },
        },
      });
      await notifyTaskAssignees({
        eventId,
        eventTitle: result.event.title,
        taskId: result.id,
        taskTitle: result.title,
        dueDate: result.dueDate,
        assigneeEmails: assignedRecipients,
        actorEmail: currentUser.email,
        action: "assigned",
      });
    }
    revalidatePath(`/admin/planning/${eventId}/tasks`);
    revalidatePath("/admin/notifications");
    emitPlanningRealtime(eventId, "TASK_CREATED", "PlanningTask", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "NEEDS_REVIEW" | "COMPLETED" | "CANCELLED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    category?: string;
    assignedTo?: string | null;
    assigneeEmails?: string[];
    dueDate?: Date | null;
    parentTaskId?: string;
  }
) {
  try {
    const currentUser = await getCurrentTeamContext();
    const parsed = UpdateTaskSchema.parse(data);
    const assigneeEmails = normalizeAssigneeEmails(parsed.assigneeEmails);
    const updateData = {
      ...parsed,
      assigneeEmails,
      assignedTo:
        assigneeEmails
          ? assigneeEmails[0] ?? null
          : Object.prototype.hasOwnProperty.call(parsed, "assignedTo")
          ? parsed.assignedTo?.trim().toLowerCase() || null
          : undefined,
    };
    const prisma = getPrismaClient();
    const existing = await prisma.planningTask.findUnique({
      where: { id: taskId },
      include: {
        event: { select: { title: true } },
      },
    });
    if (!existing) return { success: false, error: "Task not found." };
    const previousAssignees = getTaskAssignees(existing);
    const result = await prisma.planningTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        event: { select: { title: true } },
      },
    });
    const nextAssignees = getTaskAssignees(result);
    const newAssignees = nextAssignees.filter((email) => !previousAssignees.includes(email));
    if (newAssignees.length > 0) {
      await prisma.planningActivityLog.create({
        data: {
          eventId: result.eventId,
          actorEmail: currentUser.email,
          action: "UPDATED_TASK_ASSIGNMENT",
          entityType: "PlanningTask",
          entityId: result.id,
          entityName: result.title,
          details: {
            previousAssignees,
            assigneeEmails: nextAssignees,
            newAssignees,
          },
        },
      });
      await notifyTaskAssignees({
        eventId: result.eventId,
        eventTitle: result.event.title,
        taskId: result.id,
        taskTitle: result.title,
        dueDate: result.dueDate,
        assigneeEmails: newAssignees,
        actorEmail: currentUser.email,
        action: "assigned",
      });
    }
    revalidatePath(`/admin/planning/${result.eventId}/tasks`);
    revalidatePath("/admin/notifications");
    emitPlanningRealtime(result.eventId, "TASK_UPDATED", "PlanningTask", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTask(taskId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.planningTask.delete({ where: { id: taskId } });
    revalidatePath(`/admin/planning/${result.eventId}/tasks`);
    emitPlanningRealtime(result.eventId, "TASK_DELETED", "PlanningTask", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "NEEDS_REVIEW" | "COMPLETED" | "CANCELLED"
) {
  try {
    const currentUser = await getCurrentTeamContext();
    const prisma = getPrismaClient();
    const result = await prisma.planningTask.update({
      where: { id: taskId },
      data: { status },
      include: {
        event: { select: { title: true } },
      },
    });
    if (status === "COMPLETED") {
      const assignees = getTaskAssignees(result);
      await notifyTaskAssignees({
        eventId: result.eventId,
        eventTitle: result.event.title,
        taskId: result.id,
        taskTitle: result.title,
        dueDate: result.dueDate,
        assigneeEmails: assignees,
        actorEmail: currentUser.email,
        action: "completed",
      });
    }
    revalidatePath(`/admin/planning/${result.eventId}/tasks`);
    revalidatePath("/admin/notifications");
    emitPlanningRealtime(result.eventId, "TASK_STATUS_UPDATED", "PlanningTask", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addTaskComment(taskId: string, body: string, authorEmail: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    z.object({ body: z.string().min(1), authorEmail: z.string().email() }).parse({ body, authorEmail });
    const prisma = getPrismaClient();
    const result = await prisma.taskComment.create({ data: { taskId, body, authorEmail } });
    const task = await prisma.planningTask.findUnique({ where: { id: taskId }, select: { eventId: true } });
    if (task) {
      revalidatePath(`/admin/planning/${task.eventId}/tasks`);
      emitPlanningRealtime(task.eventId, "TASK_COMMENT_ADDED", "TaskComment", result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getTaskCommentsAction(taskId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false as const, data: [], error: "Not authorized." }
    const prisma = getPrismaClient()
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    })
    return {
      success: true as const,
      data: comments.map((c: (typeof comments)[number]) => ({
        id: c.id,
        taskId: c.taskId,
        body: c.body,
        authorEmail: c.authorEmail,
        createdAt: c.createdAt.toISOString(),
      })),
    }
  } catch (e: any) {
    return { success: false as const, data: [], error: e.message }
  }
}

export async function updateEventPlanningStatus(
  eventId: string,
  status: "DRAFT" | "PLANNING" | "READY" | "LIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED"
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." }
    const prisma = getPrismaClient()
    await prisma.event.update({ where: { id: eventId }, data: { planningStatus: status } })
    revalidatePath(`/admin/planning/${eventId}`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    revalidatePath(`/admin/planning`)
    emitPlanningRealtime(eventId, "EVENT_STATUS_UPDATED", "Event", eventId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ─── Checklists ───────────────────────────────────────────────────────────────

const ChecklistSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["VENUE", "VENDORS", "MARKETING", "TICKETING", "STAFF", "PERFORMERS", "BUDGET", "LEGAL", "SOUND_LIGHTS", "SECURITY", "DECORATIONS", "FOOD_DRINKS", "DAY_OF_EVENT", "POST_EVENT", "GENERAL"]).optional(),
  description: z.string().optional(),
});

export async function createChecklist(
  eventId: string,
  data: {
    title: string;
    category?: "VENUE" | "VENDORS" | "MARKETING" | "TICKETING" | "STAFF" | "PERFORMERS" | "BUDGET" | "LEGAL" | "SOUND_LIGHTS" | "SECURITY" | "DECORATIONS" | "FOOD_DRINKS" | "DAY_OF_EVENT" | "POST_EVENT" | "GENERAL";
    description?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = ChecklistSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.checklist.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/checklists`);
    emitPlanningRealtime(eventId, "CHECKLIST_CREATED", "Checklist", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateChecklist(
  checklistId: string,
  data: {
    title?: string;
    category?: "VENUE" | "VENDORS" | "MARKETING" | "TICKETING" | "STAFF" | "PERFORMERS" | "BUDGET" | "LEGAL" | "SOUND_LIGHTS" | "SECURITY" | "DECORATIONS" | "FOOD_DRINKS" | "DAY_OF_EVENT" | "POST_EVENT" | "GENERAL";
    description?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = ChecklistSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.checklist.update({ where: { id: checklistId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/checklists`);
    emitPlanningRealtime(result.eventId, "CHECKLIST_UPDATED", "Checklist", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteChecklist(checklistId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.checklist.delete({ where: { id: checklistId } });
    revalidatePath(`/admin/planning/${result.eventId}/checklists`);
    emitPlanningRealtime(result.eventId, "CHECKLIST_DELETED", "Checklist", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addChecklistItem(
  checklistId: string,
  data: {
    title: string;
    sectionId?: string;
    notes?: string;
    assignedTo?: string;
    dueDate?: Date;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      title: z.string().min(1),
      sectionId: z.string().optional(),
      notes: z.string().optional(),
      assignedTo: z.string().optional(),
      dueDate: z.coerce.date().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.checklistItem.create({ data: { ...parsed, checklistId } });
    const checklist = await prisma.checklist.findUnique({ where: { id: checklistId }, select: { eventId: true } });
    if (checklist) {
      revalidatePath(`/admin/planning/${checklist.eventId}/checklists`);
      emitPlanningRealtime(checklist.eventId, "CHECKLIST_ITEM_CREATED", "ChecklistItem", result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean, completedBy?: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted,
        completedBy: isCompleted ? completedBy : null,
        completedAt: isCompleted ? new Date() : null,
      },
    });
    const checklist = await prisma.checklist.findUnique({ where: { id: result.checklistId }, select: { eventId: true } });
    if (checklist) {
      revalidatePath(`/admin/planning/${checklist.eventId}/checklists`);
      emitPlanningRealtime(checklist.eventId, "CHECKLIST_ITEM_TOGGLED", "ChecklistItem", result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteChecklistItem(itemId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.checklistItem.delete({ where: { id: itemId } });
    const checklist = await prisma.checklist.findUnique({ where: { id: result.checklistId }, select: { eventId: true } });
    if (checklist) {
      revalidatePath(`/admin/planning/${checklist.eventId}/checklists`);
      emitPlanningRealtime(checklist.eventId, "CHECKLIST_ITEM_DELETED", "ChecklistItem", result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createChecklistSection(checklistId: string, title: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    z.string().min(1).parse(title);
    const prisma = getPrismaClient();
    const result = await prisma.checklistSection.create({ data: { checklistId, title } });
    const checklist = await prisma.checklist.findUnique({ where: { id: checklistId }, select: { eventId: true } });
    if (checklist) {
      revalidatePath(`/admin/planning/${checklist.eventId}/checklists`);
      emitPlanningRealtime(checklist.eventId, "CHECKLIST_SECTION_CREATED", "ChecklistSection", result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteChecklistSection(sectionId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.checklistSection.delete({ where: { id: sectionId } });
    const checklist = await prisma.checklist.findUnique({ where: { id: result.checklistId }, select: { eventId: true } });
    if (checklist) {
      revalidatePath(`/admin/planning/${checklist.eventId}/checklists`);
      emitPlanningRealtime(checklist.eventId, "CHECKLIST_SECTION_DELETED", "ChecklistSection", sectionId);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Budget ───────────────────────────────────────────────────────────────────

const BudgetItemSchema = z.object({
  category: z.enum(["VENUE", "DJ_MUSIC", "PERFORMERS", "STAFF", "MARKETING", "DECORATIONS", "FOOD_DRINKS", "SECURITY", "EQUIPMENT", "PHOTOGRAPHY", "VIDEOGRAPHY", "MISCELLANEOUS"]),
  title: z.string().min(1),
  description: z.string().optional(),
  estimatedCents: z.number().int().optional(),
  actualCents: z.number().int().optional(),
  paidCents: z.number().int().optional(),
  status: z.enum(["ESTIMATED", "CONFIRMED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  vendorName: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export async function createBudgetItem(
  eventId: string,
  data: {
    category: "VENUE" | "DJ_MUSIC" | "PERFORMERS" | "STAFF" | "MARKETING" | "DECORATIONS" | "FOOD_DRINKS" | "SECURITY" | "EQUIPMENT" | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "MISCELLANEOUS";
    title: string;
    description?: string;
    estimatedCents?: number;
    actualCents?: number;
    paidCents?: number;
    status?: "ESTIMATED" | "CONFIRMED" | "PAID" | "OVERDUE" | "CANCELLED";
    vendorName?: string;
    assignedTo?: string;
    notes?: string;
    dueDate?: Date;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = BudgetItemSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.budgetItem.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/budget`);
    emitPlanningRealtime(eventId, "BUDGET_ITEM_CREATED", "BudgetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateBudgetItem(
  itemId: string,
  data: {
    category?: "VENUE" | "DJ_MUSIC" | "PERFORMERS" | "STAFF" | "MARKETING" | "DECORATIONS" | "FOOD_DRINKS" | "SECURITY" | "EQUIPMENT" | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "MISCELLANEOUS";
    title?: string;
    description?: string;
    estimatedCents?: number;
    actualCents?: number;
    paidCents?: number;
    status?: "ESTIMATED" | "CONFIRMED" | "PAID" | "OVERDUE" | "CANCELLED";
    vendorName?: string;
    assignedTo?: string;
    notes?: string;
    dueDate?: Date;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = BudgetItemSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.budgetItem.update({ where: { id: itemId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/budget`);
    emitPlanningRealtime(result.eventId, "BUDGET_ITEM_UPDATED", "BudgetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteBudgetItem(itemId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.budgetItem.delete({ where: { id: itemId } });
    revalidatePath(`/admin/planning/${result.eventId}/budget`);
    emitPlanningRealtime(result.eventId, "BUDGET_ITEM_DELETED", "BudgetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

const VendorSchema = z.object({
  vendorType: z.enum(["VENUE", "DJ", "PHOTOGRAPHER", "VIDEOGRAPHER", "SECURITY", "CATERING", "DECOR", "LIGHTING", "SOUND", "PERFORMER", "SPONSOR", "OTHER"]),
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(["PENDING", "CONTACTED", "CONFIRMED", "CANCELLED", "REJECTED"]).optional(),
  quoteCents: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function createVendor(
  eventId: string,
  data: {
    vendorType: "VENUE" | "DJ" | "PHOTOGRAPHER" | "VIDEOGRAPHER" | "SECURITY" | "CATERING" | "DECOR" | "LIGHTING" | "SOUND" | "PERFORMER" | "SPONSOR" | "OTHER";
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    status?: "PENDING" | "CONTACTED" | "CONFIRMED" | "CANCELLED" | "REJECTED";
    quoteCents?: number;
    notes?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = VendorSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.eventVendor.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/vendors`);
    emitPlanningRealtime(eventId, "VENDOR_CREATED", "EventVendor", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateVendor(
  vendorId: string,
  data: {
    vendorType?: "VENUE" | "DJ" | "PHOTOGRAPHER" | "VIDEOGRAPHER" | "SECURITY" | "CATERING" | "DECOR" | "LIGHTING" | "SOUND" | "PERFORMER" | "SPONSOR" | "OTHER";
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    status?: "PENDING" | "CONTACTED" | "CONFIRMED" | "CANCELLED" | "REJECTED";
    quoteCents?: number;
    notes?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = VendorSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.eventVendor.update({ where: { id: vendorId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/vendors`);
    emitPlanningRealtime(result.eventId, "VENDOR_UPDATED", "EventVendor", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteVendor(vendorId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.eventVendor.delete({ where: { id: vendorId } });
    revalidatePath(`/admin/planning/${result.eventId}/vendors`);
    emitPlanningRealtime(result.eventId, "VENDOR_DELETED", "EventVendor", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateVendorStatus(
  vendorId: string,
  status: "PENDING" | "CONTACTED" | "CONFIRMED" | "CANCELLED" | "REJECTED"
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.eventVendor.update({ where: { id: vendorId }, data: { status } });
    revalidatePath(`/admin/planning/${result.eventId}/vendors`);
    emitPlanningRealtime(result.eventId, "VENDOR_STATUS_UPDATED", "EventVendor", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Run Sheet ────────────────────────────────────────────────────────────────

const RunSheetItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  ownerName: z.string().optional(),
  location: z.string().optional(),
  durationMins: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function createRunSheetItem(
  eventId: string,
  data: {
    time: string;
    title: string;
    description?: string;
    ownerName?: string;
    location?: string;
    durationMins?: number;
    notes?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = RunSheetItemSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.runSheetItem.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/run-sheet`);
    emitPlanningRealtime(eventId, "RUN_SHEET_ITEM_CREATED", "RunSheetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateRunSheetItem(
  itemId: string,
  data: {
    time?: string;
    title?: string;
    description?: string;
    ownerName?: string;
    location?: string;
    durationMins?: number;
    notes?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = RunSheetItemSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.runSheetItem.update({ where: { id: itemId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/run-sheet`);
    emitPlanningRealtime(result.eventId, "RUN_SHEET_ITEM_UPDATED", "RunSheetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteRunSheetItem(itemId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.runSheetItem.delete({ where: { id: itemId } });
    revalidatePath(`/admin/planning/${result.eventId}/run-sheet`);
    emitPlanningRealtime(result.eventId, "RUN_SHEET_ITEM_DELETED", "RunSheetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateRunSheetItemStatus(
  itemId: string,
  status: "UPCOMING" | "IN_PROGRESS" | "DONE" | "DELAYED" | "CANCELLED"
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.runSheetItem.update({ where: { id: itemId }, data: { status } });
    revalidatePath(`/admin/planning/${result.eventId}/run-sheet`);
    emitPlanningRealtime(result.eventId, "RUN_SHEET_ITEM_STATUS_UPDATED", "RunSheetItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function reorderRunSheetItems(eventId: string, orderedIds: string[]) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.runSheetItem.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    revalidatePath(`/admin/planning/${eventId}/run-sheet`);
    emitPlanningRealtime(eventId, "RUN_SHEET_ITEMS_REORDERED", "RunSheetItem");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TimelineItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  dueDate: z.coerce.date(),
  isMilestone: z.boolean().optional(),
  assignedTo: z.string().optional(),
});

export async function createTimelineItem(
  eventId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    dueDate: Date;
    isMilestone?: boolean;
    assignedTo?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = TimelineItemSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.planningTimelineItem.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/timeline`);
    emitPlanningRealtime(eventId, "TIMELINE_ITEM_CREATED", "PlanningTimelineItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTimelineItem(
  itemId: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    dueDate?: Date;
    isMilestone?: boolean;
    assignedTo?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = TimelineItemSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.planningTimelineItem.update({ where: { id: itemId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/timeline`);
    emitPlanningRealtime(result.eventId, "TIMELINE_ITEM_UPDATED", "PlanningTimelineItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTimelineItem(itemId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.planningTimelineItem.delete({ where: { id: itemId } });
    revalidatePath(`/admin/planning/${result.eventId}/timeline`);
    emitPlanningRealtime(result.eventId, "TIMELINE_ITEM_DELETED", "PlanningTimelineItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleTimelineItem(itemId: string, isCompleted: boolean) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.planningTimelineItem.update({
      where: { id: itemId },
      data: { isCompleted, completedAt: isCompleted ? new Date() : null },
    });
    revalidatePath(`/admin/planning/${result.eventId}/timeline`);
    emitPlanningRealtime(result.eventId, "TIMELINE_ITEM_TOGGLED", "PlanningTimelineItem", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Risks ────────────────────────────────────────────────────────────────────

const RiskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  probability: z.enum(["UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"]).optional(),
  status: z.enum(["OPEN", "MITIGATED", "RESOLVED", "ACCEPTED"]).optional(),
  mitigationPlan: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function createRisk(
  eventId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    probability?: "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
    status?: "OPEN" | "MITIGATED" | "RESOLVED" | "ACCEPTED";
    mitigationPlan?: string;
    assignedTo?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = RiskSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.risk.create({ data: { ...parsed, eventId } });
    revalidatePath(`/admin/planning/${eventId}/risks`);
    emitPlanningRealtime(eventId, "RISK_CREATED", "Risk", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateRisk(
  riskId: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    probability?: "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
    status?: "OPEN" | "MITIGATED" | "RESOLVED" | "ACCEPTED";
    mitigationPlan?: string;
    assignedTo?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = RiskSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.risk.update({ where: { id: riskId }, data: parsed });
    revalidatePath(`/admin/planning/${result.eventId}/risks`);
    emitPlanningRealtime(result.eventId, "RISK_UPDATED", "Risk", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteRisk(riskId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.risk.delete({ where: { id: riskId } });
    revalidatePath(`/admin/planning/${result.eventId}/risks`);
    emitPlanningRealtime(result.eventId, "RISK_DELETED", "Risk", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateRiskStatus(
  riskId: string,
  status: "OPEN" | "MITIGATED" | "RESOLVED" | "ACCEPTED"
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.risk.update({ where: { id: riskId }, data: { status } });
    revalidatePath(`/admin/planning/${result.eventId}/risks`);
    emitPlanningRealtime(result.eventId, "RISK_STATUS_UPDATED", "Risk", result.id);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Blueprints ───────────────────────────────────────────────────────────────

const BlueprintSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createBlueprint(data: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
}) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = BlueprintSchema.parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.eventBlueprint.create({ data: parsed });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateBlueprint(
  blueprintId: string,
  data: { name?: string; description?: string; category?: string; tags?: string[] }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = BlueprintSchema.partial().parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.eventBlueprint.update({ where: { id: blueprintId }, data: parsed });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteBlueprint(blueprintId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.eventBlueprint.delete({ where: { id: blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addBlueprintTask(
  blueprintId: string,
  data: {
    title: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    category?: string;
    daysBeforeEvent?: number;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      category: z.string().optional(),
      daysBeforeEvent: z.number().int().optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.blueprintTask.create({ data: { ...parsed, blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addBlueprintChecklistItem(
  blueprintId: string,
  data: {
    title: string;
    section?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    category?: string;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      title: z.string().min(1),
      section: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      category: z.enum(["VENUE", "VENDORS", "MARKETING", "TICKETING", "STAFF", "PERFORMERS", "BUDGET", "LEGAL", "SOUND_LIGHTS", "SECURITY", "DECORATIONS", "FOOD_DRINKS", "DAY_OF_EVENT", "POST_EVENT", "GENERAL"]).optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.blueprintChecklistItem.create({ data: { ...parsed, blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addBlueprintBudgetItem(
  blueprintId: string,
  data: {
    category: "VENUE" | "DJ_MUSIC" | "PERFORMERS" | "STAFF" | "MARKETING" | "DECORATIONS" | "FOOD_DRINKS" | "SECURITY" | "EQUIPMENT" | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "MISCELLANEOUS";
    title: string;
    estimatedCents?: number;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      category: z.enum(["VENUE", "DJ_MUSIC", "PERFORMERS", "STAFF", "MARKETING", "DECORATIONS", "FOOD_DRINKS", "SECURITY", "EQUIPMENT", "PHOTOGRAPHY", "VIDEOGRAPHY", "MISCELLANEOUS"]),
      title: z.string().min(1),
      estimatedCents: z.number().int().optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.blueprintBudgetItem.create({ data: { ...parsed, blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addBlueprintRunSheetItem(
  blueprintId: string,
  data: {
    time: string;
    title: string;
    description?: string;
    durationMins?: number;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      time: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      durationMins: z.number().int().optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.blueprintRunSheetItem.create({ data: { ...parsed, blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addBlueprintTimelineItem(
  blueprintId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    daysBeforeEvent: number;
    isMilestone?: boolean;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const parsed = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      daysBeforeEvent: z.number().int(),
      isMilestone: z.boolean().optional(),
    }).parse(data);
    const prisma = getPrismaClient();
    const result = await prisma.blueprintTimelineItem.create({ data: { ...parsed, blueprintId } });
    revalidatePath("/admin/blueprints");
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function applyBlueprintToEvent(eventId: string, blueprintId: string) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();

    const [blueprint, event] = await Promise.all([
      prisma.eventBlueprint.findUniqueOrThrow({
        where: { id: blueprintId },
        include: {
          tasks: true,
          checklistItems: true,
          budgetItems: true,
          runSheetItems: true,
          timelineItems: true,
        },
      }),
      prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { startsAt: true } }),
    ]);

    const eventStart = event.startsAt ?? null;

    const calcDueDate = (daysBeforeEvent: number | null | undefined): Date | undefined => {
      if (!eventStart || daysBeforeEvent == null) return undefined;
      const d = new Date(eventStart);
      d.setDate(d.getDate() - daysBeforeEvent);
      return d;
    };

    await prisma.$transaction(async (tx) => {
      if (blueprint.tasks.length > 0) {
        await tx.planningTask.createMany({
          data: blueprint.tasks.map((t) => ({
            eventId,
            title: t.title,
            description: t.description ?? undefined,
            priority: t.priority ?? undefined,
            category: t.category ?? undefined,
            dueDate: calcDueDate(t.daysBeforeEvent),
          })),
        });
      }

      if (blueprint.checklistItems.length > 0) {
        const checklist = await tx.checklist.create({
          data: { eventId, title: blueprint.name },
        });
        await tx.checklistItem.createMany({
          data: blueprint.checklistItems.map((item) => ({
            checklistId: checklist.id,
            title: item.title,
            priority: item.priority ?? undefined,
          })),
        });
      }

      if (blueprint.budgetItems.length > 0) {
        await tx.budgetItem.createMany({
          data: blueprint.budgetItems.map((item) => ({
            eventId,
            category: item.category,
            title: item.title,
            estimatedCents: item.estimatedCents ?? undefined,
          })),
        });
      }

      if (blueprint.runSheetItems.length > 0) {
        await tx.runSheetItem.createMany({
          data: blueprint.runSheetItems.map((item) => ({
            eventId,
            time: item.time,
            title: item.title,
            description: item.description ?? undefined,
            durationMins: item.durationMins ?? undefined,
          })),
        });
      }

      if (blueprint.timelineItems.length > 0) {
        const timelineData = blueprint.timelineItems
          .map((item) => {
            const dueDate = calcDueDate(item.daysBeforeEvent);
            if (!dueDate) return null;
            return {
              eventId,
              title: item.title,
              description: item.description ?? undefined,
              category: item.category ?? undefined,
              dueDate,
              isMilestone: item.isMilestone ?? undefined,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (timelineData.length > 0) {
          await tx.planningTimelineItem.createMany({ data: timelineData });
        }
      }
    });

    revalidatePath(`/admin/planning/${eventId}/tasks`);
    revalidatePath(`/admin/planning/${eventId}/checklists`);
    revalidatePath(`/admin/planning/${eventId}/budget`);
    revalidatePath(`/admin/planning/${eventId}/run-sheet`);
    revalidatePath(`/admin/planning/${eventId}/timeline`);
    revalidatePath(`/admin/planning/${eventId}/dashboard`);
    emitPlanningRealtime(eventId, "BLUEPRINT_APPLIED", "EventBlueprint", blueprintId);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(
  eventId: string | null,
  actorEmail: string,
  action: string,
  entityType?: string,
  entityId?: string,
  entityName?: string,
  details?: Record<string, unknown>
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." };
    const prisma = getPrismaClient();
    const result = await prisma.planningActivityLog.create({
      data: {
        eventId: eventId ?? undefined,
        actorEmail,
        action,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        entityName: entityName ?? undefined,
        details: (details ?? undefined) as never,
      },
    });
    if (eventId) {
      revalidatePath(`/admin/planning/${eventId}/dashboard`);
      emitPlanningRealtime(eventId, "ACTIVITY_LOG_CREATED", entityType ?? "PlanningActivityLog", entityId ?? result.id);
    }
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Save Event as Blueprint ───────────────────────────────────────────────────

export async function saveEventAsBlueprint(
  eventId: string,
  blueprintName: string,
  blueprintDescription?: string
) {
  try {
    if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." }
    if (!blueprintName.trim()) return { success: false, error: "Blueprint name is required." }

    const prisma = getPrismaClient()

    // Fetch all event planning data
    const [event, tasks, checklists, budgetItems, runSheetItems] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { title: true, category: true } }),
      prisma.planningTask.findMany({
        where: { eventId, parentTaskId: null },
        select: { title: true, description: true, priority: true, category: true },
      }),
      prisma.checklist.findMany({
        where: { eventId },
        select: {
          title: true,
          category: true,
          items: { select: { title: true, priority: true } },
        },
      }),
      prisma.budgetItem.findMany({
        where: { eventId },
        select: { title: true, category: true, estimatedCents: true },
      }),
      prisma.runSheetItem.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
        select: { time: true, title: true, description: true, durationMins: true, sortOrder: true },
      }),
    ])

    if (!event) return { success: false, error: "Event not found." }

    // Create blueprint in a transaction
    const blueprint = await prisma.$transaction(async (tx) => {
      const bp = await tx.eventBlueprint.create({
        data: {
          name: blueprintName.trim(),
          description: blueprintDescription?.trim() || `Blueprint created from "${event.title}"`,
          category: String(event.category),
          isActive: true,
        },
      })

      // Copy tasks
      if (tasks.length > 0) {
        await tx.blueprintTask.createMany({
          data: tasks.map((t) => ({
            blueprintId: bp.id,
            title: t.title,
            description: t.description ?? undefined,
            priority: t.priority,
            category: t.category ?? undefined,
          })),
        })
      }

      // Copy checklist items — each item becomes a BlueprintChecklistItem
      for (const cl of checklists) {
        for (const item of cl.items) {
          await tx.blueprintChecklistItem.create({
            data: {
              blueprintId: bp.id,
              title: item.title,
              category: cl.category ?? "GENERAL",
              priority: item.priority,
              section: cl.title,
            },
          })
        }
      }

      // Copy budget items
      if (budgetItems.length > 0) {
        await tx.blueprintBudgetItem.createMany({
          data: budgetItems.map((b) => ({
            blueprintId: bp.id,
            title: b.title,
            category: b.category,
            estimatedCents: b.estimatedCents,
          })),
        })
      }

      // Copy run sheet items
      if (runSheetItems.length > 0) {
        await tx.blueprintRunSheetItem.createMany({
          data: runSheetItems.map((r) => ({
            blueprintId: bp.id,
            time: r.time,
            title: r.title,
            description: r.description ?? undefined,
            durationMins: r.durationMins ?? undefined,
            sortOrder: r.sortOrder,
          })),
        })
      }

      return bp
    })

    revalidatePath("/admin/blueprints")
    return { success: true, data: { blueprintId: blueprint.id, name: blueprint.name } }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
