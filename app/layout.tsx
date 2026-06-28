import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { Providers } from '@/components/Providers'
import { Toaster } from 'react-hot-toast'

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
    <html
      lang="en"
      style={{
        ['--font-body' as string]: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
        ['--font-display' as string]: '"Fraunces", Georgia, "Times New Roman", serif',
      }}
    >
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
