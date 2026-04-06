import { NextResponse } from "next/server"
import { markOrderExpiredFromCheckoutSession, markOrderPaidFromCheckoutSession } from "@/lib/checkout"
import { constructStripeWebhookEvent } from "@/lib/stripe-server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration." }, { status: 500 })
  }

  const body = await request.text()

  let event: {
    type: string
    data: {
      object: {
        id: string
        payment_intent?: string | { id?: string } | null
      }
    }
  }

  try {
    event = constructStripeWebhookEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET) as typeof event
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null

        await markOrderPaidFromCheckoutSession(session.id, paymentIntentId).catch(() => null)
        break
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object

        await markOrderExpiredFromCheckoutSession(session.id).catch(() => null)
        break
      }
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
