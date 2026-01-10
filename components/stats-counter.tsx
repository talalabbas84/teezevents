"use client"

import { useEffect, useState, useRef } from "react"

interface StatCounterProps {
  end: number
  duration?: number
  suffix?: string
  label: string
}

function StatCounter({ end, duration = 2000, suffix = "", label }: StatCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateCount = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

      setCount(Math.floor(end * easeProgress))

      if (now < endTime) {
        requestAnimationFrame(updateCount)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(updateCount)
  }, [isVisible, end, duration])

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl md:text-6xl font-bold text-primary mb-2">
        {count}
        {suffix}
      </div>
      <div className="text-lg text-muted-foreground">{label}</div>
    </div>
  )
}

export function StatsCounterSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCounter end={500} suffix="+" label="Events Hosted" />
          <StatCounter end={50} suffix="K+" label="Happy Guests" />
          <StatCounter end={10} suffix="+" label="Years Experience" />
          <StatCounter end={98} suffix="%" label="Client Satisfaction" />
        </div>
      </div>
    </section>
  )
}
