type AggregateResult = {
  _sum: {
    quantity: number | null
  }
}

type TicketOrderDelegate = {
  aggregate(args: unknown): Promise<AggregateResult>
  create(args: unknown): Promise<Record<string, unknown>>
  update(args: unknown): Promise<Record<string, unknown>>
  findUnique(args: unknown): Promise<Record<string, unknown> | null>
}

type EventDelegate = {
  upsert(args: unknown): Promise<Record<string, unknown>>
}

type PrismaTransactionClient = {
  event: EventDelegate
  ticketOrder: TicketOrderDelegate
}

export type PrismaClientLike = PrismaTransactionClient & {
  $transaction<T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
    options?: {
      isolationLevel?: string
    },
  ): Promise<T>
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientLike
}

function getRuntimeRequire() {
  return eval("require") as NodeJS.Require
}

function createPrismaClient(): PrismaClientLike {
  try {
    const runtimeRequire = getRuntimeRequire()
    const prismaModule = runtimeRequire("@prisma/client") as {
      PrismaClient: new (options?: unknown) => PrismaClientLike
    }

    return new prismaModule.PrismaClient()
  } catch {
    throw new Error('Prisma client is not installed. Run "pnpm install" and "pnpm db:generate".')
  }
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}
