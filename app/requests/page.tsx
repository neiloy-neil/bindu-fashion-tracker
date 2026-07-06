'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'

type Request = {
  id: number
  type: string
  priority: string
  description: string
  status: string
  adminComment?: string | null
  attachmentUrl?: string | null
  createdAt: string
  updatedAt: string
  assignedTo?: { id: number; username: string } | null
}

const STATUS_TABS = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30',
    IN_PROGRESS: 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30',
    RESOLVED: 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30',
    REJECTED: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status] ?? 'bg-gray-500/10 text-gray-500'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: 'bg-gray-500/10 text-[var(--text-muted)]',
    MEDIUM: 'bg-blue-500/10 text-blue-500',
    HIGH: 'bg-orange-500/10 text-orange-500',
    URGENT: 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[priority] ?? ''}`}>
      {priority}
    </span>
  )
}

export default function BranchRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ALL')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState('MAINTENANCE')
  const [priority, setPriority] = useState('MEDIUM')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch('/api/branch-requests')
      const data = await res.json()
      if (data.requests) setRequests(data.requests)
    } catch { /* silent */ } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()
        if (!cancelled && session?.user?.id) setUserId(session.user.id)
      } catch { /* silent */ }
    }
    void bootstrap()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void fetchRequests()
    // Poll every 30s so status updates appear without manual reload
    const interval = setInterval(() => fetchRequests(true), 30_000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return toast.error('Please provide a description')
    if (!userId) return toast.error('User not identified')

    setSubmitting(true)
    try {
      let attachmentUrl = null
      if (attachment) {
        const formData = new FormData()
        formData.append('file', attachment)
        const uploadRes = await fetch('/api/upload?bucket=requests', { method: 'POST', body: formData })
        if (!uploadRes.ok) throw new Error('Failed to upload attachment')
        const { url } = await uploadRes.json()
        attachmentUrl = url
      }

      const res = await fetch('/api/branch-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedById: userId, type, description, priority, attachmentUrl })
      })
      if (!res.ok) throw new Error('Failed to submit request')

      toast.success('Request submitted — admin has been notified')
      setShowModal(false)
      setDescription('')
      setAttachment(null)
      setType('MAINTENANCE')
      setPriority('MEDIUM')
      // Refetch to get the real record with ID and timestamps
      await fetchRequests(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = activeTab === 'ALL' ? requests : requests.filter(r => r.status === activeTab)
  const counts: Record<string, number> = { ALL: requests.length }
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Support Requests</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Submit and track requests for your branch</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Request</Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-[var(--border)] overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            {tab === 'ALL' ? 'All' : STATUS_LABEL[tab]}
            {counts[tab] ? (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-white/20' : 'bg-[var(--surface-raised)]'}`}>
                {counts[tab]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40"><BrandSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <div className="text-5xl mb-4">🛠️</div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              {activeTab === 'ALL' ? 'No requests yet' : `No ${STATUS_LABEL[activeTab]?.toLowerCase()} requests`}
            </h3>
            <p className="text-sm mb-6">
              {activeTab === 'ALL'
                ? 'Need something fixed or supplied? Submit a request and the admin team will respond.'
                : 'Try a different filter above.'}
            </p>
            {activeTab === 'ALL' && (
              <Button onClick={() => setShowModal(true)}>+ New Request</Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl">
            {filtered.map(req => (
              <div
                key={req.id}
                className={`rounded-xl border bg-[var(--surface)] p-5 space-y-3 transition-all ${
                  req.status === 'PENDING' ? 'border-[var(--warning)]/30' :
                  req.status === 'IN_PROGRESS' ? 'border-[var(--accent)]/30' :
                  req.status === 'RESOLVED' ? 'border-[var(--success)]/30' :
                  'border-[var(--border)]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{req.type.replace('_', ' ')}</span>
                    <PriorityBadge priority={req.priority} />
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Description */}
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{req.description}</p>

                {/* Attachment */}
                {req.attachmentUrl && (
                  <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                    📎 View Attachment
                  </a>
                )}

                {/* Admin comment */}
                {req.adminComment && (
                  <div className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wide">Admin Response</p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{req.adminComment}</p>
                  </div>
                )}

                {/* Footer row */}
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                  <span>Submitted {new Date(req.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <div className="flex items-center gap-3">
                    {req.assignedTo && (
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Assigned to <span className="font-medium text-[var(--text-secondary)]">{req.assignedTo.username}</span>
                      </span>
                    )}
                    {req.updatedAt !== req.createdAt && (
                      <span>Updated {new Date(req.updatedAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-semibold text-[var(--text-primary)]">New Support Request</h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Request Type</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    <option value="MAINTENANCE">Maintenance / Fix</option>
                    <option value="SUPPLIES">Need Supplies</option>
                    <option value="STAFF">Need Staff</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                <textarea
                  className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] h-28 resize-none"
                  placeholder="Describe what you need in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Attachment <span className="text-[var(--text-muted)]">(optional)</span></label>
                <input
                  type="file"
                  onChange={e => setAttachment(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent)]/10 file:text-[var(--accent)] hover:file:bg-[var(--accent)]/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
