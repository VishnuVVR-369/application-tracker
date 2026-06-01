"use client"

import * as React from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────
   MeshBackground — animated emerald→cyan→blue→violet gradient-mesh blobs.
   Fixed behind the app/landing chrome. "loud frame" of the zoned intensity.
   Blobs freeze automatically under prefers-reduced-motion (globals.css).
   ──────────────────────────────────────────────────────────────────────── */

type MeshVariant = "hero" | "app"

const blobSets: Record<
  MeshVariant,
  Array<{ color: string; size: string; top?: string; left?: string; right?: string; bottom?: string; anim: string; dur: string; opacity: number }>
> = {
  hero: [
    { color: "var(--brand)", size: "46rem", top: "-12rem", left: "-8rem", anim: "mesh-drift-a", dur: "22s", opacity: 0.5 },
    { color: "#38bdf8", size: "40rem", top: "-6rem", right: "-10rem", anim: "mesh-drift-b", dur: "26s", opacity: 0.42 },
    { color: "#818cf8", size: "38rem", bottom: "-16rem", left: "18%", anim: "mesh-drift-c", dur: "30s", opacity: 0.38 },
    { color: "#06b6d4", size: "30rem", bottom: "-10rem", right: "8%", anim: "mesh-drift-a", dur: "24s", opacity: 0.3 },
  ],
  app: [
    { color: "var(--brand)", size: "40rem", top: "-16rem", right: "-12rem", anim: "mesh-drift-b", dur: "30s", opacity: 0.22 },
    { color: "#38bdf8", size: "34rem", top: "20%", left: "-14rem", anim: "mesh-drift-c", dur: "34s", opacity: 0.16 },
    { color: "#818cf8", size: "32rem", bottom: "-18rem", right: "10%", anim: "mesh-drift-a", dur: "38s", opacity: 0.14 },
  ],
}

export function MeshBackground({
  variant = "app",
  className,
}: {
  variant?: MeshVariant
  className?: string
}) {
  const blobs = blobSets[variant]
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {blobs.map((b, i) => (
        <span
          key={i}
          className="mesh-blob"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            opacity: b.opacity,
            background: b.color,
            animation: `${b.anim} ${b.dur} ease-in-out infinite`,
          }}
        />
      ))}
      {/* subtle vignette so content stays readable over the mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_30%,var(--surface-0)_100%)]" />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   Motion primitives — orchestrated entrance + stagger.
   ──────────────────────────────────────────────────────────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const

export function FadeIn({
  children,
  delay = 0,
  y = 14,
  className,
  as = "div",
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: "div" | "section" | "li" | "header"
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] as typeof motion.div
  return (
    <MotionTag
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={staggerParent}
      initial={reduce ? false : "hidden"}
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  )
}

/* Reveal on scroll-into-view — for long marketing pages. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Animated count-up for KPI/metric numbers (tabular). */
export function CountUp({
  value,
  className,
  suffix = "",
}: {
  value: number
  className?: string
  suffix?: string
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = React.useState(0)

  React.useEffect(() => {
    // setState only ever happens inside the rAF callback (never synchronously
    // in the effect body), so reduced-motion just uses a zero-length tween.
    let raf = 0
    const start = performance.now()
    const dur = reduce ? 0 : 900
    const tick = (now: number) => {
      const t = dur === 0 ? 1 : Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce])

  return (
    <span className={cn("tabular", className)}>
      {display}
      {suffix}
    </span>
  )
}
