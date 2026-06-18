// Planning domain — serialized (JSON-safe) types and dashboard aggregation shape

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "NEEDS_REVIEW"
  | "COMPLETED"
  | "CANCELLED"

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export type ChecklistCategory =
  | "VENUE"
  | "VENDORS"
  | "MARKETING"
  | "TICKETING"
  | "STAFF"
  | "PERFORMERS"
  | "BUDGET"
  | "LEGAL"
  | "SOUND_LIGHTS"
  | "SECURITY"
  | "DECORATIONS"
  | "FOOD_DRINKS"
  | "DAY_OF_EVENT"
  | "POST_EVENT"
  | "GENERAL"

export type BudgetCategory =
  | "VENUE"
  | "DJ_MUSIC"
  | "PERFORMERS"
  | "STAFF"
  | "MARKETING"
  | "DECORATIONS"
  | "FOOD_DRINKS"
  | "SECURITY"
  | "EQUIPMENT"
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "MISCELLANEOUS"

export type BudgetItemStatus =
  | "ESTIMATED"
  | "CONFIRMED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"

export type VendorType =
  | "VENUE"
  | "DJ"
  | "PHOTOGRAPHER"
  | "VIDEOGRAPHER"
  | "SECURITY"
  | "CATERING"
  | "DECOR"
  | "LIGHTING"
  | "SOUND"
  | "PERFORMER"
  | "SPONSOR"
  | "OTHER"

export type VendorStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "REJECTED"

export type RunSheetStatus =
  | "UPCOMING"
  | "IN_PROGRESS"
  | "DONE"
  | "DELAYED"
  | "CANCELLED"

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type RiskProbability =
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "ALMOST_CERTAIN"

export type RiskStatus = "OPEN" | "MITIGATED" | "RESOLVED" | "ACCEPTED"

// ─── Serialized entity types ──────────────────────────────────────────────────

export type TaskCommentSerialized = {
  id: string
  taskId: string
  authorEmail: string
  body: string
  createdAt: string
}

export type PlanningTaskSerialized = {
  id: string
  eventId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  category: string | null
  assignedTo: string | null
  assigneeEmails: string[]
  dueDate: string | null
  completedAt: string | null
  sortOrder: number
  parentTaskId: string | null
  subtasks: PlanningTaskSerialized[]
  commentCount: number
  blueprintTaskId: string | null
  createdAt: string
  updatedAt: string
}

export type ChecklistItemSerialized = {
  id: string
  checklistId: string
  sectionId: string | null
  title: string
  notes: string | null
  assignedTo: string | null
  dueDate: string | null
  priority: TaskPriority
  isCompleted: boolean
  completedAt: string | null
  completedBy: string | null
  sortOrder: number
}

export type ChecklistSectionSerialized = {
  id: string
  checklistId: string
  title: string
  sortOrder: number
  items: ChecklistItemSerialized[]
}

export type ChecklistSerialized = {
  id: string
  eventId: string
  title: string
  category: ChecklistCategory
  description: string | null
  sortOrder: number
  sections: ChecklistSectionSerialized[]
  items: ChecklistItemSerialized[]
}

export type BudgetItemSerialized = {
  id: string
  eventId: string
  category: BudgetCategory
  title: string
  description: string | null
  estimatedCents: number
  actualCents: number
  paidCents: number
  status: BudgetItemStatus
  vendorName: string | null
  assignedTo: string | null
  receiptUrl: string | null
  notes: string | null
  dueDate: string | null
}

export type EventVendorSerialized = {
  id: string
  eventId: string
  vendorType: VendorType
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  website: string | null
  status: VendorStatus
  confirmedAt: string | null
  contractUrl: string | null
  quoteCents: number | null
  paidCents: number
  notes: string | null
  rating: number | null
}

export type RunSheetItemSerialized = {
  id: string
  eventId: string
  time: string
  title: string
  description: string | null
  ownerName: string | null
  location: string | null
  durationMins: number | null
  status: RunSheetStatus
  notes: string | null
  sortOrder: number
}

export type PlanningTimelineItemSerialized = {
  id: string
  eventId: string
  title: string
  description: string | null
  category: string | null
  dueDate: string
  isMilestone: boolean
  isCompleted: boolean
  completedAt: string | null
  assignedTo: string | null
  sortOrder: number
}

export type RiskSerialized = {
  id: string
  eventId: string
  title: string
  description: string | null
  category: string | null
  severity: RiskSeverity
  probability: RiskProbability
  status: RiskStatus
  mitigationPlan: string | null
  assignedTo: string | null
  resolvedAt: string | null
}

export type PlanningActivityLogSerialized = {
  id: string
  eventId: string | null
  actorEmail: string
  action: string
  entityType: string | null
  entityId: string | null
  entityName: string | null
  details: unknown | null
  createdAt: string
}

// ─── Blueprint types ──────────────────────────────────────────────────────────

export type BlueprintTaskSerialized = {
  id: string
  blueprintId: string
  title: string
  description: string | null
  priority: TaskPriority
  category: string | null
  sortOrder: number
}

export type BlueprintChecklistItemSerialized = {
  id: string
  blueprintId: string
  title: string
  priority: TaskPriority
  category: ChecklistCategory
  section: string | null
  sortOrder: number
}

export type BlueprintBudgetItemSerialized = {
  id: string
  blueprintId: string
  category: BudgetCategory
  title: string
  estimatedCents: number
  sortOrder: number
}

export type BlueprintRunSheetItemSerialized = {
  id: string
  blueprintId: string
  time: string
  title: string
  description: string | null
  durationMins: number | null
  sortOrder: number
}

export type BlueprintTimelineItemSerialized = {
  id: string
  blueprintId: string
  title: string
  description: string | null
  category: string | null
  daysBeforeEvent: number
  isMilestone: boolean
  sortOrder: number
}

export type EventBlueprintSerialized = {
  id: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  isActive: boolean
  tasks: BlueprintTaskSerialized[]
  checklistItems: BlueprintChecklistItemSerialized[]
  budgetItems: BlueprintBudgetItemSerialized[]
  runSheetItems: BlueprintRunSheetItemSerialized[]
  timelineItems: BlueprintTimelineItemSerialized[]
}

export type BlueprintSummary = {
  id: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  taskCount: number
  checklistItemCount: number
  budgetItemCount: number
}

// ─── Dashboard aggregation ────────────────────────────────────────────────────

export type PlanningDashboardData = {
  tasks: {
    total: number
    byStatus: Record<TaskStatus, number>
    overdueTasks: PlanningTaskSerialized[]
  }
  checklists: {
    total: number
    totalItems: number
    completedItems: number
  }
  budget: {
    totalEstimatedCents: number
    totalActualCents: number
    totalPaidCents: number
    byCategory: Record<BudgetCategory, { estimatedCents: number; actualCents: number }>
  }
  vendors: {
    total: number
    byStatus: Record<VendorStatus, number>
  }
  risks: {
    total: number
    byStatus: Record<RiskStatus, number>
    bySeverity: Record<RiskSeverity, number>
  }
  runSheet: {
    total: number
    byStatus: Record<RunSheetStatus, number>
  }
  timeline: {
    total: number
    upcoming: PlanningTimelineItemSerialized[]
    overdue: PlanningTimelineItemSerialized[]
  }
  recentActivity: PlanningActivityLogSerialized[]
}
