const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const event = await prisma.event.upsert({
    where: { id: "blossom" },
    update: {
      title: "BLOSSOM",
      startsAt: new Date("2026-04-25T18:00:00-04:00"),
      venue: "Party Room - 2nd floor",
      address: "1001 Bay St, Toronto ON",
      hostedBy: "TEEZ",
      image: "/vibrant-dance-party-with-colorful-lights.jpg",
      previewDescription:
        "An invite-only spring social with warm energy, soft spring tones, finger foods, and a limited guest list.",
      description:
        "We’re welcoming the new season the best way we know how, with good music, warm energy, and our favorite people. This gathering is a little more personal and celebrates the next chapter of the TEEZ community.",
      category: "UPCOMING",
      eventKind: "SOCIAL",
      currency: "cad",
      ticketPriceCents: 2200,
      capacity: 80,
      checkoutEnabled: true,
      maxTicketsPerOrder: 80,
      ticketNote:
        "Invite-only and limited capacity. Card payments are processed in secure Stripe Checkout and holds expire automatically if payment is not completed.",
      featured: true,
      isActive: true,
    },
    create: {
      id: "blossom",
      title: "BLOSSOM",
      startsAt: new Date("2026-04-25T18:00:00-04:00"),
      venue: "Party Room - 2nd floor",
      address: "1001 Bay St, Toronto ON",
      hostedBy: "TEEZ",
      image: "/vibrant-dance-party-with-colorful-lights.jpg",
      previewDescription:
        "An invite-only spring social with warm energy, soft spring tones, finger foods, and a limited guest list.",
      description:
        "We’re welcoming the new season the best way we know how, with good music, warm energy, and our favorite people. This gathering is a little more personal and celebrates the next chapter of the TEEZ community.",
      category: "UPCOMING",
      eventKind: "SOCIAL",
      currency: "cad",
      ticketPriceCents: 2200,
      capacity: 80,
      checkoutEnabled: true,
      maxTicketsPerOrder: 80,
      ticketNote:
        "Invite-only and limited capacity. Card payments are processed in secure Stripe Checkout and holds expire automatically if payment is not completed.",
      featured: true,
      isActive: true,
    },
  })

  const existingTierCount = await prisma.ticketTier.count({
    where: {
      eventId: event.id,
    },
  })

  if (existingTierCount === 0) {
    await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: "General Admission",
        description: "Standard entry for BLOSSOM.",
        priceCents: 2200,
        sortOrder: 0,
        isActive: true,
        isHidden: false,
      },
    })
  }
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
