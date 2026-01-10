"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from "next/image"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/events", label: "Events" },
    { href: "/team", label: "Meet The Team" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "shadow-xl" : "shadow-lg"
      }`}
      style={{
        backgroundColor: isScrolled ? "#F7EDDB" : "rgba(247, 237, 219, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: isScrolled ? "2px solid #D88C4A" : "1px solid rgba(197, 122, 58, 0.15)",
      }}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-14 h-14 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 animate-flame-flicker">
              <Image src="/images/image.png" alt="Teez Events Logo" fill className="object-contain drop-shadow-lg" />
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-serif font-bold text-gradient leading-none tracking-tight">TEEZ</div>
              <div className="text-xs font-sans uppercase tracking-widest font-semibold" style={{ color: "#B86A2E" }}>
                Events
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-bold relative group animate-fade-in uppercase tracking-wide"
                style={{ color: "#2B2B2B", animationDelay: `${index * 0.1}s` }}
              >
                {item.label}
                <span
                  className="absolute bottom-[-6px] left-0 w-0 h-1 transition-all duration-400 group-hover:w-full rounded-full"
                  style={{ backgroundColor: "#D88C4A" }}
                />
              </Link>
            ))}
            <Button
              className="magnetic-button font-bold shadow-xl hover:shadow-2xl text-base px-8 py-6"
              style={{ backgroundColor: "#C57A3A", color: "white" }}
            >
              Book Now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 transition-all duration-300 hover:scale-110"
            style={{ color: "#C57A3A" }}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-6 border-t-2 animate-fade-in" style={{ borderColor: "#D88C4A" }}>
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-bold transition-all duration-300 py-3 uppercase tracking-wide hover:pl-4"
                  style={{ color: "#2B2B2B" }}
                >
                  {item.label}
                </Link>
              ))}
              <Button className="w-full mt-4 font-bold py-6" style={{ backgroundColor: "#C57A3A", color: "white" }}>
                Book Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
