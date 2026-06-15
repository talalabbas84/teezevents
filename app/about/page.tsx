import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <section className="py-24 lg:py-40" style={{ backgroundColor: "#EADFCB" }}>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="animate-slide-in-left">
                <h2 className="text-6xl md:text-7xl font-serif font-bold mb-10 text-gradient">{"Our Story"}</h2>
                <div className="space-y-8 text-xl leading-relaxed" style={{ color: "#2B2B2B" }}>
                  <p>
                    {
                      "Teez Events Co. didn't start in a boardroom. We were founded in October 2025, born directly from the energy and connection of the Latin dance floor."
                    }
                  </p>
                  <p>
                    {
                      "What started as a group of us taking dance lessons evolved into hosting a massive Halloween party. The night was a huge success, but the real magic happened that November when we met up to celebrate. We were tossing around ideas, trying to figure out who we were, when someone asked, \"What are we?\" The answer? \"We’re the HOTTEEZ.\" It felt corny at first, prompting an Instagram post captioned with #🔥TEEZ—because it was fire, a nod to the energy we brought to the community. Later, during a late-night WhatsApp brainstorm, that hashtag resurfaced, and the vision clicked: Teez Events Co. Since then, we’ve been throwing events that people actually talk about—from our Roaring 20s Winter Holiday Ball to our exclusive, invite-only Blossom Party for our VVIPs."
                    }
                  </p>
                  <p>
                    {
                      "We don't do template events or generic corporate fluff. We build packed, high-energy spaces where music, movement, and good vibes happen naturally. Welcome to the party."
                    }
                  </p>
                </div>
              </div>
              <div className="relative animate-slide-in-right">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl hover-lift">
                  <img
                    src="/team-celebrating-successful-event.jpg"
                    alt="Teez Events Co. team"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* <div
                  className="absolute -bottom-10 -left-10 p-12 rounded-2xl shadow-2xl max-w-sm animate-float"
                  style={{ backgroundColor: "#C57A3A", color: "white" }}
                >
                  <div className="text-7xl font-bold mb-4">{"10+ Years"}</div>
                  <div className="text-xl opacity-90">{"Creating unforgettable celebrations"}</div>
                </div> */}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
