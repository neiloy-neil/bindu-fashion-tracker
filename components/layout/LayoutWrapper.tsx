'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import { CommandPalette } from '@/components/shared/CommandPalette'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [mobileMenuState, setMobileMenuState] = useState({ open: false, path: pathname })
  const mobileMenuOpen = mobileMenuState.open && mobileMenuState.path === pathname

  const setMobileMenuOpen = (open: boolean) => {
    setMobileMenuState({
      open,
      path: open ? pathname : mobileMenuState.path,
    })
  }

  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isLoginPage) {
    return <div className="min-h-screen bg-[var(--background)]">{children}</div>
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar fixed top-0 left-0 right-0 z-40 h-[60px] flex items-center justify-between px-4 bg-[var(--surface)] border-b border-[var(--border)] md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/bindu-logo.webp" width={26} height={26} className="object-contain" alt="Bindu" />
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">
            Bindu Premium
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />

      <div className="main-content">
        {children}
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  )
}
