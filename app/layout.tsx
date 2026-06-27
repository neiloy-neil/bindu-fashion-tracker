import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { Providers } from '@/components/Providers'
import { Toaster } from 'react-hot-toast'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bindu Premium — Tracking & Insights',
  description: 'Monthly sales, payments and expenditure management for Bindu Premium',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="transition-colors duration-300 font-sans antialiased text-[var(--text-primary)] bg-[var(--bg-primary)]">
        <Providers>
          <Toaster position="top-right" toastOptions={{ className: 'dark-toast' }} />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
