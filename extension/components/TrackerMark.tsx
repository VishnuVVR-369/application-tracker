import type { SVGProps } from "react"

export function TrackerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4.5 17.25V14.5M10.5 17.25v-5.5M16.5 17.25V7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.5 11.5 10.5 8l6-4.5M13.6 3.5h2.9v2.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 19.5h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
