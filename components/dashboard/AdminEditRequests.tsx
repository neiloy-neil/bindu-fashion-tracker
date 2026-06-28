import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Eye } from 'lucide-react'
import EntryViewModal from '@/components/dashboard/EntryViewModal'
import { Button } from '@/components/ui/button'

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
    try {
      const res = await fetch('/api/edit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status })
      })
      if (!res.ok) throw new Error('Failed to update request')
      toast.success(`Request ${status.toLowerCase()}`)
      setRequests((current) => current.filter((request) => request.id !== requestId))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading || requests.length === 0) return null

  const describeChanges = (changesStr: string) => {
    try {
      const changes = JSON.parse(changesStr)
      if (Array.isArray(changes.items) && changes.items.length > 0) {
        return 'Items changed'
      }

      const keys = Object.keys(changes)
      return keys.length > 0 ? `${keys.join(', ')} changed` : 'Pending field changes'
    } catch {
      return 'Pending field changes'
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--warning)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-lg">⚠️</span> Pending Edit Requests
      </div>
      <div className="flex flex-col gap-3">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
            <div>
              <div className="font-semibold text-[var(--text-primary)]">
                {req.entry.branch.name} Branch <span className="text-[var(--text-muted)]">— for entry on {formatDate(req.entry.date)}</span>
              </div>
              <div className="mt-1 text-[var(--text-secondary)]">
                Reason: <span className="italic">{req.reason || 'No reason provided'}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--warning)]">
                {describeChanges(req.changes)}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10" title="View Full Entry" onClick={() => setViewingEntry({ entry: req.entry, changes: req.changes })}>
                <Eye size={18} />
              </Button>
              <Button size="sm" onClick={() => handleAction(req.id, 'APPROVED')}>Approve</Button>
              <Button variant="outline" size="sm" onClick={() => handleAction(req.id, 'REJECTED')}>Reject</Button>
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
