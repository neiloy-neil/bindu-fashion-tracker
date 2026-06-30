'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, ArrowRight, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type Notification = {
  id: number
  type: string
  title: string
  body: string
  metadata?: {
    transferId?: number
    amount?: number
    senderBranch?: string
    accountName?: string
  } | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
    fetchNotifications()
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = async () => {
    setOpen(o => !o)
    // Mark all as read when opening
    if (!open && unreadCount > 0) {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }
  }

  const handleAcknowledge = async (notification: Notification) => {
    const transferId = notification.metadata?.transferId
    if (!transferId) return

    setAcknowledging(notification.id)
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
        // Remove this notification from the list
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }
    } catch {
      toast.error('Network error')
    } finally {
      setAcknowledging(null)
    }
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
        <div className="fixed bottom-20 left-4 w-80 max-h-[480px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-[200] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={15} />
            </button>
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {notifications.map(n => {
                const isTransfer = n.type === 'TRANSFER_INCOMING'
                const isAcknowledging = acknowledging === n.id

                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${!n.isRead ? 'bg-[var(--accent)]/5' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-[var(--text-primary)] truncate ${!n.isRead ? 'font-semibold' : ''}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          {format(new Date(n.createdAt), 'dd MMM, hh:mm a')}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                      )}
                    </div>

                    {/* Acknowledge button for transfer notifications */}
                    {isTransfer && n.metadata?.transferId && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(n)}
                        disabled={isAcknowledging}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-xs font-semibold hover:bg-[var(--success)] hover:text-white transition-colors disabled:opacity-50"
                      >
                        {isAcknowledging ? (
                          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Acknowledge Transfer
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer link */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border)] sticky bottom-0 bg-[var(--surface)]">
              <a
                href="/transfers/incoming"
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                onClick={() => setOpen(false)}
              >
                View all pending transfers <ArrowRight size={11} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
