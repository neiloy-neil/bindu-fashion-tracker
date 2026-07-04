import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Eye } from 'lucide-react'
import EntryViewModal from '@/components/dashboard/EntryViewModal'
import { Button } from '@/components/ui/button'

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [viewingEntry, setViewingEntry] = useState<{ entry: any, changes: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchRequests = async () => {
      try {
        const res = await fetch('/api/edit-requests')
        const data = await res.json()
        if (!cancelled && data.requests) {
          setRequests(data.requests.filter((r: any) => r.status === 'PENDING'))
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchRequests()

    return () => {
      cancelled = true
    }
  }, [])

  const handleAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(requestId)
    const t = toast.loading(status === 'APPROVED' ? 'Applying changes…' : 'Rejecting request…')
    try {
      const res = await fetch('/api/edit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status })
      })
      if (!res.ok) throw new Error('Failed to update request')
      toast.success(`Request ${status.toLowerCase()}`, { id: t })
      setRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading || requests.length === 0) return null

  const describeChanges = (changesStr: string, entry: any) => {
    try {
      const changes = JSON.parse(changesStr)
      const lines: string[] = []

      if (Array.isArray(changes.items) && changes.items.length > 0) {
        changes.items.forEach((item: any) => {
          const current = entry?.items?.find((i: any) => i.categoryId === item.categoryId)
          const catName = current?.category?.name || `Category #${item.categoryId}`
          const from = current ? `৳${Number(current.amount).toLocaleString()}` : 'new'
          lines.push(`Income "${catName}": ${from} → ৳${Number(item.amount).toLocaleString()}`)
        })
      }

      if (Array.isArray(changes.expenseEntries) && changes.expenseEntries.length > 0) {
        changes.expenseEntries.forEach((exp: any) => {
          const current = entry?.expenseEntries?.find((e: any) => e.id === exp.id)
          const catName = current?.category?.name || `Expense #${exp.id}`
          const from = current ? `৳${Number(current.amount).toLocaleString()}` : 'new'
          lines.push(`Expense "${catName}": ${from} → ৳${Number(exp.amount).toLocaleString()}`)
        })
      }

      if (changes.actualPhysicalCash !== undefined)
        lines.push(`Physical cash: ৳${Number(changes.actualPhysicalCash).toLocaleString()}`)
      if (changes.openingTime !== undefined)
        lines.push(`Opening time: ${changes.openingTime}`)
      if (changes.closingTime !== undefined)
        lines.push(`Closing time: ${changes.closingTime}`)
      if (changes.notes !== undefined)
        lines.push(`Notes updated`)
      if (changes.cashDifferenceNote !== undefined)
        lines.push(`Discrepancy note updated`)

      return lines.length > 0 ? lines : ['No recognised changes']
    } catch {
      return ['Pending field changes']
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--warning)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-lg">⚠️</span> Pending Edit Requests
      </div>
      <div className="flex flex-col gap-3">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm animate-pop-in">
            <div>
              <div className="font-semibold text-[var(--text-primary)]">
                {req.entry.branch.name} Branch <span className="text-[var(--text-muted)]">— for entry on {formatDate(req.entry.date)}</span>
              </div>
              <div className="mt-1 text-[var(--text-secondary)]">
                Reason: <span className="italic">{req.reason || 'No reason provided'}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--warning)] space-y-0.5">
                {describeChanges(req.changes, req.entry).map((line: string, i: number) => (
                  <div key={i}>→ {line}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10" title="View Full Entry" onClick={() => setViewingEntry({ entry: req.entry, changes: req.changes })}>
                <Eye size={18} />
              </Button>
              <Button size="sm" disabled={actionLoadingId === req.id} onClick={() => handleAction(req.id, 'APPROVED')}>
                {actionLoadingId === req.id ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Approve'}
              </Button>
              <Button variant="outline" size="sm" disabled={actionLoadingId === req.id} onClick={() => handleAction(req.id, 'REJECTED')}>Reject</Button>
            </div>
          </div>
        ))}
      </div>

      {viewingEntry && (
        <EntryViewModal
          entry={viewingEntry.entry}
          changesStr={viewingEntry.changes}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </div>
  )
}
