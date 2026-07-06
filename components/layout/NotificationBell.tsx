'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type Notification = {
  id: number
  type: string
  title: string
  body: string
  metadata?: Record<string, any> | null
  isRead: boolean
  createdAt: string
}

// Icon and link for each notification type
const TYPE_CONFIG: Record<string, { icon: string; href?: string }> = {
  TRANSFER_INCOMING:   { icon: '↙️', href: '/transfers/incoming' },
  LEAVE_REQUEST:       { icon: '🗓️', href: '/hr/leaves' },
  LEAVE_UPDATE:        { icon: '🗓️', href: '/hr/leaves' },
  EDIT_REQUEST:        { icon: '✏️', href: '/entries' },
  EDIT_REQUEST_UPDATE: { icon: '✏️', href: '/entries' },
  BRANCH_REQUEST:      { icon: '🛠️', href: '/admin/requests' },
  BRANCH_REQUEST_UPDATE:{ icon: '🛠️', href: '/requests' },
  EXPENSE_UPDATE:      { icon: '🧾', href: '/entries' },
  CHEQUE_UPDATE:       { icon: '💳', href: '/admin/cheques' },
  PAYMENT_PENDING:     { icon: '💰', href: '/admin/cheques' },
  PAYMENT_UPDATE:      { icon: '💰', href: '/entries' },
  DAILY_SUMMARY:       { icon: '📊', href: '/' },
  ENTRY_SUBMITTED:     { icon: '📋', href: '/entries' },
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch { /* silent */ }
  }

  useEffect(() => {
    setTimeout(() => fetchNotifications(), 0)
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = async () => {
    setOpen(o => !o)
    if (!open && unreadCount > 0) {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }
  }

  const handleAcknowledgeTransfer = async (n: Notification) => {
    const transferId = n.metadata?.transferId
    if (!transferId) return
    setAcknowledging(n.id)
    try {
      const res = await fetch(`/api/transfers/${transferId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACKNOWLEDGE' }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Failed to acknowledge transfer')
      } else {
        toast.success('Transfer acknowledged')
        setNotifications(prev => prev.filter(x => x.id !== n.id))
      }
    } catch {
      toast.error('Network error')
    } finally {
      setAcknowledging(null)
    }
  }

  const handleDismiss = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  const handleClearAll = async () => {
    setNotifications([])
    setUnreadCount(0)
    await fetch('/api/notifications', { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[520px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-[200] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button type="button" onClick={handleClearAll} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                  Clear all
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
              <Bell size={28} className="mx-auto mb-3 opacity-30" />
              You&apos;re all caught up
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: '🔔' }
                const isTransfer = n.type === 'TRANSFER_INCOMING'
                const isAcknowledging = acknowledging === n.id

                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${!n.isRead ? 'bg-[var(--accent)]/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <span className="text-lg leading-none mt-0.5 flex-shrink-0">{cfg.icon}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] text-[var(--text-primary)] leading-snug ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                            <button
                              type="button"
                              onClick={() => handleDismiss(n.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Dismiss"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          {format(new Date(n.createdAt), 'dd MMM, hh:mm a')}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          {cfg.href && (
                            <a
                              href={cfg.href}
                              onClick={() => setOpen(false)}
                              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                            >
                              View →
                            </a>
                          )}
                          {isTransfer && n.metadata?.transferId && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeTransfer(n)}
                              disabled={isAcknowledging}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] text-[11px] font-semibold hover:bg-[var(--success)] hover:text-white transition-colors disabled:opacity-50"
                            >
                              {isAcknowledging
                                ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                : <Check size={11} />}
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
