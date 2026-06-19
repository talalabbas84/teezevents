"use server"

import { z } from "zod"
import { getPrismaClient } from "@/lib/prisma"
import { createAdminSession, hashPassword } from "@/lib/admin-auth"
import { requireTeamRole, type EventAccessLevel, type TeamRole } from "@/lib/team-access"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"
import { randomBytes } from "crypto"

const TEAM_ROLES = ["SUPER_ADMIN", "ADMIN", "PLANNER", "VIEWER"] as const
const EVENT_ACCESS_LEVELS = ["VIEW", "COMMENT", "EDIT", "MANAGE"] as const

function emitEventAccessRealtime(eventId: string, action: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType: "EventTeamAccess",
    entityId,
  })
}

// Generate a random invite token
function generateInviteToken(): string {
  return randomBytes(32).toString("hex")
}

// Generate a deterministic avatar color from email
function getAvatarColor(email: string): string {
  const colors = [
    "#c57a3a",
    "#8B4513",
    "#A0522D",
    "#CD853F",
    "#D2691E",
    "#6B8E23",
    "#2E8B57",
    "#4682B4",
    "#6A5ACD",
    "#9370DB",
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export async function inviteTeamMember(data: {
  email: string
  name?: string
  role: TeamRole
}) {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN"])
    z.object({
      email: z.string().email(),
      name: z.string().max(100).optional(),
      role: z.enum(TEAM_ROLES),
    }).parse(data)

    const email = data.email.trim().toLowerCase()
    const prisma = getPrismaClient()
    const existing = await prisma.teamMember.findUnique({ where: { email } })
    if (existing) return { success: false, error: "A team member with this email already exists." }

    const inviteToken = generateInviteToken()
    const member = await prisma.teamMember.create({
      data: {
        email,
        name: data.name?.trim() || undefined,
        role: data.role,
        status: "INVITED",
        invitedBy: session.email,
        inviteToken,
        avatarColor: getAvatarColor(email),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        invitedBy: true,
        inviteToken: true,
        lastActiveAt: true,
        avatarColor: true,
        createdAt: true,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        actorEmail: session.email,
        action: "INVITED_TEAM_MEMBER",
        entityType: "TeamMember",
        entityId: member.id,
        entityName: member.email,
        details: { role: member.role },
      },
    })

    revalidatePath("/admin/team")
    const inviteLink = `/admin/accept-invite?token=${inviteToken}`
    return {
      success: true,
      data: {
        member: {
          ...member,
          lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
          createdAt: member.createdAt.toISOString(),
        },
        inviteLink,
      },
    }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateTeamMemberRole(memberId: string, role: TeamRole) {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN"])
    const prisma = getPrismaClient()
    const updated = await prisma.teamMember.update({ where: { id: memberId }, data: { role } })
    await prisma.planningActivityLog.create({
      data: {
        actorEmail: session.email,
        action: "UPDATED_TEAM_ROLE",
        entityType: "TeamMember",
        entityId: updated.id,
        entityName: updated.email,
        details: { role },
      },
    })
    revalidatePath("/admin/team")
    return { success: true, data: updated }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateTeamMemberStatus(memberId: string, status: "ACTIVE" | "DISABLED") {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN"])
    const prisma = getPrismaClient()
    const updated = await prisma.teamMember.update({ where: { id: memberId }, data: { status } })
    await prisma.planningActivityLog.create({
      data: {
        actorEmail: session.email,
        action: "UPDATED_TEAM_STATUS",
        entityType: "TeamMember",
        entityId: updated.id,
        entityName: updated.email,
        details: { status },
      },
    })
    revalidatePath("/admin/team")
    return { success: true, data: updated }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function removeTeamMember(memberId: string) {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN"])
    const prisma = getPrismaClient()
    const existing = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { email: true } })
    await prisma.teamMember.delete({ where: { id: memberId } })
    await prisma.planningActivityLog.create({
      data: {
        actorEmail: session.email,
        action: "REMOVED_TEAM_MEMBER",
        entityType: "TeamMember",
        entityId: memberId,
        entityName: existing?.email ?? memberId,
      },
    })
    revalidatePath("/admin/team")
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateTeamMemberName(memberId: string, name: string) {
  try {
    await requireTeamRole(["SUPER_ADMIN"])
    const prisma = getPrismaClient()
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { name: name.trim() || null },
    })
    revalidatePath("/admin/team")
    return { success: true, data: updated }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function acceptTeamInvite(data: {
  token: string
  name?: string
  password: string
}) {
  try {
    const parsed = z.object({
      token: z.string().min(16),
      name: z.string().max(100).optional(),
      password: z.string().min(8, "Password must be at least 8 characters."),
    }).parse(data)

    const prisma = getPrismaClient()
    const member = await prisma.teamMember.findUnique({
      where: { inviteToken: parsed.token },
      select: { id: true, email: true, status: true },
    })

    if (!member || member.status !== "INVITED") {
      return { success: false, error: "This invite link is invalid or has already been used." }
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        name: parsed.name?.trim() || undefined,
        passwordHash: hashPassword(parsed.password),
        status: "ACTIVE",
        inviteToken: null,
        lastActiveAt: new Date(),
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        actorEmail: updated.email,
        action: "ACCEPTED_TEAM_INVITE",
        entityType: "TeamMember",
        entityId: updated.id,
        entityName: updated.email,
      },
    })

    await createAdminSession(updated.email)
    revalidatePath("/admin/team")
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function grantEventAccess(data: {
  eventId: string
  memberId: string
  accessLevel: EventAccessLevel
  canManageBudget?: boolean
  canManageTeam?: boolean
}) {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN", "ADMIN"])
    const parsed = z.object({
      eventId: z.string().min(1),
      memberId: z.string().min(1),
      accessLevel: z.enum(EVENT_ACCESS_LEVELS),
      canManageBudget: z.boolean().optional(),
      canManageTeam: z.boolean().optional(),
    }).parse(data)

    const prisma = getPrismaClient()
    const access = await prisma.eventTeamAccess.upsert({
      where: {
        eventId_memberId: {
          eventId: parsed.eventId,
          memberId: parsed.memberId,
        },
      },
      update: {
        accessLevel: parsed.accessLevel,
        canManageBudget: parsed.canManageBudget ?? false,
        canManageTeam: session.role === "SUPER_ADMIN" ? parsed.canManageTeam ?? false : false,
      },
      create: {
        eventId: parsed.eventId,
        memberId: parsed.memberId,
        accessLevel: parsed.accessLevel,
        canManageBudget: parsed.canManageBudget ?? false,
        canManageTeam: session.role === "SUPER_ADMIN" ? parsed.canManageTeam ?? false : false,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId: parsed.eventId,
        actorEmail: session.email,
        action: "GRANTED_EVENT_ACCESS",
        entityType: "EventTeamAccess",
        entityId: access.id,
        details: { memberId: parsed.memberId, accessLevel: parsed.accessLevel },
      },
    })

    revalidatePath("/admin/team")
    revalidatePath(`/admin/planning/${parsed.eventId}/collaboration`)
    emitEventAccessRealtime(parsed.eventId, "EVENT_ACCESS_GRANTED", access.id)
    return { success: true, data: access }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function revokeEventAccess(eventId: string, memberId: string) {
  try {
    const session = await requireTeamRole(["SUPER_ADMIN", "ADMIN"])
    const prisma = getPrismaClient()
    await prisma.eventTeamAccess.delete({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "REVOKED_EVENT_ACCESS",
        entityType: "EventTeamAccess",
        details: { memberId },
      },
    })

    revalidatePath("/admin/team")
    revalidatePath(`/admin/planning/${eventId}/collaboration`)
    emitEventAccessRealtime(eventId, "EVENT_ACCESS_REVOKED")
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
