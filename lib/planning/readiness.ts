import "server-only"

import { getPrismaClient } from "@/lib/prisma"

export async function calculateReadinessScore(eventId: string): Promise<{
  score: number
  breakdown: {
    tasks: { score: number; label: string; detail: string }
    checklists: { score: number; label: string; detail: string }
    budget: { score: number; label: string; detail: string }
    vendors: { score: number; label: string; detail: string }
    runSheet: { score: number; label: string; detail: string }
    risks: { score: number; label: string; detail: string }
  }
}> {
  const prisma = getPrismaClient()

  const [
    taskCounts,
    checklistCounts,
    budgetCounts,
    vendorCounts,
    runSheetCount,
    riskCounts,
  ] = await Promise.all([
    // Tasks: total vs completed (COMPLETED status)
    prisma.planningTask.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),

    // Checklist items: total vs completed
    prisma.checklistItem.groupBy({
      by: ["isCompleted"],
      where: { checklist: { eventId } },
      _count: { _all: true },
    }),

    // Budget items: total vs confirmed/paid
    prisma.budgetItem.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),

    // Vendors: total vs confirmed
    prisma.eventVendor.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),

    // Run sheet: just need a count > 0
    prisma.runSheetItem.count({
      where: { eventId },
    }),

    // Risks: total vs resolved/mitigated
    prisma.risk.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),
  ])

  // ── Tasks (20 pts) ──────────────────────────────────────────────────────────
  const totalTasks = taskCounts.reduce((sum, r) => sum + r._count._all, 0)
  const completedTasks =
    taskCounts.find((r) => r.status === "COMPLETED")?._count._all ?? 0
  const tasksScore = (completedTasks / Math.max(totalTasks, 1)) * 20

  // ── Checklists (20 pts) ─────────────────────────────────────────────────────
  const totalChecklistItems = checklistCounts.reduce(
    (sum, r) => sum + r._count._all,
    0,
  )
  const completedChecklistItems =
    checklistCounts.find((r) => r.isCompleted === true)?._count._all ?? 0
  const checklistsScore =
    (completedChecklistItems / Math.max(totalChecklistItems, 1)) * 20

  // ── Budget (15 pts) ─────────────────────────────────────────────────────────
  const totalBudgetItems = budgetCounts.reduce((sum, r) => sum + r._count._all, 0)
  const confirmedOrPaidItems = budgetCounts
    .filter((r) => r.status === "CONFIRMED" || r.status === "PAID")
    .reduce((sum, r) => sum + r._count._all, 0)
  const budgetScore =
    totalBudgetItems > 0
      ? (confirmedOrPaidItems / totalBudgetItems) * 15
      : 0

  // ── Vendors (20 pts) ────────────────────────────────────────────────────────
  const totalVendors = vendorCounts.reduce((sum, r) => sum + r._count._all, 0)
  const confirmedVendors =
    vendorCounts.find((r) => r.status === "CONFIRMED")?._count._all ?? 0
  const vendorsScore = (confirmedVendors / Math.max(totalVendors, 1)) * 20

  // ── Run Sheet (15 pts) ──────────────────────────────────────────────────────
  const runSheetScore = runSheetCount > 0 ? 15 : 0

  // ── Risks (10 pts) ──────────────────────────────────────────────────────────
  const totalRisks = riskCounts.reduce((sum, r) => sum + r._count._all, 0)
  const resolvedOrMitigatedRisks = riskCounts
    .filter((r) => r.status === "RESOLVED" || r.status === "MITIGATED")
    .reduce((sum, r) => sum + r._count._all, 0)
  // No risks = full marks
  const risksScore =
    totalRisks === 0
      ? 10
      : (resolvedOrMitigatedRisks / totalRisks) * 10

  // ── Total ───────────────────────────────────────────────────────────────────
  const rawScore =
    tasksScore +
    checklistsScore +
    budgetScore +
    vendorsScore +
    runSheetScore +
    risksScore

  const score = Math.min(100, Math.max(0, Math.round(rawScore)))

  return {
    score,
    breakdown: {
      tasks: {
        score: Math.round(tasksScore),
        label: "Tasks",
        detail:
          totalTasks === 0
            ? "No tasks added"
            : `${completedTasks} of ${totalTasks} completed`,
      },
      checklists: {
        score: Math.round(checklistsScore),
        label: "Checklists",
        detail:
          totalChecklistItems === 0
            ? "No checklist items added"
            : `${completedChecklistItems} of ${totalChecklistItems} items checked`,
      },
      budget: {
        score: Math.round(budgetScore),
        label: "Budget",
        detail:
          totalBudgetItems === 0
            ? "No budget items added"
            : `${confirmedOrPaidItems} of ${totalBudgetItems} items confirmed or paid`,
      },
      vendors: {
        score: Math.round(vendorsScore),
        label: "Vendors",
        detail:
          totalVendors === 0
            ? "No vendors added"
            : `${confirmedVendors} of ${totalVendors} confirmed`,
      },
      runSheet: {
        score: runSheetScore,
        label: "Run Sheet",
        detail:
          runSheetCount > 0
            ? `${runSheetCount} run sheet item${runSheetCount === 1 ? "" : "s"} added`
            : "No run sheet items added",
      },
      risks: {
        score: Math.round(risksScore),
        label: "Risks",
        detail:
          totalRisks === 0
            ? "No risks logged"
            : `${resolvedOrMitigatedRisks} of ${totalRisks} resolved or mitigated`,
      },
    },
  }
}
