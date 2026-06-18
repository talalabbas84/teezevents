"use client"

import { Fragment, useState, useTransition } from "react"
import {
  Users,
  CheckCircle2,
  Mail,
  Ban,
  UserPlus,
  Copy,
  Trash2,
  ChevronDown,
  Activity,
  Clock,
  Shield,
  Eye,
  Crown,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import {
  inviteTeamMember,
  updateTeamMemberRole,
  updateTeamMemberStatus,
  removeTeamMember,
} from "@/actions/team"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ─── Types ───────────────────────────────────────────────────────────────────

type MemberRole = "SUPER_ADMIN" | "ADMIN" | "PLANNER" | "VIEWER"
type MemberStatus = "INVITED" | "ACTIVE" | "DISABLED"

type TeamMemberSerialized = {
  id: string
  email: string
  name: string | null
  role: MemberRole
  status: MemberStatus
  invitedBy: string | null
  inviteToken: string | null
  lastActiveAt: string | null
  avatarColor: string | null
  createdAt: string
  activityCount?: number
}

type FilterState = "ALL" | MemberStatus

interface Props {
  members: TeamMemberSerialized[]
  currentAdminEmail: string
  currentAdmin: TeamMemberSerialized
  canManageTeam?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const ROLE_CONFIG: Record<
  MemberRole,
  { label: string; description: string; badgeClass: string; icon: React.ReactNode }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full access to all features including team management",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Crown className="h-3 w-3" />,
  },
  ADMIN: {
    label: "Admin",
    description: "Full planning access, cannot manage team",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    icon: <Shield className="h-3 w-3" />,
  },
  PLANNER: {
    label: "Planner",
    description: "Can create and edit events and planning data",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Settings className="h-3 w-3" />,
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to event planning",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <Eye className="h-3 w-3" />,
  },
}

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: MemberRole }) {
  const cfg = ROLE_CONFIG[role]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        cfg.badgeClass,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MemberStatus }) {
  if (status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    )
  if (status === "INVITED")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Invited
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Disabled
    </span>
  )
}

// ─── MemberAvatar ─────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  size = "md",
}: {
  member: TeamMemberSerialized
  size?: "sm" | "md" | "lg"
}) {
  const initials = getInitials(member.name, member.email)
  const color = member.avatarColor ?? "#c57a3a"
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm"
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        sizeClass,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

// ─── InviteDialog ─────────────────────────────────────────────────────────────

function InviteDialog({
  open,
  onClose,
  onInvited,
}: {
  open: boolean
  onClose: () => void
  onInvited: (member: TeamMemberSerialized, inviteLink: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<MemberRole>("PLANNER")
  const [inviteResult, setInviteResult] = useState<{ link: string } | null>(null)

  function handleClose() {
    setEmail("")
    setName("")
    setRole("PLANNER")
    setInviteResult(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await inviteTeamMember({ email: email.trim().toLowerCase(), name: name.trim() || undefined, role })
      if (!res.success) {
        toast.error(res.error ?? "Failed to invite member.")
        return
      }
      const link = `${window.location.origin}${(res as { success: true; data: { inviteLink: string; member: TeamMemberSerialized } }).data.inviteLink}`
      const member = (res as { success: true; data: { inviteLink: string; member: TeamMemberSerialized } }).data.member
      setInviteResult({ link })
      onInvited(member, link)
      toast.success(`Invitation created for ${email.trim().toLowerCase()}`)
    })
  }

  function copyLink() {
    if (!inviteResult) return
    navigator.clipboard
      .writeText(inviteResult.link)
      .then(() => toast.success("Invite link copied!"))
      .catch(() => toast.error("Failed to copy link."))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invite link to add someone to your team.
          </DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as MemberRole)}
                disabled={isPending}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["SUPER_ADMIN", "ADMIN", "PLANNER", "VIEWER"] as MemberRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <div className="font-medium">{ROLE_CONFIG[r].label}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_CONFIG[r].description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !email.trim()} className="bg-primary text-white hover:bg-primary/90">
                {isPending ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Invitation created! Copy and share the link below with your team member.
            </div>

            <div className="space-y-1.5">
              <Label>Invite Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteResult.link}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyLink}
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy and send this link to your team member. They will use it to set up their account.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-primary text-white hover:bg-primary/90">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isCurrentAdmin,
  canManageTeam,
  onRoleChange,
  onStatusToggle,
  onRemove,
}: {
  member: TeamMemberSerialized
  isCurrentAdmin: boolean
  canManageTeam: boolean
  onRoleChange: (id: string, role: MemberRole) => void
  onStatusToggle: (id: string, current: MemberStatus) => void
  onRemove: (member: TeamMemberSerialized) => void
}) {
  const [copyingLink, setCopyingLink] = useState(false)

  function copyInviteLink() {
    if (!member.inviteToken) return
    const link = `${window.location.origin}/admin/accept-invite?token=${member.inviteToken}`
    setCopyingLink(true)
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Invite link copied!"))
      .catch(() => toast.error("Failed to copy link."))
      .finally(() => setCopyingLink(false))
  }

  return (
    <Card className="border border-border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <MemberAvatar member={member} />
          <div className="min-w-0 flex-1">
            {member.name ? (
              <>
                <div className="truncate font-semibold">{member.name}</div>
                <div className="truncate text-xs text-muted-foreground">{member.email}</div>
              </>
            ) : (
              <div className="truncate font-semibold">{member.email}</div>
            )}
            {isCurrentAdmin && (
              <div className="mt-0.5 text-xs font-medium text-primary">(You)</div>
            )}
          </div>
          <StatusBadge status={member.status} />
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          {member.activityCount !== undefined && member.activityCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              {member.activityCount} actions
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {member.invitedBy && (
            <span className="truncate">Invited by {member.invitedBy}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(member.lastActiveAt)}
          </span>
        </div>

        {/* Actions */}
        {canManageTeam && !isCurrentAdmin && (
          <div className="mt-4 space-y-3 border-t border-border pt-3">
            {/* Role selector */}
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">Role</span>
              <Select
                value={member.role}
                onValueChange={(v) => onRoleChange(member.id, v as MemberRole)}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                  <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {(["SUPER_ADMIN", "ADMIN", "PLANNER", "VIEWER"] as MemberRole[]).map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {ROLE_CONFIG[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status toggle + actions */}
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">Active</span>
              <Switch
                checked={member.status === "ACTIVE"}
                onCheckedChange={() => onStatusToggle(member.id, member.status)}
                disabled={member.status === "INVITED"}
                title={member.status === "INVITED" ? "Member has not accepted invite yet" : undefined}
                className="data-[state=checked]:bg-emerald-500"
              />
              <div className="ml-auto flex items-center gap-1">
                {member.status === "INVITED" && member.inviteToken && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={copyInviteLink}
                    disabled={copyingLink}
                    title="Copy invite link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(member)}
                  title="Remove member"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  count,
  active,
  onClick,
  chipClass,
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
  chipClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
        active ? chipClass + " shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/30",
      )}
    >
      {icon}
      <span className="font-bold">{count}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamManagementClient({
  members: initialMembers,
  currentAdminEmail,
  currentAdmin,
  canManageTeam = false,
}: Props) {
  const [members, setMembers] = useState<TeamMemberSerialized[]>(initialMembers)
  const [filter, setFilter] = useState<FilterState>("ALL")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberSerialized | null>(null)
  const [isPending, startTransition] = useTransition()

  // All members including the env-based current admin shown at top
  const allMembers = [currentAdmin, ...members.filter((m) => m.email !== currentAdminEmail)]

  const stats = {
    total: allMembers.length,
    active: allMembers.filter((m) => m.status === "ACTIVE").length,
    invited: allMembers.filter((m) => m.status === "INVITED").length,
    disabled: allMembers.filter((m) => m.status === "DISABLED").length,
  }

  const filteredMembers =
    filter === "ALL" ? allMembers : allMembers.filter((m) => m.status === filter)

  function handleInvited(newMember: TeamMemberSerialized, _link: string) {
    if (!canManageTeam) return
    setMembers((prev) => [newMember, ...prev])
  }

  function handleRoleChange(id: string, role: MemberRole) {
    if (!canManageTeam) return
    startTransition(async () => {
      const prev = members.find((m) => m.id === id)
      // Optimistic update
      setMembers((list) => list.map((m) => (m.id === id ? { ...m, role } : m)))
      const res = await updateTeamMemberRole(id, role)
      if (!res.success) {
        toast.error(res.error ?? "Failed to update role.")
        // Revert
        if (prev) setMembers((list) => list.map((m) => (m.id === id ? prev : m)))
      } else {
        toast.success("Role updated.")
      }
    })
  }

  function handleStatusToggle(id: string, current: MemberStatus) {
    if (!canManageTeam) return
    if (current === "INVITED") return
    const next: "ACTIVE" | "DISABLED" = current === "ACTIVE" ? "DISABLED" : "ACTIVE"
    startTransition(async () => {
      setMembers((list) => list.map((m) => (m.id === id ? { ...m, status: next } : m)))
      const res = await updateTeamMemberStatus(id, next)
      if (!res.success) {
        toast.error(res.error ?? "Failed to update status.")
        setMembers((list) => list.map((m) => (m.id === id ? { ...m, status: current } : m)))
      } else {
        toast.success(`Member ${next === "ACTIVE" ? "enabled" : "disabled"}.`)
      }
    })
  }

  function handleRemoveConfirm() {
    if (!canManageTeam) return
    if (!memberToRemove) return
    const target = memberToRemove
    setMemberToRemove(null)
    startTransition(async () => {
      setMembers((list) => list.filter((m) => m.id !== target.id))
      const res = await removeTeamMember(target.id)
      if (!res.success) {
        toast.error(res.error ?? "Failed to remove member.")
        setMembers((list) => [...list, target])
      } else {
        toast.success(`${target.name ?? target.email} removed.`)
      }
    })
  }

  return (
    <>
      {/* Stats + Invite row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatChip
            icon={<Users className="h-4 w-4" />}
            label="Total"
            count={stats.total}
            active={filter === "ALL"}
            onClick={() => setFilter("ALL")}
            chipClass="border-primary/30 bg-primary/10 text-primary"
          />
          <StatChip
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Active"
            count={stats.active}
            active={filter === "ACTIVE"}
            onClick={() => setFilter("ACTIVE")}
            chipClass="border-emerald-300 bg-emerald-50 text-emerald-700"
          />
          <StatChip
            icon={<Mail className="h-4 w-4" />}
            label="Invited"
            count={stats.invited}
            active={filter === "INVITED"}
            onClick={() => setFilter("INVITED")}
            chipClass="border-amber-300 bg-amber-50 text-amber-700"
          />
          <StatChip
            icon={<Ban className="h-4 w-4" />}
            label="Disabled"
            count={stats.disabled}
            active={filter === "DISABLED"}
            onClick={() => setFilter("DISABLED")}
            chipClass="border-gray-300 bg-gray-100 text-gray-600"
          />
        </div>

        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-primary text-white hover:bg-primary/90"
          disabled={isPending || !canManageTeam}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Members grid */}
      {filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-serif text-lg font-bold text-muted-foreground">
            {filter === "ALL" ? "No team members yet." : `No ${filter.toLowerCase()} members.`}
          </p>
          {filter === "ALL" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Invite your first team member to start collaborating.
            </p>
          )}
          {filter !== "ALL" && (
            <button
              onClick={() => setFilter("ALL")}
              className="mt-2 text-sm text-primary hover:underline"
            >
              View all members
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrentAdmin={member.email === currentAdminEmail}
              canManageTeam={canManageTeam}
              onRoleChange={handleRoleChange}
              onStatusToggle={handleStatusToggle}
              onRemove={setMemberToRemove}
            />
          ))}
        </div>
      )}

      {/* Role hierarchy info */}
      <Card className="border border-border">
        <CardContent className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Role Hierarchy
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {(["SUPER_ADMIN", "ADMIN", "PLANNER", "VIEWER"] as MemberRole[]).map((r, i, arr) => (
              <Fragment key={r}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    ROLE_CONFIG[r].badgeClass,
                  )}
                >
                  {ROLE_CONFIG[r].icon}
                  {ROLE_CONFIG[r].label}
                </span>
                {i < arr.length - 1 && (
                  <span key={r + "-arrow"} className="text-muted-foreground">
                    &rsaquo;
                  </span>
                )}
              </Fragment>
            ))}
          </div>
          <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {(["SUPER_ADMIN", "ADMIN", "PLANNER", "VIEWER"] as MemberRole[]).map((r) => (
              <div key={r} className="flex items-start gap-1.5">
                <span className="font-semibold text-foreground">{ROLE_CONFIG[r].label}:</span>
                <span>{ROLE_CONFIG[r].description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />

      {/* Remove confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(v) => { if (!v) setMemberToRemove(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{memberToRemove?.name ?? memberToRemove?.email}</strong> from the team. They
              will lose all access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
