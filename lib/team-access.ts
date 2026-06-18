import "server-only"

import { getPrismaClient } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin-auth"

export type TeamRole = "SUPER_ADMIN" | "ADMIN" | "PLANNER" | "VIEWER"
export type EventAccessLevel = "VIEW" | "COMMENT" | "EDIT" | "MANAGE"

export type TeamContext = {
  id: string
  email: string
  name: string | null
  role: TeamRole
  status: "ACTIVE"
  isBootstrapAdmin: boolean
}

const ROLE_RANK: Record<TeamRole, number> = {
  VIEWER: 10,
  PLANNER: 20,
  ADMIN: 30,
  SUPER_ADMIN: 40,
}

const EVENT_ACCESS_RANK: Record<EventAccessLevel, number> = {
  VIEW: 10,
  COMMENT: 20,
  EDIT: 30,
  MANAGE: 40,
}

export function canManageTeam(role: TeamRole) {
  return ROLE_RANK[role] >= ROLE_RANK.SUPER_ADMIN
}

export function canManageEvent(role: TeamRole) {
  return ROLE_RANK[role] >= ROLE_RANK.ADMIN
}

export async function getCurrentTeamContext(): Promise<TeamContext> {
  const session = await requireAdminSession()
  const email = session.email.trim().toLowerCase()
  const bootstrapAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()

  if (email === bootstrapAdminEmail) {
    return {
      id: "bootstrap-admin",
      email,
      name: null,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isBootstrapAdmin: true,
    }
  }

  const prisma = getPrismaClient()
  const member = await prisma.teamMember.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, status: true },
  })

  if (!member || member.status !== "ACTIVE") {
    throw new Error("Team member is not active.")
  }

  return {
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role as TeamRole,
    status: "ACTIVE",
    isBootstrapAdmin: false,
  }
}

export async function requireTeamRole(roles: TeamRole[]) {
  const context = await getCurrentTeamContext()

  if (!roles.includes(context.role)) {
    throw new Error("You do not have permission to perform this action.")
  }

  return context
}

export async function requireEventAccess(eventId: string, minimumAccess: EventAccessLevel) {
  const context = await getCurrentTeamContext()

  if (canManageEvent(context.role)) {
    return context
  }

  const prisma = getPrismaClient()
  const access = context.isBootstrapAdmin
    ? null
    : await prisma.eventTeamAccess.findUnique({
        where: {
          eventId_memberId: {
            eventId,
            memberId: context.id,
          },
        },
        select: { accessLevel: true },
      })

  const accessLevel = access?.accessLevel as EventAccessLevel | undefined
  if (accessLevel && EVENT_ACCESS_RANK[accessLevel] >= EVENT_ACCESS_RANK[minimumAccess]) {
    return context
  }

  throw new Error("You do not have access to this event workspace.")
}
