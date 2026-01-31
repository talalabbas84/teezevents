import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        {/* Join Our Team CTA */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{"Join Our Team"}</h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                {
                  "We're always looking for passionate, creative individuals who share our love for creating unforgettable experiences. If you're interested in joining the Teez Events family, we'd love to hear from you."
                }
              </p>
              <a
                href="mailto:info@teasevents.com"
                className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:text-accent transition-colors"
              >
                <Mail size={20} />
                {"info@teasevents.com"}
              </a>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
