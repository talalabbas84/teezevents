"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import Image from "next/image"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
]

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

  return (
    <nav
      className={`safe-top-pad fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "shadow-xl" : "shadow-lg"
      }`}
      style={{
        backgroundColor: isScrolled ? "#F7EDDB" : "rgba(247, 237, 219, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: isScrolled ? "2px solid #D88C4A" : "1px solid rgba(197, 122, 58, 0.15)",
      }}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between sm:h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14">
              <Image src="/images/image.png" alt="Teez Events Co. Logo" fill className="object-contain drop-shadow-lg" />
            </div>
            <div className="flex flex-col">
              <div className="text-2xl font-serif font-bold text-gradient leading-none tracking-tight sm:text-3xl">TEEZ</div>
              <div className="text-xs font-sans uppercase tracking-widest font-semibold" style={{ color: "#B86A2E" }}>
                Events Co.
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
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C57A3A]/20 bg-[#F7EDDB]/80 transition-all duration-300 hover:scale-105 md:hidden"
            style={{ color: "#C57A3A" }}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="animate-fade-in border-t-2 py-3 md:hidden" style={{ borderColor: "#D88C4A" }}>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="min-h-12 rounded-2xl px-3 py-3 text-base font-bold uppercase tracking-wide transition-all duration-300 hover:bg-white/60"
                  style={{ color: "#2B2B2B" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
