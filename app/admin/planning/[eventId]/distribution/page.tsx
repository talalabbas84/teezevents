import { DistributionHubClient } from "@/components/planning/distribution-hub-client"
import { DISTRIBUTION_PLATFORMS } from "@/lib/distribution-config"
import { getPrismaClient } from "@/lib/prisma"

export default async function DistributionPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const prisma = getPrismaClient()

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: true,
      address: true,
      image: true,
      previewDescription: true,
      description: true,
      checkoutEnabled: true,
      capacity: true,
      orders: {
        where: { status: "PAID" },
        select: {
          totalPriceCents: true,
          tickets: { select: { id: true } },
        },
      },
      rsvps: {
        select: { id: true, status: true },
      },
    },
  })

  if (!event) {
    throw new Error("Event not found.")
  }

  await Promise.all(
    DISTRIBUTION_PLATFORMS.map((item) =>
      prisma.eventDistribution.upsert({
        where: {
          eventId_platform: {
            eventId,
            platform: item.platform as never,
          },
        },
        update: {},
        create: {
          eventId,
          platform: item.platform as never,
          channelType: item.channelType as never,
          selected: item.platform === "WEBSITE",
          status: item.platform === "WEBSITE" ? "PUBLISHED" : "DRAFT",
          platformUrl: item.platform === "WEBSITE" ? `/events/${eventId}` : null,
          lastPublishedAt: item.platform === "WEBSITE" ? new Date() : null,
        },
      })
    )
  )

  const [distributions, assets, ambassadors, metrics] = await Promise.all([
    prisma.eventDistribution.findMany({
      where: { eventId },
      orderBy: [{ channelType: "asc" }, { platform: "asc" }],
    }),
    prisma.eventDistributionAsset.findMany({
      where: { eventId },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.eventAmbassador.findMany({
      where: { eventId },
      orderBy: [{ revenueCents: "desc" }, { salesCount: "desc" }],
    }),
    prisma.eventDistributionMetric.findMany({
      where: { eventId },
      orderBy: { capturedAt: "desc" },
      take: 50,
    }),
  ])

  const paidOrders = event.orders.length
  const revenueCents = event.orders.reduce((total, order) => total + order.totalPriceCents, 0)
  const ticketsSold = event.orders.reduce((total, order) => total + order.tickets.length, 0)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <DistributionHubClient
          event={{
            id: event.id,
            title: event.title,
            startsAt: event.startsAt?.toISOString() ?? null,
            venue: event.venue,
            address: event.address,
            image: event.image,
            previewDescription: event.previewDescription,
            description: event.description,
            checkoutEnabled: event.checkoutEnabled,
            capacity: event.capacity,
            paidOrders,
            revenueCents,
            ticketsSold,
            rsvpCount: event.rsvps.length,
          }}
          distributions={distributions.map((distribution) => ({
            id: distribution.id,
            eventId: distribution.eventId,
            platform: distribution.platform,
            channelType: distribution.channelType,
            status: distribution.status,
            selected: distribution.selected,
            syncEnabled: distribution.syncEnabled,
            platformListingId: distribution.platformListingId,
            platformUrl: distribution.platformUrl,
            lastPublishedAt: distribution.lastPublishedAt?.toISOString() ?? null,
            lastSyncedAt: distribution.lastSyncedAt?.toISOString() ?? null,
            errorMessage: distribution.errorMessage,
            notes: distribution.notes,
          }))}
          assets={assets.map((asset) => ({
            id: asset.id,
            eventId: asset.eventId,
            distributionId: asset.distributionId,
            type: asset.type,
            platform: asset.platform,
            title: asset.title,
            body: asset.body,
            status: asset.status,
            updatedAt: asset.updatedAt.toISOString(),
          }))}
          ambassadors={ambassadors.map((ambassador) => ({
            id: ambassador.id,
            eventId: ambassador.eventId,
            name: ambassador.name,
            email: ambassador.email,
            code: ambassador.code,
            referralUrl: ambassador.referralUrl,
            rewardType: ambassador.rewardType,
            rewardValue: ambassador.rewardValue ? Number(ambassador.rewardValue) : null,
            salesCount: ambassador.salesCount,
            revenueCents: ambassador.revenueCents,
            rewardCents: ambassador.rewardCents,
            isActive: ambassador.isActive,
            notes: ambassador.notes,
          }))}
          metrics={metrics.map((metric) => ({
            id: metric.id,
            platform: metric.platform,
            kind: metric.kind,
            label: metric.label,
            valueInt: metric.valueInt,
            valueDecimal: metric.valueDecimal ? Number(metric.valueDecimal) : null,
            valueText: metric.valueText,
            capturedAt: metric.capturedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  )
}
