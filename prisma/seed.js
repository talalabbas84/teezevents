const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  await prisma.event.upsert({
    where: { id: "blossom" },
    update: {
      title: "BLOSSOM",
      startsAt: new Date("2026-04-25T18:00:00-04:00"),
      venue: "Party Room - 2nd floor",
      address: "1001 Bay St, Toronto ON",
      currency: "cad",
      ticketPriceCents: 2200,
      capacity: 80,
      isActive: true,
    },
    create: {
      id: "blossom",
      title: "BLOSSOM",
      startsAt: new Date("2026-04-25T18:00:00-04:00"),
      venue: "Party Room - 2nd floor",
      address: "1001 Bay St, Toronto ON",
      currency: "cad",
      ticketPriceCents: 2200,
      capacity: 80,
      isActive: true,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
