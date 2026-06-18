import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTeamContext } from "@/lib/team-access"
import { TeamManagementClient } from "@/components/admin/team-management-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function entityBadgeVariant(entityType: string | null) {
  switch (entityType) {
    case "task":
    case "PlanningTask":
      return "secondary"
    case "vendor":
    case "EventVendor":
      return "outline"
    case "budget":
    case "BudgetItem":
      return "outline"
    case "checklist":
    case "Checklist":
      return "secondary"
    default:
      return "outline"
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTeamPage() {
  const currentUser = await getCurrentTeamContext()
  const db = getPrismaClient()

  const [members, activityLogs, activityCounts] = await Promise.all([
    db.teamMember.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.planningActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
    }),
    db.planningActivityLog.groupBy({
      by: ["actorEmail"],
      _count: { id: true },
    }),
  ])

  const activityCountByEmail = new Map(
    activityCounts.map((row) => [row.actorEmail, row._count.id]),
  )
  const currentMember = members.find((member) => member.email === currentUser.email)

  const serializeMember = (member: (typeof members)[number]) => ({
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    status: member.status,
    invitedBy: member.invitedBy,
    inviteToken: member.inviteToken,
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    avatarColor: member.avatarColor,
    createdAt: member.createdAt.toISOString(),
    activityCount: activityCountByEmail.get(member.email) ?? 0,
  })

  const serializedMembers = members.map(serializeMember)
  const currentAdmin =
    currentMember
      ? serializeMember(currentMember)
      : {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          status: currentUser.status,
          invitedBy: null,
          inviteToken: null,
          lastActiveAt: new Date().toISOString(),
          avatarColor: "#c57a3a",
          createdAt: new Date().toISOString(),
          activityCount: activityCountByEmail.get(currentUser.email) ?? 0,
        }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Team</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your team and review recent activity.
          </p>
        </div>

        {/* Current admin card */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-4 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Current Admin</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Your Account</h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 px-5 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-serif text-xl font-bold text-primary">
                {currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{currentUser.email}</div>
                <div className="text-sm text-muted-foreground">{currentUser.role.replace("_", " ")}</div>
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Team members */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-4 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Team</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Team Members</h2>
            </div>
            <TeamManagementClient
              members={serializedMembers}
              currentAdminEmail={currentUser.email}
              currentAdmin={currentAdmin}
              canManageTeam={currentUser.role === "SUPER_ADMIN"}
            />
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-4 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Activity</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Recent Activity</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Last 20 planning actions across all events.</p>
            </div>

            {activityLogs.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/10 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/30">
                      <TableHead className="font-semibold">Actor</TableHead>
                      <TableHead className="font-semibold">Action</TableHead>
                      <TableHead className="font-semibold">Entity</TableHead>
                      <TableHead className="font-semibold">Event</TableHead>
                      <TableHead className="font-semibold">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id} className="border-border hover:bg-muted/10">
                        <TableCell className="max-w-[180px] truncate text-sm font-medium">
                          {log.actorEmail}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entityType || log.entityName ? (
                            <div className="flex items-center gap-1.5">
                              {log.entityType && (
                                <Badge
                                  variant={entityBadgeVariant(log.entityType)}
                                  className="text-xs"
                                >
                                  {log.entityType}
                                </Badge>
                              )}
                              {log.entityName && (
                                <span className="truncate max-w-[120px] text-muted-foreground text-xs">
                                  {log.entityName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                          {log.event ? (
                            <a
                              href={`/admin/planning/${log.event.id}`}
                              className="text-primary hover:underline"
                            >
                              {log.event.title}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {timeAgo(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
