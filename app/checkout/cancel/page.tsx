import Link from "next/link"
import { RotateCcw } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { eventsById } from "@/lib/events"

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventId } = await searchParams
  const event = eventId ? eventsById[eventId] : null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl lg:p-12">
              <RotateCcw className="mx-auto mb-6 h-16 w-16 text-primary" />
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {"Checkout Not Completed"}
              </div>
              <h1 className="mb-4 text-4xl font-serif font-bold text-balance">{"Your tickets are still available if you want to come back."}</h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                {"No payment was captured. If you return soon, you can restart checkout and finish your purchase."}
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href={event ? `/checkout/${event.id}` : "/events"}>{"Return to Checkout"}</Link>
                </Button>
                <Button asChild variant="outline" className="border-2 border-primary text-primary">
                  <Link href={event ? `/events/${event.id}` : "/events"}>{"Back to Event"}</Link>
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
