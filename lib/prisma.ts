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
      client.websitePageRevision,
  )
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma || !hasCurrentGeneratedDelegates(globalForPrisma.prisma)) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => undefined)
    }

    globalForPrisma.prisma = new PrismaClient()
  }

  return globalForPrisma.prisma
}
