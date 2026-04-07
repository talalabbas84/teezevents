const { randomUUID } = require("node:crypto")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

function buildAccessToken() {
  return randomUUID().replace(/-/g, "")
}

async function main() {
  const orders = await prisma.ticketOrder.findMany({
    where: {
      accessToken: null,
    },
    select: {
      id: true,
    },
  })

  for (const order of orders) {
    await prisma.ticketOrder.update({
      where: {
        id: order.id,
      },
      data: {
        accessToken: buildAccessToken(),
      },
    })
  }

  console.log(`Backfilled access tokens for ${orders.length} order(s).`)
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
