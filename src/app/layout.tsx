import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GreenMag Procurement',
  description: 'Internal procurement, inventory and logistics system for GreenMag',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
