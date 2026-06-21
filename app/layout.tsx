import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Bindu Fashion — Sales & Expense Tracker',
  description: 'Monthly sales, payments and expenditure management for Bindu Fashion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="transition-colors duration-300">
        <Toaster position="top-right" toastOptions={{ className: 'dark-toast' }} />
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  )
}
