"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const slides = [
  {
    image: "/vibrant-latin-dance-party-with-colorful-lights.jpg",
    title: "Ignite Your Celebrations",
    subtitle: "Where Latin Culture Meets Unforgettable Moments",
  },
  {
    image: "/elegant-themed-party-halloween-event-atmosphere.jpg",
    title: "Themed Parties That Dazzle",
    subtitle: "From Roaring 20s to Spooktacular Halloween Nights",
  },
  {
    image: "/professional-event-setup-with-stage-and-decoration.jpg",
    title: "Premium Event Production",
    subtitle: "Every Detail, Perfectly Orchestrated",
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
    <div className="relative h-screen min-h-[750px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center parallax"
            style={{
              backgroundImage: `url(${slide.image})`,
              transform: `translateY(${scrollY * 0.4}px) scale(1.15)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1C2431]/80 via-[#2B2B2B]/60 to-[#1C2431]/90" />

          <div className="relative h-full container mx-auto px-4 lg:px-8 flex items-center">
            <div className="max-w-5xl text-white">
              <div className="mb-8 overflow-hidden">
                <div className="relative w-24 h-24">
                  <Image
                    src="/images/screenshot-202026-01-10-20at-2012.png"
                    alt="Teez Events Flame"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="overflow-hidden mb-8">
                <h1 className="text-7xl md:text-9xl font-serif font-bold text-balance leading-none animate-slide-in-left tracking-tight">
                  {slide.title}
                </h1>
              </div>
              <div className="overflow-hidden mb-10">
                <p
                  className="text-3xl md:text-4xl font-light animate-slide-in-right stagger-2 tracking-wide"
                  style={{ color: "#EADFCB" }}
                >
                  {slide.subtitle}
                </p>
              </div>
              <div className="h-1.5 w-40 mb-12 rounded-full animate-shimmer" style={{ backgroundColor: "#D88C4A" }} />
              <div className="flex flex-wrap gap-6 animate-fade-in-up stagger-3">
                <Button
                  size="lg"
                  className="magnetic-button text-xl px-12 py-8 shadow-2xl hover:shadow-3xl font-bold group"
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
                  className="magnetic-button border-3 text-xl px-12 py-8 glass-dark text-white font-bold hover:bg-white/25 bg-transparent"
                  style={{ borderColor: "#D88C4A", borderWidth: "2px" }}
                  asChild
                >
                  <Link href="/contact">Let's Talk</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-8 lg:left-12 top-1/2 -translate-y-1/2 p-5 rounded-full glass-dark text-white hover:scale-125 transition-all duration-300 shadow-2xl group"
        aria-label="Previous slide"
        style={{ backgroundColor: "rgba(216, 140, 74, 0.3)" }}
      >
        <ChevronLeft size={36} className="group-hover:-translate-x-2 transition-transform" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-8 lg:right-12 top-1/2 -translate-y-1/2 p-5 rounded-full glass-dark text-white hover:scale-125 transition-all duration-300 shadow-2xl group"
        aria-label="Next slide"
        style={{ backgroundColor: "rgba(216, 140, 74, 0.3)" }}
      >
        <ChevronRight size={36} className="group-hover:translate-x-2 transition-transform" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              index === currentSlide ? "w-32 shadow-lg animate-glow" : "w-16 opacity-50 hover:opacity-80"
            }`}
            style={{ backgroundColor: "#D88C4A" }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full opacity-40 animate-float"
          style={{ backgroundColor: "#D88C4A" }}
        />
        <div
          className="absolute top-3/4 right-1/3 w-3 h-3 rounded-full opacity-30 animate-float-delayed"
          style={{ backgroundColor: "#C57A3A" }}
        />
        <div
          className="absolute bottom-1/4 left-2/3 w-5 h-5 rounded-full opacity-25 animate-float"
          style={{ backgroundColor: "#B86A2E" }}
        />
      </div>
    </div>
  )
}
