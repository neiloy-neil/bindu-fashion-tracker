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
    <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--warning)' }}>
      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚠️</span> Pending Edit Requests
      </div>
      <div className="flex flex-col gap-3">
        {requests.map(req => (
          <div key={req.id} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {req.entry.branch.name} Branch <span style={{ color: 'var(--text-muted)' }}>— for entry on {formatDate(req.entry.date)}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                Reason: <span style={{ fontStyle: 'italic' }}>{req.reason || 'No reason provided'}</span>
              </div>
              <div style={{ color: 'var(--warning)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
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
