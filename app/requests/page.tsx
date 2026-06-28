'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'

export default function BranchRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<number | null>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState('MAINTENANCE')
  const [priority, setPriority] = useState('MEDIUM')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const [sessionRes, requestsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/branch-requests'),
        ])
        const session = await sessionRes.json()
        const data = await requestsRes.json()

        if (!cancelled) {
          if (session?.user?.id) {
            setUserId(session.user.id)
          }
          if (data.requests) {
            setRequests(data.requests)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

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
      toast.success('Request submitted successfully')
      setShowModal(false)
      setDescription('')
      setRequests((current) => [
        ...current,
        {
          id: Date.now(),
          type,
          priority,
          description,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          adminComment: '',
          attachmentUrl
        },
      ])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2 py-1 bg-[var(--warning)]/20 text-[var(--warning)] rounded text-xs font-bold border border-[var(--warning)]/30">Pending</span>
      case 'IN_PROGRESS': return <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-xs font-bold border border-[var(--accent)]/30">In Progress</span>
      case 'RESOLVED': return <span className="px-2 py-1 bg-[var(--success)]/20 text-[var(--success)] rounded text-xs font-bold border border-[var(--success)]/30">Resolved</span>
      case 'REJECTED': return <span className="px-2 py-1 bg-[var(--danger)]/20 text-[var(--danger)] rounded text-xs font-bold border border-[var(--danger)]/30">Rejected</span>
      default: return null
    }
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'LOW': return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">Low Priority</span>
      case 'MEDIUM': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">Medium Priority</span>
      case 'HIGH': return <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">High Priority</span>
      case 'URGENT': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold animate-pulse">URGENT</span>
      default: return null
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Support Requests</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Submit requests for maintenance, supplies, staff, or other needs</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + New Request
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <BrandSpinner />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 text-[var(--text-secondary)]">
            <div className="text-4xl mb-4">🛠️</div>
            <p>You haven&apos;t submitted any requests yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl">
            {requests.map(req => (
              <div key={req.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-[var(--accent)]">{req.type}</span>
                    {getPriorityBadge(req.priority)}
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{req.description}</p>
                  {req.attachmentUrl && (
                    <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
                      📎 View Attachment
                    </a>
                  )}
                  {req.adminComment && (
                    <div className="mt-4 p-3 bg-[var(--border)]/50 border border-[var(--border)] rounded-lg">
                      <p className="text-xs text-[var(--text-secondary)] mb-1 font-bold">Admin Comment:</p>
                      <p className="text-sm text-[var(--accent)] whitespace-pre-wrap">{req.adminComment}</p>
                    </div>
                  )}
                </div>
                <div>
                  {getStatusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
              <h3 className="font-bold text-white">New Support Request</h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-secondary)] hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Request Type</label>
                <select 
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  <option value="MAINTENANCE">Maintenance / Fix</option>
                  <option value="SUPPLIES">Need Supplies</option>
                  <option value="STAFF">Need Employee / Staff</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                <select 
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 h-32 resize-none"
                  placeholder="Describe what you need in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={e => setAttachment(e.target.files?.[0] || null)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
