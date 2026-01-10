import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, ArrowLeft, Play } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

const eventsData: Record<string, any> = {
  "halloween-2024": {
    title: "Halloween Fiesta",
    date: "October 31, 2024",
    location: "Downtown Event Center",
    attendees: "500+",
    description:
      "Our Halloween Fiesta was a spooky spectacular that brought together over 500 guests for an unforgettable night of Latin-inspired Halloween celebrations. The event featured live DJ sets, a costume contest with amazing prizes, themed cocktails, and an atmosphere that perfectly blended Halloween thrills with Latin energy.",
    highlights: [
      "Live DJ spinning Latin and Halloween-themed hits",
      "Best Costume Contest with $1000 grand prize",
      "Themed cocktail bar with signature drinks",
      "Professional photography and photo booth",
      "Authentic Latin cuisine with a spooky twist",
    ],
    gallery: [
      "/halloween-party-decorations-with-costumes-and-ligh.jpg",
      "/halloween-costume-party-group-dancing.jpg",
      "/spooky-cocktails-halloween-themed-drinks.jpg",
      "/halloween-dj-performance-event.jpg",
      "/halloween-photo-booth-props-guests.jpg",
      "/halloween-decorations-venue-setup.jpg",
    ],
    videoUrl: "/placeholder-video-halloween-highlights.mp4",
    category: "Past Event",
  },
  "roaring-20s": {
    title: "Roaring 20s Gala",
    date: "December 15, 2024",
    location: "Grand Ballroom",
    attendees: "350+",
    description:
      "Step back in time to the golden age of jazz and glamour. Our Roaring 20s Gala transformed the Grand Ballroom into a 1920s speakeasy, complete with art deco decor, flapper dresses, dapper suits, and live jazz ensemble. Guests enjoyed prohibition-style cocktails, Charleston dance lessons, and an evening of pure elegance.",
    highlights: [
      "Live jazz band and swing orchestra",
      "Charleston and swing dance lessons",
      "Prohibition-era cocktail experience",
      "Period-appropriate dress code",
      "Art deco decor and vintage ambiance",
    ],
    gallery: [
      "/1920s-gatsby-style-party-elegant-art-deco.jpg",
      "/art-deco-ballroom-elegant-setup.jpg",
      "/flapper-dresses-guests-dancing.jpg",
      "/jazz-band-live-performance-1920s.jpg",
      "/vintage-cocktails-prohibition-style.jpg",
      "/gatsby-themed-entrance-decor.jpg",
    ],
    videoUrl: "/placeholder-video-roaring-20s-highlights.mp4",
    category: "Past Event",
  },
  "summer-salsa": {
    title: "Summer Salsa Night",
    date: "Coming June 2026",
    location: "Outdoor Pavilion",
    attendees: "400+",
    description:
      "Get ready for an enchanting evening under the stars! Our Summer Salsa Night will feature a live salsa band, professional dance instructors, and authentic Latin cuisine. Whether you're a seasoned dancer or a beginner, this event promises an unforgettable experience filled with rhythm, flavor, and warm summer vibes.",
    highlights: [
      "Live salsa band performance",
      "Professional salsa dance lessons",
      "Authentic Latin food stations",
      "Open-air dance floor under the stars",
      "Tropical cocktails and refreshments",
    ],
    gallery: [
      "/outdoor-salsa-dancing-party-summer-evening.jpg",
      "/live-salsa-band-outdoor-stage.jpg",
      "/latin-food-catering-display.jpg",
      "/couples-dancing-salsa-outdoors.jpg",
      "/summer-cocktails-tropical-drinks.jpg",
      "/outdoor-pavilion-evening-lights.jpg",
    ],
    videoUrl: null,
    category: "Upcoming Event",
  },
  "corporate-gala": {
    title: "Corporate Anniversary Gala",
    date: "September 20, 2024",
    location: "Luxury Hotel",
    attendees: "250+",
    description:
      "We had the honor of creating an elegant corporate anniversary celebration that seamlessly blended professional sophistication with Latin-inspired entertainment. The event featured keynote speeches, awards ceremony, gourmet dining, and live entertainment that kept guests engaged throughout the evening.",
    highlights: [
      "Elegant ballroom setup with custom lighting",
      "Live Latin jazz ensemble",
      "Gourmet multi-course dining",
      "Professional AV and presentation setup",
      "Awards ceremony and keynote speeches",
    ],
    gallery: [
      "/corporate-event-elegant-ballroom-setup.jpg",
      "/business-gala-formal-dining.jpg",
      "/corporate-awards-ceremony-stage.jpg",
      "/elegant-table-settings-corporate.jpg",
      "/live-entertainment-corporate-event.jpg",
      "/professional-event-lighting-setup.jpg",
    ],
    videoUrl: "/placeholder-video-corporate-gala-highlights.mp4",
    category: "Past Event",
  },
  "new-years-bash": {
    title: "New Year's Latin Bash",
    date: "December 31, 2025",
    location: "City Center Plaza",
    attendees: "800+",
    description:
      "The biggest celebration of the year! Our New Year's Latin Bash brought together over 800 guests for an epic countdown featuring live Latin music, multiple DJ stages, gourmet food stations, and a spectacular fireworks display at midnight. The energy was electric as we danced into the new year together.",
    highlights: [
      "Multiple stages with live bands and DJs",
      "Midnight fireworks spectacular",
      "Champagne toast and countdown celebration",
      "International food and drink stations",
      "VIP lounge with premium open bar",
    ],
    gallery: [
      "/new-years-party-fireworks-celebration.jpg",
      "/countdown-celebration-crowd.jpg",
      "/champagne-toast-new-years.jpg",
      "/live-band-new-years-performance.jpg",
      "/fireworks-display-city-celebration.jpg",
      "/new-years-party-crowd-dancing.jpg",
    ],
    videoUrl: "/placeholder-video-new-years-highlights.mp4",
    category: "Past Event",
  },
  "spring-carnival": {
    title: "Spring Carnival",
    date: "Coming April 2026",
    location: "Riverside Park",
    attendees: "600+",
    description:
      "Join us for a vibrant spring celebration that brings the carnival spirit to life! This family-friendly event will feature carnival games, food vendors, live entertainment, face painting, and exciting activities for all ages. Experience the joy and color of a traditional Latin American carnival right in our community.",
    highlights: [
      "Carnival games and prizes",
      "Live music and dance performances",
      "Food vendors and food trucks",
      "Face painting and kids activities",
      "Artisan market and craft vendors",
    ],
    gallery: [
      "/colorful-carnival-celebration-with-decorations.jpg",
      "/carnival-games-families-playing.jpg",
      "/food-vendors-carnival-atmosphere.jpg",
      "/live-music-carnival-stage.jpg",
      "/face-painting-kids-carnival.jpg",
      "/colorful-decorations-carnival-setup.jpg",
    ],
    videoUrl: null,
    category: "Upcoming Event",
  },
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = eventsData[params.id]

  if (!event) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        {/* Hero Image */}
        <div className="relative h-[60vh] min-h-[500px]">
          <img src={event.gallery[0] || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-16">
            <div className="container mx-auto">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-white hover:text-accent transition-colors mb-6"
              >
                <ArrowLeft size={20} />
                {"Back to Events"}
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 text-balance">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar size={20} />
                  <span className="text-lg">{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={20} />
                  <span className="text-lg">{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <span className="text-lg">
                    {event.attendees} {event.category === "Upcoming Event" ? "Expected" : "Attendees"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <h2 className="text-3xl font-serif font-bold mb-6">{"About This Event"}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">{event.description}</p>

                <h3 className="text-2xl font-serif font-bold mb-4">{"Event Highlights"}</h3>
                <ul className="space-y-3 mb-12">
                  {event.highlights.map((highlight: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>

                {/* Video Section */}
                {event.videoUrl && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-serif font-bold mb-6">{"Event Highlights Video"}</h3>
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group cursor-pointer">
                      <img
                        src={event.gallery[1] || "/placeholder.svg"}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play size={32} className="text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div>
                <div className="sticky top-24 space-y-6">
                  <div className="bg-muted/50 p-6 rounded-lg border border-border">
                    <h3 className="text-xl font-serif font-bold mb-4">{"Interested in hosting a similar event?"}</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {"Let us bring your vision to life with our expert event planning and management services."}
                    </p>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-accent" size="lg">
                      {"Contact Us"}
                    </Button>
                  </div>

                  {event.category === "Past Event" && (
                    <div className="bg-accent/10 p-6 rounded-lg border border-accent/20">
                      <h3 className="text-xl font-serif font-bold mb-3">{"Event Success"}</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-3xl font-bold text-primary">{event.attendees}</div>
                          <div className="text-sm text-muted-foreground">{"Happy Attendees"}</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-primary">{"5.0"}</div>
                          <div className="text-sm text-muted-foreground">{"Average Rating"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Photo Gallery */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-center">{"Photo Gallery"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {event.gallery.map((image: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`${event.title} photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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
