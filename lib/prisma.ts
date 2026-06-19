import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

function hasCurrentGeneratedDelegates(client: PrismaClient) {
  return Boolean(
    client.marketingCampaign &&
      client.marketingPost &&
      client.marketingEmailCampaignDetail &&
      client.marketingEmailDelivery &&
      client.websitePage &&
      client.websitePageRevision &&
      client.teamMember &&
      client.eventComment &&
      client.eventFileFolder &&
      client.eventDistribution &&
      client.eventDistributionAsset &&
      client.eventDistributionMetric &&
      client.eventAmbassador &&
      client.teamWorkspace &&
      client.eventTeamAccess,
  )
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma || !hasCurrentGeneratedDelegates(globalForPrisma.prisma)) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => undefined)
    }

    globalForPrisma.prisma = new PrismaClient()
  }

  if (!hasCurrentGeneratedDelegates(globalForPrisma.prisma)) {
    throw new Error(
      "Prisma Client is missing generated delegates for the current schema. Run `pnpm prisma generate` and restart the Next.js dev server.",
    )
  }

  return globalForPrisma.prisma
}
