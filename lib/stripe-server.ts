type StripeClientLike = {
  checkout: {
    sessions: {
      create(args: unknown): Promise<Record<string, unknown>>
    }
  }
  webhooks: {
    constructEvent(body: string, signature: string, secret: string): Record<string, unknown>
  }
}

type StripeConstructor = new (apiKey: string) => StripeClientLike

let stripeClient: StripeClientLike | null = null

function getRuntimeRequire() {
  return eval("require") as NodeJS.Require
}

function getStripeConstructor(): StripeConstructor {
  try {
    const runtimeRequire = getRuntimeRequire()
    const stripeModule = runtimeRequire("stripe") as {
      default?: StripeConstructor
    }

    return stripeModule.default || (stripeModule as unknown as StripeConstructor)
  } catch {
    throw new Error('Stripe SDK is not installed. Run "pnpm install".')
  }
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY.")
  }

  if (!stripeClient) {
    const Stripe = getStripeConstructor()
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)
  }

  return stripeClient
}

export function constructStripeWebhookEvent(body: string, signature: string, secret: string) {
  const Stripe = getStripeConstructor()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")

  return stripe.webhooks.constructEvent(body, signature, secret)
}
