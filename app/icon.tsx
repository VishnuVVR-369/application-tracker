import { ImageResponse } from "next/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #34d399 0%, #10b981 55%, #059669 100%)",
          borderRadius: 16,
        }}
      >
        <svg viewBox="0 0 24 24" width="42" height="42" fill="none">
          <path
            d="M4.5 17.25V14.5M10.5 17.25v-5.5M16.5 17.25V7.75"
            stroke="#022c22"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4.5 11.5 10.5 8l6-4.5M13.6 3.5h2.9v2.9"
            stroke="#022c22"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 19.5h15" stroke="#022c22" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size
  )
}
