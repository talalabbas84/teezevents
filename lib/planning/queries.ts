import "server-only"

import { getPrismaClient } from "@/lib/prisma"
import type {
  BudgetCategory,
  BudgetItemSerialized,
  BudgetItemStatus,
  BlueprintSummary,
  ChecklistSerialized,
  EventBlueprintSerialized,
  EventVendorSerialized,
  PlanningActivityLogSerialized,
  PlanningDashboardData,
  PlanningTaskSerialized,
  PlanningTimelineItemSerialized,
  RiskSerialized,
  RiskSeverity,
  RiskStatus,
  RunSheetItemSerialized,
  RunSheetStatus,
  TaskStatus,
  VendorStatus,
} from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

function zeroStatusCounts<T extends string>(values: T[]): Record<T, number> {
  return Object.fromEntries(values.map((v) => [v, 0])) as Record<T, number>
}

const TASK_STATUS_VALUES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "NEEDS_REVIEW",
  "COMPLETED",
  "CANCELLED",
]

const VENDOR_STATUS_VALUES: VendorStatus[] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
  "REJECTED",
]

const RISK_STATUS_VALUES: RiskStatus[] = [
  "OPEN",
  "MITIGATED",
  "RESOLVED",
  "ACCEPTED",
]

const RISK_SEVERITY_VALUES: RiskSeverity[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]

const RUN_SHEET_STATUS_VALUES: RunSheetStatus[] = [
  "UPCOMING",
  "IN_PROGRESS",
  "DONE",
  "DELAYED",
  "CANCELLED",
]

const BUDGET_CATEGORY_VALUES: BudgetCategory[] = [
  "VENUE",
  "DJ_MUSIC",
  "PERFORMERS",
  "STAFF",
  "MARKETING",
  "DECORATIONS",
  "FOOD_DRINKS",
  "SECURITY",
  "EQUIPMENT",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "MISCELLANEOUS",
]

// ─── Task serialization ───────────────────────────────────────────────────────

type RawTask = {
  id: string
  eventId: string
  title: string
  description: string | null
  status: string
  priority: string
  category: string | null
  assignedTo: string | null
  dueDate: Date | null
  completedAt: Date | null
  sortOrder: number
  parentTaskId: string | null
  blueprintTaskId: string | null
  createdAt: Date
  updatedAt: Date
  subtasks?: RawTask[]
  _count?: { comments: number }
}

function serializeTask(task: RawTask): PlanningTaskSerialized {
  return {
    id: task.id,
    eventId: task.eventId,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as import("./types").TaskPriority,
    category: task.category,
    assignedTo: task.assignedTo,
    dueDate: toIso(task.dueDate),
    completedAt: toIso(task.completedAt),
    sortOrder: task.sortOrder,
    parentTaskId: task.parentTaskId,
    subtasks: (task.subtasks ?? []).map(serializeTask),
    commentCount: task._count?.comments ?? 0,
    blueprintTaskId: task.blueprintTaskId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPlanningDashboard(eventId: string): Promise<PlanningDashboardData> {
  const prisma = getPrismaClient()
  const now = new Date()

  const [
    tasks,
    overdueTasks,
    checklistStats,
    budgetItems,
    vendors,
    risks,
    runSheet,
    timeline,
    upcomingTimeline,
    overdueTimeline,
    recentActivity,
  ] = await Promise.all([
    prisma.planningTask.groupBy({
      by: ["status"],
      where: { eventId, parentTaskId: null },
      _count: { id: true },
    }),
    prisma.planningTask.findMany({
      where: {
        eventId,
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        assignedTo: true,
        dueDate: true,
        completedAt: true,
        sortOrder: true,
        parentTaskId: true,
        blueprintTaskId: true,
        createdAt: true,
        updatedAt: true,
        subtasks: {
          select: {
            id: true,
            eventId: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            category: true,
            assignedTo: true,
            dueDate: true,
            completedAt: true,
            sortOrder: true,
            parentTaskId: true,
            blueprintTaskId: true,
            createdAt: true,
            updatedAt: true,
            subtasks: { select: { id: true } },
            _count: { select: { comments: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.checklistItem.aggregate({
      where: { checklist: { eventId } },
      _count: { id: true, isCompleted: true },
    }),
    prisma.budgetItem.findMany({
      where: { eventId },
      select: {
        category: true,
        estimatedCents: true,
        actualCents: true,
        paidCents: true,
      },
    }),
    prisma.eventVendor.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { id: true },
    }),
    prisma.risk.findMany({
      where: { eventId },
      select: { status: true, severity: true },
    }),
    prisma.runSheetItem.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { id: true },
    }),
    prisma.planningTimelineItem.count({ where: { eventId } }),
    prisma.planningTimelineItem.findMany({
      where: { eventId, isCompleted: false, dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.planningTimelineItem.findMany({
      where: { eventId, isCompleted: false, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.planningActivityLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // task counts
  const taskByStatus = zeroStatusCounts(TASK_STATUS_VALUES)
  let taskTotal = 0
  for (const row of tasks) {
    const s = row.status as TaskStatus
    const count = row._count.id
    taskByStatus[s] = count
    taskTotal += count
  }

  // checklist stats
  const totalItems = checklistStats._count.id
  const completedItems = await prisma.checklistItem.count({
    where: { checklist: { eventId }, isCompleted: true },
  })
  const checklistTotal = await prisma.checklist.count({ where: { eventId } })

  // budget
  const budgetByCategory = Object.fromEntries(
    BUDGET_CATEGORY_VALUES.map((c) => [c, { estimatedCents: 0, actualCents: 0 }]),
  ) as Record<BudgetCategory, { estimatedCents: number; actualCents: number }>
  let totalEstimatedCents = 0
  let totalActualCents = 0
  let totalPaidCents = 0
  for (const item of budgetItems) {
    totalEstimatedCents += item.estimatedCents
    totalActualCents += item.actualCents
    totalPaidCents += item.paidCents
    const cat = item.category as BudgetCategory
    budgetByCategory[cat].estimatedCents += item.estimatedCents
    budgetByCategory[cat].actualCents += item.actualCents
  }

  // vendors
  const vendorByStatus = zeroStatusCounts(VENDOR_STATUS_VALUES)
  let vendorTotal = 0
  for (const row of vendors) {
    const s = row.status as VendorStatus
    vendorByStatus[s] = row._count.id
    vendorTotal += row._count.id
  }

  // risks
  const riskByStatus = zeroStatusCounts(RISK_STATUS_VALUES)
  const riskBySeverity = zeroStatusCounts(RISK_SEVERITY_VALUES)
  for (const risk of risks) {
    riskByStatus[risk.status as RiskStatus]++
    riskBySeverity[risk.severity as RiskSeverity]++
  }

  // run sheet
  const runSheetByStatus = zeroStatusCounts(RUN_SHEET_STATUS_VALUES)
  let runSheetTotal = 0
  for (const row of runSheet) {
    const s = row.status as RunSheetStatus
    runSheetByStatus[s] = row._count.id
    runSheetTotal += row._count.id
  }

  const serializeTimelineItem = (item: {
    id: string
    eventId: string
    title: string
    description: string | null
    category: string | null
    dueDate: Date
    isMilestone: boolean
    isCompleted: boolean
    completedAt: Date | null
    assignedTo: string | null
    sortOrder: number
  }): PlanningTimelineItemSerialized => ({
    id: item.id,
    eventId: item.eventId,
    title: item.title,
    description: item.description,
    category: item.category,
    dueDate: item.dueDate.toISOString(),
    isMilestone: item.isMilestone,
    isCompleted: item.isCompleted,
    completedAt: toIso(item.completedAt),
    assignedTo: item.assignedTo,
    sortOrder: item.sortOrder,
  })

  return {
    tasks: {
      total: taskTotal,
      byStatus: taskByStatus,
      overdueTasks: overdueTasks.map(serializeTask),
    },
    checklists: {
      total: checklistTotal,
      totalItems,
      completedItems,
    },
    budget: {
      totalEstimatedCents,
      totalActualCents,
      totalPaidCents,
      byCategory: budgetByCategory,
    },
    vendors: {
      total: vendorTotal,
      byStatus: vendorByStatus,
    },
    risks: {
      total: risks.length,
      byStatus: riskByStatus,
      bySeverity: riskBySeverity,
    },
    runSheet: {
      total: runSheetTotal,
      byStatus: runSheetByStatus,
    },
    timeline: {
      total: timeline,
      upcoming: upcomingTimeline.map(serializeTimelineItem),
      overdue: overdueTimeline.map(serializeTimelineItem),
    },
    recentActivity: recentActivity.map(
      (log): PlanningActivityLogSerialized => ({
        id: log.id,
        eventId: log.eventId,
        actorEmail: log.actorEmail,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: log.entityName,
        details: log.details ?? null,
        createdAt: log.createdAt.toISOString(),
      }),
    ),
  }
}

export async function getEventTasks(eventId: string): Promise<PlanningTaskSerialized[]> {
  const prisma = getPrismaClient()

  const tasks = await prisma.planningTask.findMany({
    where: { eventId, parentTaskId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      eventId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      assignedTo: true,
      dueDate: true,
      completedAt: true,
      sortOrder: true,
      parentTaskId: true,
      blueprintTaskId: true,
      createdAt: true,
      updatedAt: true,
      subtasks: {
        orderBy: { sortOrder: "asc" as const },
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          assignedTo: true,
          dueDate: true,
          completedAt: true,
          sortOrder: true,
          parentTaskId: true,
          blueprintTaskId: true,
          createdAt: true,
          updatedAt: true,
          subtasks: { select: { id: true } },
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  })

  return tasks.map(serializeTask)
}

export async function getEventChecklists(eventId: string): Promise<ChecklistSerialized[]> {
  const prisma = getPrismaClient()

  const checklists = await prisma.checklist.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      },
      items: {
        where: { sectionId: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return checklists.map((cl) => ({
    id: cl.id,
    eventId: cl.eventId,
    title: cl.title,
    category: cl.category as import("./types").ChecklistCategory,
    description: cl.description,
    sortOrder: cl.sortOrder,
    sections: cl.sections.map((sec) => ({
      id: sec.id,
      checklistId: sec.checklistId,
      title: sec.title,
      sortOrder: sec.sortOrder,
      items: sec.items.map((item) => ({
        id: item.id,
        checklistId: item.checklistId,
        sectionId: item.sectionId,
        title: item.title,
        notes: item.notes,
        assignedTo: item.assignedTo,
        dueDate: toIso(item.dueDate),
        priority: item.priority as import("./types").TaskPriority,
        isCompleted: item.isCompleted,
        completedAt: toIso(item.completedAt),
        completedBy: item.completedBy,
        sortOrder: item.sortOrder,
      })),
    })),
    items: cl.items.map((item) => ({
      id: item.id,
      checklistId: item.checklistId,
      sectionId: item.sectionId,
      title: item.title,
      notes: item.notes,
      assignedTo: item.assignedTo,
      dueDate: toIso(item.dueDate),
      priority: item.priority as import("./types").TaskPriority,
      isCompleted: item.isCompleted,
      completedAt: toIso(item.completedAt),
      completedBy: item.completedBy,
      sortOrder: item.sortOrder,
    })),
  }))
}

export async function getEventBudget(eventId: string): Promise<BudgetItemSerialized[]> {
  const prisma = getPrismaClient()

  const items = await prisma.budgetItem.findMany({
    where: { eventId },
    orderBy: { category: "asc" },
  })

  return items.map((item) => ({
    id: item.id,
    eventId: item.eventId,
    category: item.category as BudgetCategory,
    title: item.title,
    description: item.description,
    estimatedCents: item.estimatedCents,
    actualCents: item.actualCents,
    paidCents: item.paidCents,
    status: item.status as BudgetItemStatus,
    vendorName: item.vendorName,
    assignedTo: item.assignedTo,
    receiptUrl: item.receiptUrl,
    notes: item.notes,
    dueDate: toIso(item.dueDate),
  }))
}

export async function getEventVendors(eventId: string): Promise<EventVendorSerialized[]> {
  const prisma = getPrismaClient()

  const vendors = await prisma.eventVendor.findMany({
    where: { eventId },
    orderBy: { vendorType: "asc" },
  })

  return vendors.map((v) => ({
    id: v.id,
    eventId: v.eventId,
    vendorType: v.vendorType as import("./types").VendorType,
    name: v.name,
    contactName: v.contactName,
    email: v.email,
    phone: v.phone,
    website: v.website,
    status: v.status as VendorStatus,
    confirmedAt: toIso(v.confirmedAt),
    contractUrl: v.contractUrl,
    quoteCents: v.quoteCents,
    paidCents: v.paidCents,
    notes: v.notes,
    rating: v.rating,
  }))
}

export async function getEventRunSheet(eventId: string): Promise<RunSheetItemSerialized[]> {
  const prisma = getPrismaClient()

  const items = await prisma.runSheetItem.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  })

  return items.map((item) => ({
    id: item.id,
    eventId: item.eventId,
    time: String(item.time),
    title: item.title,
    description: item.description,
    ownerName: item.ownerName,
    location: item.location,
    durationMins: item.durationMins,
    status: item.status as RunSheetStatus,
    notes: item.notes,
    sortOrder: item.sortOrder,
  }))
}

export async function getEventTimeline(
  eventId: string,
): Promise<PlanningTimelineItemSerialized[]> {
  const prisma = getPrismaClient()

  const items = await prisma.planningTimelineItem.findMany({
    where: { eventId },
    orderBy: { dueDate: "asc" },
  })

  return items.map((item) => ({
    id: item.id,
    eventId: item.eventId,
    title: item.title,
    description: item.description,
    category: item.category,
    dueDate: item.dueDate.toISOString(),
    isMilestone: item.isMilestone,
    isCompleted: item.isCompleted,
    completedAt: toIso(item.completedAt),
    assignedTo: item.assignedTo,
    sortOrder: item.sortOrder,
  }))
}

export async function getEventRisks(eventId: string): Promise<RiskSerialized[]> {
  const prisma = getPrismaClient()

  const risks = await prisma.risk.findMany({
    where: { eventId },
    orderBy: [{ severity: "desc" }, { status: "asc" }],
  })

  return risks.map((risk) => ({
    id: risk.id,
    eventId: risk.eventId,
    title: risk.title,
    description: risk.description,
    category: risk.category,
    severity: risk.severity as RiskSeverity,
    probability: risk.probability as import("./types").RiskProbability,
    status: risk.status as RiskStatus,
    mitigationPlan: risk.mitigationPlan,
    assignedTo: risk.assignedTo,
    resolvedAt: toIso(risk.resolvedAt),
  }))
}

export async function getEventBlueprints(): Promise<BlueprintSummary[]> {
  const prisma = getPrismaClient()

  const blueprints = await prisma.eventBlueprint.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      _count: {
        select: {
          tasks: true,
          checklistItems: true,
          budgetItems: true,
        },
      },
    },
  })

  return blueprints.map((bp) => ({
    id: bp.id,
    name: bp.name,
    description: bp.description,
    category: bp.category,
    tags: bp.tags,
    taskCount: bp._count.tasks,
    checklistItemCount: bp._count.checklistItems,
    budgetItemCount: bp._count.budgetItems,
  }))
}

export async function getBlueprintById(
  blueprintId: string,
): Promise<EventBlueprintSerialized | null> {
  const prisma = getPrismaClient()

  const bp = await prisma.eventBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      budgetItems: { orderBy: { sortOrder: "asc" } },
      runSheetItems: { orderBy: { sortOrder: "asc" } },
      timelineItems: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!bp) return null

  return {
    id: bp.id,
    name: bp.name,
    description: bp.description,
    category: bp.category,
    tags: bp.tags,
    isActive: bp.isActive,
    tasks: bp.tasks.map((t) => ({
      id: t.id,
      blueprintId: t.blueprintId,
      title: t.title,
      description: t.description,
      priority: t.priority as import("./types").TaskPriority,
      category: t.category,
      sortOrder: t.sortOrder,
    })),
    checklistItems: bp.checklistItems.map((ci) => ({
      id: ci.id,
      blueprintId: ci.blueprintId,
      title: ci.title,
      priority: ci.priority as import("./types").TaskPriority,
      category: ci.category as import("./types").ChecklistCategory,
      section: ci.section,
      sortOrder: ci.sortOrder,
    })),
    budgetItems: bp.budgetItems.map((bi) => ({
      id: bi.id,
      blueprintId: bi.blueprintId,
      category: bi.category as BudgetCategory,
      title: bi.title,
      estimatedCents: bi.estimatedCents,
      sortOrder: bi.sortOrder,
    })),
    runSheetItems: bp.runSheetItems.map((ri) => ({
      id: ri.id,
      blueprintId: ri.blueprintId,
      time: String(ri.time),
      title: ri.title,
      description: ri.description,
      durationMins: ri.durationMins,
      sortOrder: ri.sortOrder,
    })),
    timelineItems: bp.timelineItems.map((ti) => ({
      id: ti.id,
      blueprintId: ti.blueprintId,
      title: ti.title,
      description: ti.description,
      category: ti.category,
      daysBeforeEvent: ti.daysBeforeEvent,
      isMilestone: ti.isMilestone,
      sortOrder: ti.sortOrder,
    })),
  }
}
