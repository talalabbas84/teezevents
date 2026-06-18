import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { eventId } = await params
  const prisma = getPrismaClient()

  const [event, items] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
    prisma.budgetItem.findMany({
      where: { eventId },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
  ])

  const headers = ["Name", "Category", "Status", "Vendor", "Estimated (CAD)", "Actual (CAD)", "Variance (CAD)", "Notes"]
  const rows = items.map((item) => {
    const estimated = (item.estimatedCents || 0) / 100
    const actual = (item.actualCents || 0) / 100
    return [
      item.title,
      item.category || "",
      item.status || "",
      item.vendorName || "",
      estimated.toFixed(2),
      actual.toFixed(2),
      (actual - estimated).toFixed(2),
      (item.notes || "").replace(/"/g, '""'),
    ]
  })

  // Add total row
  const totalEstimated = items.reduce((s, i) => s + (i.estimatedCents || 0), 0) / 100
  const totalActual = items.reduce((s, i) => s + (i.actualCents || 0), 0) / 100
  rows.push([
    "TOTAL",
    "",
    "",
    "",
    totalEstimated.toFixed(2),
    totalActual.toFixed(2),
    (totalActual - totalEstimated).toFixed(2),
    "",
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n")

  const filename = `budget-${event?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || eventId}-${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
