'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import useSWR from 'swr'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { ViewReceiptModal } from '@/components/entries/ViewReceiptModal'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30',
  IN_PROGRESS: 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30',
  RESOLVED: 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30',
  REJECTED: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-gray-500/10 text-[var(--text-muted)]',
  MEDIUM: 'bg-blue-500/10 text-blue-500',
  HIGH: 'bg-orange-500/10 text-orange-500',
  URGENT: 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse',
}

type TimelineEvent = {
  id: number
  type: string
  actorId: number | null
  fromValue: string | null
  toValue: string | null
  note: string | null
  createdAt: string
  actor: { id: number; username: string } | null
}

function timelineIcon(type: string) {
  switch (type) {
    case 'CREATED':        return { icon: '📝', color: 'bg-[var(--accent)]/15 text-[var(--accent)]' }
    case 'STATUS_CHANGED': return { icon: '🔄', color: 'bg-[var(--warning)]/15 text-[var(--warning)]' }
    case 'ASSIGNED':       return { icon: '👤', color: 'bg-[var(--info)]/15 text-[var(--info)]' }
    case 'UNASSIGNED':     return { icon: '↩️', color: 'bg-gray-500/10 text-[var(--text-muted)]' }
    case 'COMMENT_ADDED':  return { icon: '💬', color: 'bg-[var(--success)]/15 text-[var(--success)]' }
    case 'PRIORITY_CHANGED': return { icon: '⚡', color: 'bg-orange-500/10 text-orange-500' }
    default:               return { icon: '•', color: 'bg-[var(--surface-raised)] text-[var(--text-muted)]' }
  }
}

function timelineLabel(event: TimelineEvent): string {
  switch (event.type) {
    case 'CREATED':
      return `Request submitted`
    case 'STATUS_CHANGED':
      return `Status changed from ${STATUS_LABEL[event.fromValue!] ?? event.fromValue} → ${STATUS_LABEL[event.toValue!] ?? event.toValue}`
    case 'PRIORITY_CHANGED':
      return `Priority changed from ${event.fromValue} → ${event.toValue}`
    case 'ASSIGNED':
      return event.fromValue
        ? `Reassigned from ${event.fromValue} to ${event.toValue}`
        : `Assigned to ${event.toValue}`
    case 'UNASSIGNED':
      return `Unassigned${event.fromValue ? ` from ${event.fromValue}` : ''}`
    case 'COMMENT_ADDED':
      return `Comment added`
    default:
      return event.type
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-BD', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-500/10 text-gray-500'}`}>{STATUS_LABEL[status] ?? status}</span>
}
function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_STYLES[priority] ?? ''}`}>{priority}</span>
}

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState('ALL')
  const lastSeenIdRef = useRef<number | null>(null)
  const initialLoadRef = useRef<boolean>(true)

  const { data: usersData } = useSWR('/api/admin/users', fetcher)
  const userList = Array.isArray(usersData) ? usersData : (usersData?.users ?? [])
  const assignableUsers = userList.filter((u: any) =>
    ['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER', 'HR_ADMIN'].includes(u.role) && u.isActive
  )

  const { data, mutate, isLoading } = useSWR('/api/branch-requests', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    onSuccess: (data) => {
      if (data?.requests?.length > 0) {
        const latest = data.requests[0]
        if (initialLoadRef.current) {
          lastSeenIdRef.current = latest.id
          initialLoadRef.current = false
        } else if (lastSeenIdRef.current !== null && latest.id > lastSeenIdRef.current) {
          toast.success(`New Support Request from ${latest.branch?.name}!`, { icon: '🔔', duration: 6000 })
          lastSeenIdRef.current = latest.id
        }
      }
    }
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activeReq, setActiveReq] = useState<any>(null)
  const [modalStatus, setModalStatus] = useState('PENDING')
  const [modalPriority, setModalPriority] = useState('MEDIUM')
  const [modalComment, setModalComment] = useState('')
  const [modalAssignedTo, setModalAssignedTo] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Scroll timeline to bottom whenever modal opens
  useEffect(() => {
    if (activeReq && timelineRef.current) {
      setTimeout(() => {
        if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight
      }, 80)
    }
  }, [activeReq])

  const openManage = (req: any) => {
    setActiveReq(req)
    setModalStatus(req.status)
    setModalPriority(req.priority || 'MEDIUM')
    setModalComment(req.adminComment || '')
    setModalAssignedTo(req.assignedToId ? String(req.assignedToId) : '')
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeReq) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/branch-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeReq.id,
          status: modalStatus,
          priority: modalPriority,
          adminComment: modalComment,
          assignedToId: modalAssignedTo || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update request')
      const updated = await res.json()
      toast.success('Request updated')
      // Patch local state so timeline refreshes without closing
      setActiveReq(updated)
      mutate()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const requests: any[] = data?.requests ?? []
  const filteredRequests = filter === 'ALL' ? requests : requests.filter((r: any) => r.status === filter)

  const counts: Record<string, number> = { ALL: requests.length }
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Branch Support Requests</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage incoming requests from all branches</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-[var(--border)] overflow-x-auto">
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}>
            {f === 'ALL' ? 'All' : STATUS_LABEL[f]}
            {counts[f] ? <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? 'bg-white/20' : 'bg-[var(--surface-raised)]'}`}>{counts[f]}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><BrandSpinner /></div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center p-12 text-[var(--text-secondary)] bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <div className="text-4xl mb-4">🛠️</div>
            <p>No requests found for this filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl">
            {filteredRequests.map((req: any) => (
              <div key={req.id}
                className={`bg-[var(--surface)] border rounded-xl p-5 flex flex-col md:flex-row justify-between items-start gap-4 transition-all ${
                  req.status === 'PENDING' ? 'border-[var(--warning)]/30' :
                  req.status === 'IN_PROGRESS' ? 'border-[var(--accent)]/30' :
                  req.status === 'RESOLVED' ? 'border-[var(--success)]/30' :
                  'border-[var(--border)]'
                }`}>
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Top badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded text-xs">
                      {req.branch?.name}
                    </span>
                    <span className="text-xs font-semibold text-[var(--accent)]">{req.type.replace('_', ' ')}</span>
                    <PriorityBadge priority={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed line-clamp-3">{req.description}</p>

                  {/* Admin comment preview */}
                  {req.adminComment && (
                    <div className="p-2.5 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold uppercase tracking-wide">Last Comment</p>
                      <p className="text-xs text-[var(--text-primary)] line-clamp-2">{req.adminComment}</p>
                    </div>
                  )}

                  {/* Footer meta */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                    <span>By <span className="font-medium text-[var(--text-secondary)]">{req.requestedBy?.username}</span></span>
                    <span>{new Date(req.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {req.assignedTo && (
                      <span className="flex items-center gap-1 bg-[var(--info)]/10 text-[var(--info)] px-2 py-0.5 rounded-full font-medium">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {req.assignedTo.username}
                      </span>
                    )}
                    {req.events?.length > 0 && (
                      <span className="text-[var(--text-muted)]">{req.events.length} timeline event{req.events.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => openManage(req)}
                    className="text-sm px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-lg transition-colors font-semibold whitespace-nowrap"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewUrl && <ViewReceiptModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {/* Manage Request Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[92dvh]">

            {/* Modal header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Manage Request</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {activeReq.branch?.name} · {activeReq.type.replace('_', ' ')} · #{activeReq.id}
                </p>
              </div>
              <button onClick={() => setActiveReq(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Original request */}
              <div className="px-5 pt-4 pb-3 border-b border-[var(--border)]/50">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Original Request</p>
                <p className="text-sm text-[var(--text-primary)] bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border)] whitespace-pre-wrap leading-relaxed">
                  {activeReq.description}
                </p>
                {activeReq.attachmentUrl && (
                  <button onClick={() => setPreviewUrl(activeReq.attachmentUrl)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium">
                    🔗 View Attachment
                  </button>
                )}
              </div>

              {/* Timeline */}
              {activeReq.events?.length > 0 && (
                <div className="px-5 pt-4 pb-3 border-b border-[var(--border)]/50">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Timeline</p>
                  <div ref={timelineRef} className="relative space-y-0 max-h-56 overflow-y-auto pr-1">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--border)]" />

                    {activeReq.events.map((ev: TimelineEvent, i: number) => {
                      const { icon, color } = timelineIcon(ev.type)
                      return (
                        <div key={ev.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                          {/* dot */}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${color}`}>
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                              {timelineLabel(ev)}
                              {ev.actor && <span className="text-[var(--text-muted)] font-normal"> · by {ev.actor.username}</span>}
                            </p>
                            {ev.note && ev.type === 'COMMENT_ADDED' && (
                              <p className="mt-1 text-xs text-[var(--text-secondary)] bg-[var(--surface-raised)] rounded-lg px-2.5 py-1.5 border border-[var(--border)] whitespace-pre-wrap">
                                {ev.note}
                              </p>
                            )}
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{fmtTime(ev.createdAt)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Update form */}
              <form onSubmit={handleUpdate} className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                    <select
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value)}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Priority</label>
                    <select
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={modalPriority}
                      onChange={e => setModalPriority(e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">Assign To</label>
                  <select
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={modalAssignedTo}
                    onChange={e => setModalAssignedTo(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {assignableUsers.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.username} ({a.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">Comment <span className="font-normal text-[var(--text-muted)]">(visible to branch)</span></label>
                  <textarea
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] h-20 resize-none"
                    placeholder="Add a note about this update…"
                    value={modalComment}
                    onChange={e => setModalComment(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setActiveReq(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors">
                    Close
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] disabled:opacity-50 transition-colors">
                    {submitting ? 'Saving…' : 'Save & Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
