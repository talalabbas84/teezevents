"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getPrismaClient } from "@/lib/prisma"
import { publishRealtimeEvent } from "@/lib/realtime"
import { requireEventAccess } from "@/lib/team-access"
import {
  ASSET_STATUS_OPTIONS,
  ASSET_TYPE_LABELS,
  DISTRIBUTION_PLATFORMS,
  DISTRIBUTION_STATUS_OPTIONS,
  type DistributionAssetType,
  type DistributionPlatform,
} from "@/lib/distribution-config"

const PlatformEnum = z.enum(DISTRIBUTION_PLATFORMS.map((item) => item.platform) as [DistributionPlatform, ...DistributionPlatform[]])
const StatusEnum = z.enum(DISTRIBUTION_STATUS_OPTIONS)
const AssetTypeEnum = z.enum(Object.keys(ASSET_TYPE_LABELS) as [DistributionAssetType, ...DistributionAssetType[]])
const AssetStatusEnum = z.enum(ASSET_STATUS_OPTIONS)

const ToggleChannelSchema = z.object({
  platform: PlatformEnum,
  selected: z.boolean(),
})

const UpdateChannelSchema = z.object({
  platform: PlatformEnum,
  status: StatusEnum.optional(),
  platformUrl: z.string().url("Must be a valid URL.").or(z.literal("")).optional(),
  syncEnabled: z.boolean().optional(),
  notes: z.string().max(1000, "Notes are too long.").optional(),
})

const UpdateAssetSchema = z.object({
  title: z.string().min(1, "Title is required.").max(160, "Title is too long."),
  body: z.string().min(1, "Body is required.").max(8000, "Body is too long."),
  status: AssetStatusEnum,
})

const AmbassadorSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  rewardType: z.enum(["NONE", "FIXED", "COMMISSION_PERCENT", "TICKET_CREDIT"]).default("COMMISSION_PERCENT"),
  rewardValue: z.coerce.number().min(0).max(100000).default(10),
  notes: z.string().max(1000).optional(),
})

const AmbassadorPerformanceSchema = z.object({
  salesCount: z.coerce.number().int().min(0).max(100000),
  revenueCents: z.coerce.number().int().min(0).max(100000000),
})

function emitDistributionRealtime(eventId: string, action: string, entityType: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType,
    entityId,
  })
}

function revalidateDistribution(eventId: string) {
  revalidatePath(`/admin/planning/${eventId}/distribution`)
  revalidatePath(`/admin/planning/${eventId}/dashboard`)
}

function getPlatformConfig(platform: DistributionPlatform) {
  return DISTRIBUTION_PLATFORMS.find((item) => item.platform === platform)
}

function formatEventDate(value: Date | null) {
  if (!value) return "date TBA"
  return value.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function buildTicketUrl(eventId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""
  return `${baseUrl}/checkout/${eventId}`
}

function buildEventUrl(eventId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""
  return `${baseUrl}/events/${eventId}`
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function ambassadorCode(name: string) {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  const prefix = slugify(name).replace(/-/g, "").slice(0, 8).toUpperCase() || "AMB"
  return `${prefix}${suffix}`
}

function calculateRewardCents(rewardType: string, rewardValue: number, revenueCents: number, salesCount: number) {
  if (rewardType === "FIXED") return Math.round(rewardValue * 100 * salesCount)
  if (rewardType === "COMMISSION_PERCENT") return Math.round(revenueCents * (rewardValue / 100))
  return 0
}

function buildAssetDrafts(event: {
  id: string
  title: string
  startsAt: Date | null
  venue: string | null
  address: string | null
  previewDescription: string | null
  description: string | null
  ticketNote: string | null
}) {
  const date = formatEventDate(event.startsAt)
  const venue = event.venue || "venue TBA"
  const location = event.address ? `${venue}, ${event.address}` : venue
  const shortDescription = event.previewDescription || event.description || "Join us for an unforgettable event experience."
  const eventUrl = buildEventUrl(event.id)
  const ticketUrl = buildTicketUrl(event.id)

  return [
    {
      type: "INSTAGRAM_POST",
      platform: "INSTAGRAM",
      title: `${event.title} - Instagram caption`,
      body: `Summer energy, great music, and a room full of people ready to move.\n\n${event.title} happens on ${date} at ${location}.\n\n${shortDescription}\n\nTickets: ${ticketUrl}\n\n#TeezEvents #TorontoEvents #DanceEvents`,
    },
    {
      type: "INSTAGRAM_REEL",
      platform: "INSTAGRAM",
      title: `${event.title} - Reel concept`,
      body: `Hook: "Toronto, your next night out is here."\n\nShot list:\n1. Fast venue reveal.\n2. Crowd or dance floor clip.\n3. Close-up of event details.\n4. Ticket CTA.\n\nCaption: ${event.title} is coming ${date}. Save your spot: ${ticketUrl}`,
    },
    {
      type: "FACEBOOK_EVENT",
      platform: "FACEBOOK_EVENTS",
      title: `${event.title} - Facebook Event`,
      body: `${event.title}\n\nDate: ${date}\nLocation: ${location}\n\n${shortDescription}\n\nBring your friends, lock in your tickets, and join the community for a polished event experience from start to finish.\n\nTickets: ${ticketUrl}`,
    },
    {
      type: "EVENTBRITE_DESCRIPTION",
      platform: "EVENTBRITE",
      title: `${event.title} - Eventbrite description`,
      body: `${event.title}\n\n${shortDescription}\n\nWhat to expect:\n- A curated event experience.\n- Smooth check-in.\n- A welcoming crowd.\n- A night designed for connection and energy.\n\nWhen: ${date}\nWhere: ${location}\n\n${event.ticketNote || "Tickets are limited. Reserve your spot early."}\n\nMore details: ${eventUrl}`,
    },
    {
      type: "EMAIL_CAMPAIGN",
      platform: "EMAIL",
      title: `Subject: ${event.title} is open for tickets`,
      body: `Subject: ${event.title} is open for tickets\nPreview: Save your spot for ${date}.\n\nHey,\n\n${event.title} is coming up on ${date} at ${location}.\n\n${shortDescription}\n\nTickets are available now. Reserve your spot here:\n${ticketUrl}\n\nSee you there,\nTEEZ Events`,
    },
    {
      type: "SMS_CAMPAIGN",
      platform: "SMS",
      title: `${event.title} - SMS`,
      body: `${event.title} is happening ${date}. Tickets are live: ${ticketUrl}`,
    },
    {
      type: "DISCORD_ANNOUNCEMENT",
      platform: "DISCORD",
      title: `${event.title} - Discord announcement`,
      body: `@everyone ${event.title} is coming up on ${date} at ${location}.\n\n${shortDescription}\n\nGrab tickets here: ${ticketUrl}`,
    },
    {
      type: "WHATSAPP_ANNOUNCEMENT",
      platform: "WHATSAPP",
      title: `${event.title} - WhatsApp announcement`,
      body: `${event.title}\n${date}\n${location}\n\n${shortDescription}\n\nTickets: ${ticketUrl}`,
    },
    {
      type: "LINKEDIN_POST",
      platform: "LINKEDIN",
      title: `${event.title} - LinkedIn post`,
      body: `${event.title} brings the community together on ${date} at ${location}.\n\n${shortDescription}\n\nEvent details and tickets: ${eventUrl}`,
    },
    {
      type: "TIKTOK_SCRIPT",
      platform: "TIKTOK",
      title: `${event.title} - TikTok script`,
      body: `Opening text: "Need plans in Toronto?"\n\nVoiceover: "${event.title} is happening ${date}. Here's why you should come..."\n\nBeats:\n- Show venue or event visual.\n- Show crowd/dance/music moment.\n- Add date and location overlay.\n- End with ticket CTA: ${ticketUrl}`,
    },
  ] as const
}

export async function toggleDistributionChannel(eventId: string, data: z.infer<typeof ToggleChannelSchema>) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const parsed = ToggleChannelSchema.parse(data)
    const config = getPlatformConfig(parsed.platform)
    if (!config) return { success: false, error: "Unsupported platform." }

    const prisma = getPrismaClient()
    const distribution = await prisma.eventDistribution.upsert({
      where: { eventId_platform: { eventId, platform: parsed.platform as never } },
      update: {
        selected: parsed.selected,
        status: parsed.selected ? "READY" : "DRAFT",
      },
      create: {
        eventId,
        platform: parsed.platform as never,
        channelType: config.channelType as never,
        selected: parsed.selected,
        status: parsed.selected ? "READY" : "DRAFT",
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: parsed.selected ? "SELECTED_DISTRIBUTION_CHANNEL" : "DESELECTED_DISTRIBUTION_CHANNEL",
        entityType: "EventDistribution",
        entityId: distribution.id,
        entityName: config.label,
      },
    })

    revalidateDistribution(eventId)
    emitDistributionRealtime(eventId, "DISTRIBUTION_CHANNEL_UPDATED", "EventDistribution", distribution.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update channel." }
  }
}

export async function updateDistributionChannel(eventId: string, data: z.infer<typeof UpdateChannelSchema>) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const parsed = UpdateChannelSchema.parse(data)
    const config = getPlatformConfig(parsed.platform)
    if (!config) return { success: false, error: "Unsupported platform." }

    const prisma = getPrismaClient()
    const distribution = await prisma.eventDistribution.upsert({
      where: { eventId_platform: { eventId, platform: parsed.platform as never } },
      update: {
        status: parsed.status,
        platformUrl: parsed.platformUrl || null,
        syncEnabled: parsed.syncEnabled,
        notes: parsed.notes,
      },
      create: {
        eventId,
        platform: parsed.platform as never,
        channelType: config.channelType as never,
        selected: true,
        status: parsed.status ?? "READY",
        platformUrl: parsed.platformUrl || null,
        syncEnabled: parsed.syncEnabled ?? false,
        notes: parsed.notes,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "UPDATED_DISTRIBUTION_CHANNEL",
        entityType: "EventDistribution",
        entityId: distribution.id,
        entityName: config.label,
      },
    })

    revalidateDistribution(eventId)
    emitDistributionRealtime(eventId, "DISTRIBUTION_CHANNEL_UPDATED", "EventDistribution", distribution.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save channel." }
  }
}

export async function markDistributionPublished(eventId: string, platform: DistributionPlatform) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const config = getPlatformConfig(platform)
    if (!config) return { success: false, error: "Unsupported platform." }

    const prisma = getPrismaClient()
    const distribution = await prisma.eventDistribution.upsert({
      where: { eventId_platform: { eventId, platform: platform as never } },
      update: {
        selected: true,
        status: "PUBLISHED",
        lastPublishedAt: new Date(),
        errorMessage: null,
      },
      create: {
        eventId,
        platform: platform as never,
        channelType: config.channelType as never,
        selected: true,
        status: "PUBLISHED",
        lastPublishedAt: new Date(),
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "MARKED_DISTRIBUTION_PUBLISHED",
        entityType: "EventDistribution",
        entityId: distribution.id,
        entityName: config.label,
      },
    })

    await prisma.notification.create({
      data: {
        eventId,
        type: "GENERAL",
        title: `${config.label} marked published`,
        body: "Distribution channel is now counted in the visibility score.",
        link: `/admin/planning/${eventId}/distribution`,
        actorEmail: session.email,
        entityType: "EventDistribution",
        entityId: distribution.id,
      },
    })

    revalidateDistribution(eventId)
    emitDistributionRealtime(eventId, "DISTRIBUTION_PUBLISHED", "EventDistribution", distribution.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark published." }
  }
}

export async function generateDistributionAssets(eventId: string) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const prisma = getPrismaClient()
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        venue: true,
        address: true,
        previewDescription: true,
        description: true,
        ticketNote: true,
      },
    })

    if (!event) return { success: false, error: "Event not found." }

    const drafts = buildAssetDrafts(event)
    for (const draft of drafts) {
      const distribution = draft.platform
        ? await prisma.eventDistribution.findUnique({
            where: { eventId_platform: { eventId, platform: draft.platform as never } },
            select: { id: true },
          })
        : null

      const existing = await prisma.eventDistributionAsset.findFirst({
        where: {
          eventId,
          type: draft.type as never,
          platform: draft.platform as never,
        },
        select: { id: true },
      })

      if (existing) {
        await prisma.eventDistributionAsset.update({
          where: { id: existing.id },
          data: {
            title: draft.title,
            body: draft.body,
            distributionId: distribution?.id ?? null,
            updatedBy: session.email,
          },
        })
      } else {
        await prisma.eventDistributionAsset.create({
          data: {
            eventId,
            distributionId: distribution?.id ?? null,
            type: draft.type as never,
            platform: draft.platform as never,
            title: draft.title,
            body: draft.body,
            createdBy: session.email,
            updatedBy: session.email,
          },
        })
      }
    }

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "GENERATED_DISTRIBUTION_ASSETS",
        entityType: "EventDistributionAsset",
        entityName: `${drafts.length} assets`,
      },
    })

    revalidateDistribution(eventId)
    emitDistributionRealtime(eventId, "DISTRIBUTION_ASSETS_GENERATED", "EventDistributionAsset")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate assets." }
  }
}

export async function updateDistributionAsset(assetId: string, data: z.infer<typeof UpdateAssetSchema>) {
  try {
    const parsed = UpdateAssetSchema.parse(data)
    const prisma = getPrismaClient()
    const existing = await prisma.eventDistributionAsset.findUnique({
      where: { id: assetId },
      select: { eventId: true },
    })

    if (!existing) return { success: false, error: "Asset not found." }
    const session = await requireEventAccess(existing.eventId, "EDIT")

    await prisma.eventDistributionAsset.update({
      where: { id: assetId },
      data: {
        title: parsed.title,
        body: parsed.body,
        status: parsed.status as never,
        updatedBy: session.email,
      },
    })

    revalidateDistribution(existing.eventId)
    emitDistributionRealtime(existing.eventId, "DISTRIBUTION_ASSET_UPDATED", "EventDistributionAsset", assetId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save asset." }
  }
}

export async function createAmbassador(eventId: string, data: z.infer<typeof AmbassadorSchema>) {
  try {
    const session = await requireEventAccess(eventId, "EDIT")
    const parsed = AmbassadorSchema.parse(data)
    const prisma = getPrismaClient()
    const code = ambassadorCode(parsed.name)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""
    const referralUrl = `${baseUrl}/events/${eventId}?ref=${code}`

    const ambassador = await prisma.eventAmbassador.create({
      data: {
        eventId,
        name: parsed.name,
        email: parsed.email || null,
        code,
        referralUrl,
        rewardType: parsed.rewardType as never,
        rewardValue: parsed.rewardValue,
        notes: parsed.notes,
      },
    })

    await prisma.planningActivityLog.create({
      data: {
        eventId,
        actorEmail: session.email,
        action: "CREATED_EVENT_AMBASSADOR",
        entityType: "EventAmbassador",
        entityId: ambassador.id,
        entityName: ambassador.name,
      },
    })

    revalidateDistribution(eventId)
    emitDistributionRealtime(eventId, "AMBASSADOR_CREATED", "EventAmbassador", ambassador.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create ambassador." }
  }
}

export async function updateAmbassadorPerformance(ambassadorId: string, data: z.infer<typeof AmbassadorPerformanceSchema>) {
  try {
    const parsed = AmbassadorPerformanceSchema.parse(data)
    const prisma = getPrismaClient()
    const existing = await prisma.eventAmbassador.findUnique({
      where: { id: ambassadorId },
      select: { eventId: true, rewardType: true, rewardValue: true },
    })

    if (!existing) return { success: false, error: "Ambassador not found." }
    await requireEventAccess(existing.eventId, "EDIT")

    const rewardValue = existing.rewardValue ? Number(existing.rewardValue) : 0
    const rewardCents = calculateRewardCents(existing.rewardType, rewardValue, parsed.revenueCents, parsed.salesCount)

    await prisma.eventAmbassador.update({
      where: { id: ambassadorId },
      data: {
        salesCount: parsed.salesCount,
        revenueCents: parsed.revenueCents,
        rewardCents,
      },
    })

    revalidateDistribution(existing.eventId)
    emitDistributionRealtime(existing.eventId, "AMBASSADOR_UPDATED", "EventAmbassador", ambassadorId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update ambassador." }
  }
}
