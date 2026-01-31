import { Navigation } from "@/components/navigation"
import { HeroCarousel } from "@/components/hero-carousel"
import { EventPreviewSection } from "@/components/event-preview-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { StatsCounterSection } from "@/components/stats-counter"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Calendar, Sparkles, Users, Flame } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <HeroCarousel />

        <section
          className="py-24 lg:py-40 dark-section relative overflow-hidden"
          style={{ backgroundColor: "#1C2431" }}
        >
          {/* Animated decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20 animate-float"
              style={{ background: "linear-gradient(135deg, #D88C4A, #C57A3A)" }}
            />
            <div
              className="absolute bottom-20 right-20 w-40 h-40 rounded-full opacity-15 animate-float-delayed"
              style={{ background: "linear-gradient(135deg, #B86A2E, #D88C4A)" }}
            />
            <div
              className="absolute top-1/2 right-10 w-24 h-24 rounded-full opacity-10 animate-pulse"
              style={{ background: "radial-gradient(circle, #D88C4A, transparent)" }}
            />
          </div>

          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <ScrollReveal>
              <div className="text-center mb-24">
                <div className="inline-block mb-8">
                  <div className="relative w-32 h-32">
                    <Image
                      src="/images/screenshot-202026-01-10-20at-2012.png"
                      alt="Teez Events"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <h2
                  className="text-6xl md:text-8xl font-serif font-bold mb-8 text-balance animate-fade-in-up"
                  style={{ color: "#EADFCB" }}
                >
                  {"So, what are we???"}
                </h2>
                <div
                  className="h-1.5 w-40 mx-auto mb-10 rounded-full animate-pulse"
                  style={{ background: "linear-gradient(90deg, #C57A3A, #D88C4A, #B86A2E)" }}
                />
                <p
                  className="text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-sans"
                  style={{ color: "#EADFCB" }}
                >
                  {
                    "We're not just event planners—we're experience architects, memory makers, and celebration virtuosos who ignite unforgettable moments that burn bright in your memory forever"
                  }
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
              <ScrollReveal delay={100}>
                <div className="group relative">
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                    style={{ background: "linear-gradient(135deg, #D88C4A, #C57A3A)" }}
                  />
                  <div className="relative glass-dark rounded-3xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border-2 border-transparent hover:border-[#D88C4A]">
                    <div
                      className="w-28 h-28 rounded-2xl flex items-center justify-center mx-auto mb-8 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500"
                      style={{ background: "linear-gradient(135deg, #D88C4A, #C57A3A)" }}
                    >
                      <Sparkles className="w-14 h-14 text-white animate-pulse" />
                    </div>
                    <h3
                      className="text-3xl md:text-4xl font-serif font-bold mb-6 text-center"
                      style={{ color: "#D88C4A" }}
                    >
                      {"Unforgettable Experiences"}
                    </h3>
                    <p className="leading-relaxed text-center text-xl" style={{ color: "#EADFCB" }}>
                      {
                        "We craft immersive celebrations that captivate your guests and create lasting memories that go beyond the ordinary."
                      }
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="group relative">
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                    style={{ background: "linear-gradient(135deg, #C57A3A, #D88C4A)" }}
                  />
                  <div className="relative glass-dark rounded-3xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border-2 border-transparent hover:border-[#C57A3A]">
                    <div
                      className="w-28 h-28 rounded-2xl flex items-center justify-center mx-auto mb-8 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500"
                      style={{ background: "linear-gradient(135deg, #C57A3A, #D88C4A)" }}
                    >
                      <Calendar className="w-14 h-14 text-white animate-pulse" />
                    </div>
                    <h3
                      className="text-3xl md:text-4xl font-serif font-bold mb-6 text-center"
                      style={{ color: "#D88C4A" }}
                    >
                      {"Flawless Execution"}
                    </h3>
                    <p className="leading-relaxed text-center text-xl" style={{ color: "#EADFCB" }}>
                      {
                        "From concept to completion, our meticulous planning and coordination ensure every detail is perfect on your special day."
                      }
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="group relative">
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                    style={{ background: "linear-gradient(135deg, #B86A2E, #C57A3A)" }}
                  />
                  <div className="relative glass-dark rounded-3xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border-2 border-transparent hover:border-[#B86A2E]">
                    <div
                      className="w-28 h-28 rounded-2xl flex items-center justify-center mx-auto mb-8 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500"
                      style={{ background: "linear-gradient(135deg, #B86A2E, #C57A3A)" }}
                    >
                      <Users className="w-14 h-14 text-white animate-pulse" />
                    </div>
                    <h3
                      className="text-3xl md:text-4xl font-serif font-bold mb-6 text-center"
                      style={{ color: "#D88C4A" }}
                    >
                      {"Dedicated Team"}
                    </h3>
                    <p className="leading-relaxed text-center text-xl" style={{ color: "#EADFCB" }}>
                      {
                        "Our passionate professionals work closely with you to understand your vision and bring it to life with expertise and care."
                      }
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <EventPreviewSection />
        <StatsCounterSection />
        <TestimonialsSection />

        <section className="py-24 lg:py-40 dark-section">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-3xl">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url(/celebration-party-confetti-background.jpg)" }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, rgba(197, 122, 58, 0.95), rgba(216, 140, 74, 0.95))" }}
                />
                <div className="relative p-16 lg:p-24 text-center text-white">
                  <Flame className="w-20 h-20 mx-auto mb-8 animate-flame-flicker" />
                  <h2 className="text-5xl md:text-7xl font-serif font-bold mb-8 text-balance">
                    {"Ready to Ignite Your Event?"}
                  </h2>
                  <p className="text-2xl mb-10 max-w-3xl mx-auto opacity-95 leading-relaxed">
                    {
                      "Let's turn your vision into an unforgettable celebration. Contact us today and let the magic begin!"
                    }
                  </p>
                  <div className="flex flex-wrap gap-6 justify-center">
                    <Button
                      size="lg"
                      className="magnetic-button text-xl px-12 py-8 font-bold"
                      style={{ backgroundColor: "#1C2431", color: "#D88C4A" }}
                      asChild
                    >
                      <Link href="/contact">{"Get Started"}</Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-3 text-xl px-12 py-8 font-bold bg-white/10 backdrop-blur-sm hover:bg-white/25 text-white"
                      style={{ borderColor: "white", borderWidth: "2px" }}
                      asChild
                    >
                      <Link href="/events">{"View Portfolio"}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
