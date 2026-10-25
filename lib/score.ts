/** How a match score reads: the bands the match analysis is asked to use. */
export function scoreTone(score: number) {
  if (score >= 85)
    return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Ready to apply" }
  if (score >= 60) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Worth tailoring" }
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "Weak fit" }
}
