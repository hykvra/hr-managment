import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'hrjo.in — HR Portal Platform',
    template: '%s | hrjo.in',
  },
  description: 'Modern HR management for growing teams — attendance, payroll, leaves, and more on your own subdomain.',
  metadataBase: new URL('https://hrjo.in'),
  openGraph: {
    siteName: 'hrjo.in',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
