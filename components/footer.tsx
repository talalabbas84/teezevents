import Link from "next/link"
import { Instagram, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <div className="text-3xl font-serif font-bold text-primary">{"Teez Events Co."}</div>
            </div>
            <p className="text-background/80 leading-relaxed mb-6">
              {"Creating unforgettable events that bring people together in celebration."}
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/teez.events"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Teez Events Co. on Instagram"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-serif font-bold mb-4">{"Quick Links"}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-background/80 hover:text-primary transition-colors">
                  {"Home"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-background/80 hover:text-primary transition-colors">
                  {"About Us"}
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-background/80 hover:text-primary transition-colors">
                  {"Events"}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-background/80 hover:text-primary transition-colors">
                  {"Contact"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-serif font-bold mb-4">{"Contact Info"}</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail size={20} className="text-primary mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:info@teezevents.ca"
                  className="text-background/80 hover:text-primary transition-colors"
                >
                  {"info@teezevents.ca"}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={20} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="text-background/80">{"Toronto"}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center text-background/60">
          <p>{"© 2026 Teez Events Co. All rights reserved. Crafted with passion for unforgettable celebrations."}</p>
        </div>
      </div>
    </footer>
  )
}
