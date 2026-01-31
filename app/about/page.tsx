import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Image from "next/image"

export default function AboutPage() {
  const stats = [
    { number: "500+", label: "Events Hosted" },
    { number: "50K+", label: "Happy Guests" },
    { number: "10+", label: "Years Experience" },
    { number: "98%", label: "Client Satisfaction" },
  ]

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <section className="relative py-32 lg:py-48 overflow-hidden dark-section">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-block mb-10 animate-flame-flicker">
                <div className="relative w-32 h-32 animate-glow">
                  <Image
                    src="/images/screenshot-202026-01-10-20at-2012.png"
                    alt="Teez Events"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <h1
                className="text-7xl md:text-9xl font-serif font-bold mb-10 text-balance animate-scale-in"
                style={{ color: "#EADFCB" }}
              >
                {"About Teez Events"}
              </h1>
              <div
                className="h-1.5 w-40 mx-auto mb-10 rounded-full animate-pulse"
                style={{ background: "linear-gradient(90deg, #C57A3A, #D88C4A, #B86A2E)" }}
              />
              <p
                className="text-2xl md:text-3xl leading-relaxed animate-fade-in-up stagger-2"
                style={{ color: "#EADFCB" }}
              >
                {
                  "We're not just event planners – we're experience creators, culture celebrators, and memory makers dedicated to bringing the vibrant spirit of Latin celebrations to life."
                }
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-40" style={{ backgroundColor: "#EADFCB" }}>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="animate-slide-in-left">
                <h2 className="text-6xl md:text-7xl font-serif font-bold mb-10 text-gradient">{"Our Story"}</h2>
                <div className="space-y-8 text-xl leading-relaxed" style={{ color: "#2B2B2B" }}>
                  <p>
                    {
                      "Founded over a decade ago, Teez Events was born from a simple passion: to share the rich, vibrant culture of Latin celebrations with our community. What started as intimate gatherings has blossomed into one of the region's premier event management companies."
                    }
                  </p>
                  <p>
                    {
                      "We specialize in creating immersive experiences that capture the energy, warmth, and authenticity of Latin culture. From salsa nights under the stars to elegant corporate galas with Latin flair, every event we host is infused with the same dedication to excellence and cultural authenticity."
                    }
                  </p>
                  <p>
                    {
                      "Our team brings together diverse talents – event designers, cultural consultants, entertainment coordinators, and hospitality professionals – all united by a shared mission: to create unforgettable moments that bring people together in celebration."
                    }
                  </p>
                  <p>
                    {
                      "Our mission is to create transformative event experiences that celebrate Latin culture, foster genuine connections, and leave lasting impressions on every guest who walks through our doors."
                    }
                  </p>
                </div>
              </div>
              <div className="relative animate-slide-in-right">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl hover-lift">
                  <img
                    src="/team-celebrating-successful-event.jpg"
                    alt="Teez Events team"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className="absolute -bottom-10 -left-10 p-12 rounded-2xl shadow-2xl max-w-sm animate-float"
                  style={{ backgroundColor: "#C57A3A", color: "white" }}
                >
                  <div className="text-7xl font-bold mb-4">{"10+ Years"}</div>
                  <div className="text-xl opacity-90">{"Creating unforgettable celebrations"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-40 dark-section">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-16">
              {stats.map((stat, index) => (
                <div key={index} className={`text-center animate-scale-in stagger-${index + 1}`}>
                  <div
                    className="text-7xl md:text-8xl font-bold mb-6"
                    style={{
                      background: "linear-gradient(135deg, #D88C4A, #C57A3A)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stat.number}
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: "#EADFCB" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
