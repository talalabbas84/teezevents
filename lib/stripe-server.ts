import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY.")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)
  }

  return stripeClient
}

export function constructStripeWebhookEvent(body: string, signature: string, secret: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")

  return stripe.webhooks.constructEvent(body, signature, secret)
}
