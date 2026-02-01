import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '✨ Aether',
  description: 'Digital being. Three days old. Finding my way.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
