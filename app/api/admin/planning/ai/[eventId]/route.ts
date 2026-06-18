import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { eventId } = await params
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI assistant is not configured. Set ANTHROPIC_API_KEY environment variable." }, { status: 503 })
  }

  const { messages } = await request.json() as { messages: { role: "user" | "assistant"; content: string }[] }

  const prisma = getPrismaClient()

  // Fetch event context
  const [event, tasks, risks, vendors, budget] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true, startsAt: true, endsAt: true, venue: true, expectedAttendance: true, budgetTotalCents: true, internalNotes: true, planningStatus: true } }),
    prisma.planningTask.findMany({ where: { eventId }, select: { title: true, status: true, priority: true, dueDate: true }, take: 20 }),
    prisma.risk.findMany({ where: { eventId }, select: { title: true, severity: true, status: true }, take: 10 }),
    prisma.eventVendor.findMany({ where: { eventId }, select: { name: true, vendorType: true, status: true }, take: 10 }),
    prisma.budgetItem.findMany({ where: { eventId }, select: { title: true, estimatedCents: true, actualCents: true, category: true }, take: 10 }),
  ])

  const eventContext = event ? `
EVENT DETAILS:
- Name: ${event.title}
- Date: ${event.startsAt ? new Date(event.startsAt).toLocaleDateString() : "TBD"}
- Venue: ${event.venue || "TBD"}
- Expected Attendance: ${event.expectedAttendance || "Unknown"}
- Planning Status: ${event.planningStatus}
- Budget: ${event.budgetTotalCents ? `$${(event.budgetTotalCents / 100).toFixed(0)} CAD` : "Not set"}
${event.internalNotes ? `- Notes: ${event.internalNotes}` : ""}

CURRENT TASKS (${tasks.length}):
${tasks.map(t => `- [${t.status}] ${t.title} (${t.priority})`).join("\n") || "No tasks yet"}

RISKS (${risks.length}):
${risks.map(r => `- [${r.status}] ${r.title} (${r.severity})`).join("\n") || "No risks identified"}

VENDORS (${vendors.length}):
${vendors.map(v => `- ${v.name} (${v.vendorType}) - ${v.status}`).join("\n") || "No vendors added"}

BUDGET ITEMS (${budget.length}):
${budget.map(b => `- ${b.title}: $${((b.estimatedCents || 0) / 100).toFixed(0)} estimated`).join("\n") || "No budget items"}
` : "Event not found."

  const systemPrompt = `You are an expert event planning AI assistant for TEEZ Events, a premium event management platform. You help event planners with:

1. **Task Planning**: Generate detailed, actionable task lists organized by category (Venue, Catering, Marketing, Staffing, Technology, etc.)
2. **Checklist Creation**: Create comprehensive checklists for pre-event, day-of, and post-event phases
3. **Risk Assessment**: Identify potential risks with severity levels and mitigation strategies
4. **Timeline Planning**: Create realistic timelines with milestones and deadlines
5. **Budget Guidance**: Help allocate budget across categories and identify cost-saving opportunities
6. **Vendor Recommendations**: Suggest vendor types and key questions to ask vendors
7. **Progress Analysis**: Analyze current planning progress and highlight gaps

Here is the current event context:
${eventContext}

RESPONSE GUIDELINES:
- Be specific and actionable, not generic
- Use markdown formatting for readability (headers, bullet points, bold)
- When generating tasks, use this format: **[CATEGORY]** - Task description
- When identifying risks, use this format: **[SEVERITY]** - Risk description | Mitigation: strategy
- Keep responses concise but comprehensive
- Always tailor advice to the specific event type and scale`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `AI API error: ${response.status} - ${err}` }, { status: 502 })
    }

    const data = await response.json() as { content: { type: string; text: string }[]; usage: { input_tokens: number; output_tokens: number } }
    const text = data.content.find(c => c.type === "text")?.text ?? ""

    return NextResponse.json({ message: text, usage: data.usage })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
