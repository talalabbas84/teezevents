"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"
import { useState, useEffect } from "react"

const testimonials = [
  {
    name: "Jennifer Martinez",
    role: "Corporate Events Manager",
    company: "Tech Solutions Inc.",
    image: "/testimonial-jennifer-martinez.jpg",
    rating: 5,
    text: "Teez Events transformed our company anniversary into an unforgettable celebration. The live entertainment was a huge hit with our team, and the attention to detail was impeccable. Highly recommend!",
  },
  {
    name: "Michael Chen",
    role: "Wedding Couple",
    company: "Wedding Reception",
    image: "/testimonial-michael-chen.jpg",
    rating: 5,
    text: "Our wedding reception was beyond our wildest dreams! The team at Teez Events brought our vision to life with stunning decor, amazing food, and entertainment that kept everyone dancing all night. Thank you for making our special day perfect!",
  },
  {
    name: "Sophia Rodriguez",
    role: "Event Organizer",
    company: "Community Arts Center",
    image: "/testimonial-sophia-rodriguez.jpg",
    rating: 5,
    text: "We've worked with Teez Events on multiple community celebrations, and they never disappoint. Their passion for creating memorable celebrations and expertise in event planning shines through in every detail. True professionals!",
  },
  {
    name: "David Thompson",
    role: "CEO",
    company: "Thompson & Associates",
    image: "/testimonial-david-thompson.jpg",
    rating: 5,
    text: "From the initial consultation to the final moment of our corporate gala, Teez Events exceeded our expectations. Professional, creative, and incredibly organized. Our clients were impressed!",
  },
  {
    name: "Maria Gonzalez",
    role: "Birthday Celebration",
    company: "Private Event",
    image: "/testimonial-maria-gonzalez.jpg",
    rating: 5,
    text: "My 50th birthday party was absolutely spectacular! The themed decorations, live salsa band, and authentic cuisine created an atmosphere that transported us to another world. My guests are still talking about it!",
  },
  {
    name: "Robert Williams",
    role: "Director of Operations",
    company: "National Retail Group",
    image: "/testimonial-robert-williams.jpg",
    rating: 5,
    text: "Teez Events handled our year-end celebration for 500+ employees flawlessly. The logistics were complex, but they made it look easy. Outstanding service and truly memorable experience for everyone.",
  },
]

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 3) % testimonials.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const visibleTestimonials = [
    testimonials[currentIndex % testimonials.length],
    testimonials[(currentIndex + 1) % testimonials.length],
    testimonials[(currentIndex + 2) % testimonials.length],
  ]

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Quote className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-balance">{"What Our Clients Say"}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {"Don't just take our word for it. Here's what our clients have to say about their Teez Events experience."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {visibleTestimonials.map((testimonial, index) => (
            <Card
              key={`${testimonial.name}-${index}`}
              className="border-2 hover:border-primary transition-all hover:shadow-xl group animate-fade-in"
            >
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                    <img
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-serif font-bold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index * 3)}
              className={`w-3 h-3 rounded-full transition-all ${
                Math.floor(currentIndex / 3) === index ? "bg-primary w-8" : "bg-primary/30 hover:bg-primary/50"
              }`}
              aria-label={`Go to testimonials page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
