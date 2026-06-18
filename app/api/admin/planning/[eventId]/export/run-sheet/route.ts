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
    prisma.runSheetItem.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  const headers = ["Time", "Duration (mins)", "Title", "Description", "Assigned To", "Location", "Status", "Notes"]
  const rows = items.map((item) => [
    item.time || "",
    item.durationMins != null ? String(item.durationMins) : "",
    item.title || "",
    (item.description || "").replace(/"/g, '""'),
    item.ownerName || "",
    item.location || "",
    item.status || "",
    (item.notes || "").replace(/"/g, '""'),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n")

  const filename = `run-sheet-${event?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || eventId}-${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
