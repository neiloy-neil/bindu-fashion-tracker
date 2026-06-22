'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

type Role = 'ADMIN' | 'BRANCH' | 'AUDITOR' | 'AREA_MANAGER' | 'HR_ADMIN' | null

export function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [isLightMode, setIsLightMode] = useState(false)
  const [pendingTransfers, setPendingTransfers] = useState(0)
  const [pendingCheques, setPendingCheques] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'light') {
        setIsLightMode(true)
        document.documentElement.classList.add('light')
      }
    }
    
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) setRole(session.user.role)
      })

    fetch('/api/transfers/pending-count')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.count === 'number') setPendingTransfers(data.count)
      })
      .catch(console.error)
      
    // Assuming we have an endpoint or we just check if it's needed. For now just set 0.
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
    router.refresh()
  }

  const navItem = (href: string, label: string, icon: React.ReactNode, badge?: number) => {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsOpen?.(false)}
        className={`nav-item ${isActive ? 'active' : ''}`}
        style={{ position: 'relative' }}
      >
        {icon}
        {label}
        {badge ? (
          <span style={{
            position: 'absolute',
            right: '12px',
            backgroundColor: 'var(--danger)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '9999px',
          }}>
            {badge}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}
      <aside className={`sidebar z-50 ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo flex items-center gap-3">
        <Image src="/bindu-logo.webp" alt="Bindu Premium" width={32} height={32} className="object-contain" />
        <div>
          <h1 className="font-display">Bindu Premium</h1>
          <p>Tracking & Insights</p>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* Main */}
        <div className="nav-section-title mt-2">Main</div>
        {navItem('/', 'Dashboard', (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ))}

        {/* Cash Flow */}
        {role !== 'HR_ADMIN' && (
          <div className="mt-4">
            <div className="nav-section-title">Cash Flow</div>
            {navItem('/entries/new', 'Daily Entry', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
              </svg>
            ))}
            {navItem('/entries', 'Entry History', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
              </svg>
            ))}
            {(role === 'BRANCH' || role === 'ADMIN' || role === 'AUDITOR' || role === 'AREA_MANAGER') && navItem('/transfers/incoming', 'Incoming Transfers', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            ), pendingTransfers)}
            {role !== 'BRANCH' && navItem('/reports/daily', 'Daily Report', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            ))}
          </div>
        )}

        {/* HR & Payroll */}
        {(role === 'ADMIN' || role === 'HR_ADMIN' || role === 'BRANCH') && (
          <div className="mt-4">
            <div className="nav-section-title">HR & Payroll</div>
            {(role === 'ADMIN' || role === 'HR_ADMIN') && (
              <>
                {navItem('/hr/employees', 'Employees', (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                ))}
                {navItem('/hr/salary', 'Salary Processing', (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                ))}
              </>
            )}
            {navItem('/hr/slips', 'Salary Slips', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            ))}
            {(role === 'ADMIN' || role === 'HR_ADMIN') && (
              <>
                {navItem('/hr/eid', 'Eid Bonus', (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                ))}
                {navItem('/hr/feed', 'Payroll History', (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                ))}
              </>
            )}
          </div>
        )}

        {/* Parties & Payments */}
        {role === 'ADMIN' && (
          <div className="mt-4">
            <div className="nav-section-title">Parties & Payments</div>
            {navItem('/parties', 'Party List', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect>
              </svg>
            ))}
            {navItem('/admin/cheques', 'Cheque Queue', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle>
              </svg>
            ), pendingCheques)}
          </div>
        )}

        {/* Admin Section */}
        {role === 'ADMIN' && (
          <div className="mt-4">
            <div className="nav-section-title">Admin</div>
            {navItem('/admin/users', 'Users', (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            ))}
            {navItem('/branches', 'Branches', (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            ))}
            {navItem('/categories', 'Categories', (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            ))}
            {navItem('/admin/requests', 'Support Requests', (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            ))}
            {navItem('/admin/audit-logs', 'Audit Logs', (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            ))}
            {navItem('/admin/settings', 'Settings', (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            ))}
          </div>
        )}
      </nav>

      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <button
          onClick={() => {
            const newTheme = !isLightMode
            setIsLightMode(newTheme)
            if (newTheme) {
              document.documentElement.classList.add('light')
              localStorage.setItem('theme', 'light')
            } else {
              document.documentElement.classList.remove('light')
              localStorage.setItem('theme', 'dark')
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {isLightMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
    </>
  )
}
