import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Eye } from 'lucide-react'
import EntryViewModal from '@/components/dashboard/EntryViewModal'

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingEntry, setViewingEntry] = useState<{ entry: any, changes: string } | null>(null)

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/edit-requests')
      const data = await res.json()
      if (data.requests) {
        setRequests(data.requests.filter((r: any) => r.status === 'PENDING'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
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
      fetchRequests()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading || requests.length === 0) return null

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
              <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                {Object.keys(JSON.parse(req.changes)).join(', ')} → changed
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                className="p-1.5 text-[#00d2ff] hover:bg-[#00d2ff]/10 rounded transition-colors"
                title="View Full Entry"
                onClick={() => setViewingEntry({ entry: req.entry, changes: req.changes })}
              >
                <Eye size={18} />
              </button>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleAction(req.id, 'APPROVED')}>Approve</button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleAction(req.id, 'REJECTED')}>Reject</button>
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
