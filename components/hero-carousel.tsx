"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { roaring20sGallery } from "@/lib/events"

const slides = [
  {
    image: roaring20sGallery[0],
    title: "Events people dress up for",
    subtitle: "Immersive socials, ticketed nights, and private celebrations with a point of view.",
  },
  {
    image: roaring20sGallery[3],
    title: "Rooms with a real story",
    subtitle: "From Roaring 20s glamour to intimate invite-only gatherings, every detail has a job.",
  },
  {
    image: "/professional-event-setup-with-stage-and-decoration.jpg",
    title: "Production without the chaos",
    subtitle: "Concept, vendors, guest flow, ticketing, check-in, and day-of execution in one system.",
  },
]

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <section className="relative h-[82vh] min-h-[560px] max-h-[820px] overflow-hidden bg-[#111827]">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.image})`,
              transform: `translateY(${scrollY * 0.18}px) scale(1.08)`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.9),rgba(17,24,39,0.64)_48%,rgba(17,24,39,0.25))]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,#eadfcb,rgba(234,223,203,0))]" />

          <div className="relative flex h-full container mx-auto items-end px-4 pb-16 lg:px-8 lg:pb-20">
            <div className="max-w-4xl text-white">
              <div className="mb-6 overflow-hidden">
                <div className="relative w-24 h-24">
                  <Image
                    src="/images/screenshot-202026-01-10-20at-2012.png"
                    alt="Teez Events Flame"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="mb-6 overflow-hidden">
                <h1 className="text-5xl font-serif font-bold leading-tight text-balance animate-slide-in-left md:text-7xl lg:text-8xl">
                  {slide.title}
                </h1>
              </div>
              <div className="mb-8 overflow-hidden">
                <p className="max-w-3xl text-xl font-light leading-relaxed animate-slide-in-right stagger-2 md:text-2xl" style={{ color: "#EADFCB" }}>
                  {slide.subtitle}
                </p>
              </div>
              <div className="mb-9 h-1 w-32 rounded-full" style={{ backgroundColor: "#D88C4A" }} />
              <div className="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 shadow-2xl font-bold group"
                  style={{ backgroundColor: "#D88C4A", color: "#1C2431" }}
                  asChild
                >
                  <Link href="/events">
                    <Sparkles className="mr-3 w-6 h-6 group-hover:scale-125 transition-transform" />
                    Explore Events
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 text-lg px-8 py-6 bg-white/10 text-white font-bold hover:bg-white/20"
                  style={{ borderColor: "#D88C4A", borderWidth: "2px" }}
                  asChild
                >
                  <Link href="/events/roaring-20s">{"See Roaring 20s"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 rounded-lg border border-white/20 bg-black/30 p-3 text-white shadow-2xl transition-colors hover:bg-black/45 lg:left-8"
        aria-label="Previous slide"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 rounded-lg border border-white/20 bg-black/30 p-3 text-white shadow-2xl transition-colors hover:bg-black/45 lg:right-8"
        aria-label="Next slide"
      >
        <ChevronRight size={28} />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === currentSlide ? "w-20 shadow-lg" : "w-10 opacity-55 hover:opacity-80"
            }`}
            style={{ backgroundColor: "#D88C4A" }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
