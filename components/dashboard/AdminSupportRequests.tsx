'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { MessageSquare, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-[var(--surface-raised)] text-[var(--text-muted)]',
  MEDIUM: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  HIGH: 'bg-orange-500/10 text-orange-500',
  URGENT: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
}

const TYPE_LABELS: Record<string, string> = {
  CASH_REQUEST: 'Cash Request',
  MAINTENANCE: 'Maintenance',
  INVENTORY: 'Inventory',
  STAFF: 'Staff',
  OTHER: 'Other',
}

export default function AdminSupportRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/branch-requests')
        const data = await res.json()
        if (!cancelled && data.requests) {
          setRequests(data.requests.filter((r: any) => r.status === 'PENDING'))
        }
      } catch {}
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const handleAction = async (requestId: number, status: 'IN_PROGRESS' | 'RESOLVED') => {
    setActionLoadingId(requestId)
    const t = toast.loading(status === 'RESOLVED' ? 'Marking resolved…' : 'Updating…')
    try {
      const res = await fetch('/api/branch-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(status === 'RESOLVED' ? 'Marked as resolved' : 'Marked in progress', { id: t })
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading || requests.length === 0) return null

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <MessageSquare size={16} className="text-[var(--accent)]" />
          Pending Support Requests
          <span className="ml-1 text-xs font-bold bg-[var(--accent)] text-white rounded-full px-1.5 py-0.5 leading-none">{requests.length}</span>
        </div>
        <Link href="/admin/requests" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
          View all <ExternalLink size={11} />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {requests.slice(0, 5).map(req => (
          <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--text-primary)]">{req.branch?.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[req.priority] ?? PRIORITY_COLORS.MEDIUM}`}>
                  {req.priority}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                  {TYPE_LABELS[req.type] ?? req.type}
                </span>
              </div>
              <p className="mt-1 text-[var(--text-secondary)] text-xs line-clamp-2">{req.description}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                {req.requestedBy?.username} · {new Date(req.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoadingId === req.id}
                onClick={() => handleAction(req.id, 'IN_PROGRESS')}
                className="text-xs h-7"
              >
                In Progress
              </Button>
              <Button
                size="sm"
                disabled={actionLoadingId === req.id}
                onClick={() => handleAction(req.id, 'RESOLVED')}
                className="text-xs h-7"
              >
                {actionLoadingId === req.id
                  ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : 'Resolve'}
              </Button>
            </div>
          </div>
        ))}
        {requests.length > 5 && (
          <Link href="/admin/requests" className="text-xs text-center text-[var(--accent)] hover:underline py-1">
            +{requests.length - 5} more pending requests →
          </Link>
        )}
      </div>
    </div>
  )
}
