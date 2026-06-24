'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useState } from 'react'
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
    return <div className="min-h-screen bg-[var(--bg-primary)]">{children}</div>
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar items-center justify-between p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] fixed top-0 w-full z-40 flex md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/bindu-logo.webp" alt="Bindu Premium" width={28} height={28} className="object-contain" />
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">
            Bindu Premium
          </h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[var(--text-primary)] p-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />
      
      <div className="main-content">
        {children}
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  )
}
