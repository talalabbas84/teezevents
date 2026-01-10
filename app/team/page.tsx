import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Linkedin, Mail } from "lucide-react"

const teamMembers = [
  {
    name: "Sofia Martinez",
    role: "Founder & Creative Director",
    image: "/team-member-sofia-martinez.jpg",
    bio: "With over 15 years in event planning and a deep passion for Latin culture, Sofia founded Teez Events to bring authentic celebrations to life.",
    linkedin: "https://linkedin.com",
    email: "sofia@teezevents.com",
  },
  {
    name: "Carlos Rivera",
    role: "Event Production Manager",
    image: "/team-member-carlos-rivera.jpg",
    bio: "Carlos ensures every event runs flawlessly, managing logistics, vendors, and on-site operations with precision and care.",
    linkedin: "https://linkedin.com",
    email: "carlos@teezevents.com",
  },
  {
    name: "Isabella Torres",
    role: "Design & Decor Specialist",
    image: "/team-member-isabella-torres.jpg",
    bio: "Isabella transforms spaces into immersive experiences, bringing creative visions to life through stunning design and attention to detail.",
    linkedin: "https://linkedin.com",
    email: "isabella@teezevents.com",
  },
  {
    name: "Miguel Santos",
    role: "Entertainment Coordinator",
    image: "/team-member-miguel-santos.jpg",
    bio: "Miguel curates unforgettable entertainment experiences, connecting with the best Latin artists, DJs, and performers.",
    linkedin: "https://linkedin.com",
    email: "miguel@teezevents.com",
  },
  {
    name: "Ana Lucia Gomez",
    role: "Client Relations Manager",
    image: "/team-member-ana-lucia-gomez.jpg",
    bio: "Ana ensures every client feels heard and valued, guiding them through the planning process with warmth and expertise.",
    linkedin: "https://linkedin.com",
    email: "ana@teezevents.com",
  },
  {
    name: "Diego Fernandez",
    role: "Culinary Experience Director",
    image: "/team-member-diego-fernandez.jpg",
    bio: "Diego brings authentic Latin flavors to every event, partnering with top chefs to create memorable culinary experiences.",
    linkedin: "https://linkedin.com",
    email: "diego@teezevents.com",
  },
]

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 text-balance animate-fade-in-up">
                {"Meet The Team"}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed animate-fade-in-up">
                {
                  "The passionate professionals behind every unforgettable Teez Events celebration. We're a diverse team united by our love for creating magical experiences."
                }
              </p>
            </div>
          </div>
        </section>

        {/* Team Members Grid */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <Card
                  key={index}
                  className="overflow-hidden border-2 hover:border-primary transition-all hover:shadow-xl group"
                >
                  <div className="relative overflow-hidden aspect-square">
                    <img
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-serif font-bold mb-1">{member.name}</h3>
                    <div className="text-primary font-medium mb-4">{member.role}</div>
                    <p className="text-muted-foreground leading-relaxed mb-6">{member.bio}</p>
                    <div className="flex gap-3">
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        aria-label="LinkedIn"
                      >
                        <Linkedin size={18} />
                      </a>
                      <a
                        href={`mailto:${member.email}`}
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        aria-label="Email"
                      >
                        <Mail size={18} />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

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
                href="mailto:careers@teezevents.com"
                className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:text-accent transition-colors"
              >
                <Mail size={20} />
                {"careers@teezevents.com"}
              </a>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
