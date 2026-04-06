import Link from "next/link"
import { CheckCircle2, Ticket } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { formatCurrency, getOrderBySessionId } from "@/lib/checkout"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const order = sessionId ? await getOrderBySessionId(sessionId) : null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl lg:p-12">
              <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-primary" />
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {"Payment Confirmed"}
              </div>
              <h1 className="mb-4 text-4xl font-serif font-bold text-balance">{"Your tickets are secured."}</h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                {"Stripe has confirmed your checkout. Keep an eye on your inbox for any follow-up details from TEEZ."}
              </p>

              {order && (
                <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/10 p-6 text-left">
                  <div className="mb-4 flex items-center gap-3 text-primary">
                    <Ticket size={18} />
                    <div className="font-semibold">{order.eventTitleSnapshot}</div>
                  </div>
                  <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div>{`Order: ${order.orderNumber}`}</div>
                    <div>{`Tickets: ${order.quantity}`}</div>
                    <div>{`Total: ${formatCurrency(order.totalPriceCents, order.currency)}`}</div>
                    <div>{`Email: ${order.customerEmail}`}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href={order ? `/events/${order.eventId}` : "/events"}>{"Back to Event"}</Link>
                </Button>
                <Button asChild variant="outline" className="border-2 border-primary text-primary">
                  <Link href="/events">{"Browse More Events"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
