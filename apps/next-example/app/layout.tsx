import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
// globals.css pulls in '@liquefy-ui/react/tailwind.css', which imports the base
// stylesheet and fixes the layer order relative to Tailwind.
import './globals.css'

export const metadata: Metadata = {
  description: 'A Next.js App Router smoke test for @liquefy-ui/react.',
  title: 'liquefy-ui on Next.js',
}

export const viewport: Viewport = {
  themeColor: '#0b1020',
}

// A server component. It never reaches for 'use client' of its own.
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
)

export default RootLayout
