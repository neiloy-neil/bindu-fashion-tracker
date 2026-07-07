'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { Moon, Sun, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'ADMIN' | 'SUPER_ADMIN' | 'ACCOUNTS' | 'BRANCH' | 'AUDITOR' | 'AREA_MANAGER' | 'HR_ADMIN' | null

type SectionKey = 'main' | 'cashflow' | 'hr' | 'payroll' | 'parties' | 'wholesale' | 'manage' | 'system'

const SECTION_PATHS: Record<SectionKey, string[]> = {
  main:      ['/'],
  cashflow:  ['/entries', '/transfers', '/reports'],
  hr:        ['/hr/employees', '/hr/attendance', '/hr/leaves'],
  payroll:   ['/hr/slips', '/hr/salary', '/hr/eid', '/hr/feed'],
  parties:   ['/parties', '/admin/cheques'],
  wholesale: ['/wholesale'],
  manage:    ['/admin/users', '/branches', '/categories'],
  system:    ['/admin/settings', '/admin/requests', '/admin/audit-logs', '/admin/discrepancies', '/admin/activity', '/requests'],
}

function activeSection(pathname: string): SectionKey {
  for (const [key, paths] of Object.entries(SECTION_PATHS) as [SectionKey, string[]][]) {
    if (paths.some(p => p === '/' ? pathname === '/' : pathname.startsWith(p))) return key
  }
  return 'main'
}

export function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [isLightMode, setIsLightMode] = useState(false)
  const [pendingTransfers, setPendingTransfers] = useState(0)
  const [pendingCheques, setPendingCheques] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [open, setOpen] = useState<Set<SectionKey>>(() => new Set([activeSection(pathname)]))

  // On mobile, expand all sections; always keep active section open when navigating
  useEffect(() => {
    if (window.innerWidth < 769) {
      setOpen(new Set<SectionKey>(['main','cashflow','hr','payroll','parties','wholesale','manage','system']))
    }
  }, [])

  useEffect(() => {
    const active = activeSection(pathname)
    setOpen(prev => { const next = new Set(prev); next.add(active); return next })
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
        const lightMode = savedTheme !== 'dark'
        document.documentElement.classList.toggle('light', lightMode)

        const [sessionRes, transferRes, chequeRes, requestsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/transfers/pending-count'),
          fetch('/api/cheques?status=PENDING'),
          fetch('/api/branch-requests'),
        ])
        const session = await sessionRes.json()
        const transferData = await transferRes.json()
        const chequeData: unknown = await chequeRes.json()
        const requestsData: unknown = await requestsRes.json()

        if (!cancelled) {
          setIsLightMode(lightMode)
          if (session?.user) setRole(session.user.role)
          if (transferData && typeof transferData.count === 'number') setPendingTransfers(transferData.count)
          if (Array.isArray(chequeData)) setPendingCheques(chequeData.length)
          if (requestsData && typeof requestsData === 'object' && 'requests' in requestsData && Array.isArray((requestsData as any).requests)) {
            const pending = (requestsData as any).requests.filter((r: any) => r.status === 'PENDING').length
            setPendingRequests(pending)
          }
        }
      } catch (e) { console.error(e) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const toggleSection = useCallback((key: SectionKey) => {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
    router.refresh()
  }

  const toggleTheme = () => {
    const next = !isLightMode
    setIsLightMode(next)
    document.documentElement.classList.toggle('light', next)
    localStorage.setItem('theme', next ? 'light' : 'dark')
  }

  // Section header — clickable, chevron, divider line
  const section = (key: SectionKey, label: string, first = false) => {
    const isOpen = open.has(key)
    return (
      <button
        onClick={() => toggleSection(key)}
        className={cn(
          'flex items-center gap-2 w-full px-3 pb-1 group',
          first ? 'pt-2' : 'pt-4'
        )}
      >
        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap group-hover:text-[var(--text-secondary)] transition-colors">
          {label}
        </span>
        <span className="flex-1 h-px bg-[var(--border)]" />
        <ChevronDown
          size={12}
          className={cn(
            'text-[var(--text-muted)] transition-transform duration-200 flex-shrink-0',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
    )
  }

  // Nav item
  const item = (href: string, label: string, icon: React.ReactNode, badge?: number) => {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsOpen?.(false)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[13px] font-medium',
          'transition-all duration-150 w-full active:scale-[0.97] select-none',
          isActive
            ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
        )}
      >
        <span className="w-[16px] h-[16px] flex-shrink-0 flex items-center justify-center opacity-80">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge ? (
          <span className="text-[10px] font-bold bg-[var(--accent)] text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ml-auto flex-shrink-0">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    )
  }

  // Collapsible items wrapper
  const items = (key: SectionKey, children: React.ReactNode) => (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        open.has(key) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      {children}
    </div>
  )

  return (
    <>
      <aside className={`sidebar z-50 ${isOpen ? 'mobile-open' : ''}`}>

        {/* Logo — hidden on mobile (top bar already shows it) */}
        <div className="hidden md:flex items-center gap-2.5 h-13 px-4 border-b border-[var(--border)] flex-shrink-0">
          <img src="/bindu-logo.webp" style={{ width: '26px', height: 'auto' }} className="object-contain flex-shrink-0" alt="Bindu" />
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-none">Bindu Premium</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-none">Tracking & Insights</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">

          {/* Main */}
          {section('main', 'Main', true)}
          {items('main', <>
            {item('/', 'Dashboard', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>)}
          </>)}

          {/* Cash Flow */}
          {role !== 'HR_ADMIN' && (<>
            {section('cashflow', 'Cash Flow')}
            {items('cashflow', <>
              {item('/entries/new', 'Daily Entry', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>)}
              {item('/entries', 'Entry History', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>)}
              {(role === 'BRANCH' || role === 'ADMIN' || role === 'AUDITOR' || role === 'AREA_MANAGER') && item('/transfers/incoming', 'Incoming Transfers', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>, pendingTransfers)}
              {role !== 'BRANCH' && item('/reports/daily', 'Daily Report', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>)}
              {role !== 'BRANCH' && item('/reports/monthly', 'Monthly Report', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>)}
            </>)}
          </>)}

          {/* HR */}
          {(role === 'ADMIN' || role === 'HR_ADMIN' || role === 'BRANCH') && (<>
            {section('hr', 'HR')}
            {items('hr', <>
              {item('/hr/employees', 'Employees', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)}
              {item('/hr/attendance', 'Attendance', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>)}
              {item('/hr/leaves', 'Leave Tracking', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>)}
            </>)}
          </>)}

          {/* Payroll */}
          {(role === 'ADMIN' || role === 'HR_ADMIN' || role === 'BRANCH') && (<>
            {section('payroll', 'Payroll')}
            {items('payroll', <>
              {item('/hr/slips', 'Salary Slips', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>)}
              {(role === 'ADMIN' || role === 'HR_ADMIN') && <>
                {item('/hr/salary', 'Salary Processing', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>)}
                {item('/hr/eid', 'Eid Bonus', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>)}
                {item('/hr/feed', 'Payroll History', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>)}
              </>}
            </>)}
          </>)}

          {/* Wholesale */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH' || role === 'ACCOUNTS' || role === 'AREA_MANAGER' || role === 'AUDITOR') && (<>
            {section('wholesale', 'Wholesale')}
            {items('wholesale', <>
              {item('/wholesale/challans', 'Challans', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>)}
              {item('/wholesale/buyers', 'Buyers', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)}
              {item('/wholesale/collections', 'Collections', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>)}
            </>)}
          </>)}

          {/* Parties & Payments */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (<>
            {section('parties', 'Parties & Payments')}
            {items('parties', <>
              {item('/parties', 'Party List', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>)}
              {item('/admin/cheques', 'Cheque Queue', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>, pendingCheques)}
            </>)}
          </>)}

          {/* Manage */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (<>
            {section('manage', 'Manage')}
            {items('manage', <>
              {item('/admin/users', 'Users', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)}
              {item('/branches', 'Branches', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>)}
              {item('/categories', 'Categories', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>)}
            </>)}
          </>)}

          {/* Support — BRANCH users */}
          {role === 'BRANCH' && (<>
            {section('system', 'Support')}
            {items('system', <>
              {item('/requests', 'My Requests', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>, pendingRequests)}
            </>)}
          </>)}

          {/* System — ADMIN / SUPER_ADMIN */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (<>
            {section('system', 'System')}
            {items('system', <>
              {role === 'ADMIN' && item('/admin/settings', 'Settings', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>)}
              {item('/admin/requests', 'Support Requests', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>, pendingRequests)}
              {item('/admin/audit-logs', 'Audit Logs', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>)}
              {item('/admin/discrepancies', 'Discrepancies', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)}
              {item('/admin/activity', 'Activity Feed', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>)}
            </>)}
          </>)}

        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-[var(--border)] px-3 py-2 space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-[6px] rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            {isLightMode ? <Moon size={15} /> : <Sun size={15} />}
            <span>{isLightMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-[6px] rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  )
}
