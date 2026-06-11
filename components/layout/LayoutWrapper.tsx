'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#0a0f18]">{children}</div>
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar items-center justify-between p-4 bg-[#0a0f18] border-b border-[#1e2d45] fixed top-0 w-full z-40">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] bg-clip-text text-transparent">
          Bindu Fashion
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
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
    </div>
  )
}
