import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { Providers } from '@/components/Providers'
import { Toaster } from 'react-hot-toast'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Bindu Premium — Tracking & Insights',
  description: 'Monthly sales, payments and expenditure management for Bindu Premium',
  alternates: {
    canonical: process.env.NEXTAUTH_URL ?? 'https://bindu-fashion-tracker.vercel.app',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`light ${jakartaSans.variable} ${fraunces.variable}`}
    >
      <body className="transition-colors duration-300 font-sans antialiased text-[var(--text-primary)] bg-[var(--bg-primary)]">
        <Providers>
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              className: 'dark-toast',
              duration: 3500,
              success: { duration: 3000, iconTheme: { primary: 'var(--success)', secondary: 'var(--surface-raised)' } },
              error:   { duration: 5000, iconTheme: { primary: 'var(--danger)',  secondary: 'var(--surface-raised)' } },
              loading: { duration: Infinity, iconTheme: { primary: 'var(--accent)', secondary: 'var(--surface-raised)' } },
            }}
          />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
