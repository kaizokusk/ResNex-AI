// app/layout.tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from "./providers"
import './globals.css'

export const metadata: Metadata = {
  title: 'ResearchCollab — AI Collaborative Research Platform',
  description: 'AI-powered collaborative research workspace for STEM students and educators',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
