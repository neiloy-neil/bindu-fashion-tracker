'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState('ALL')
  const lastSeenIdRef = useRef<number | null>(null)
  const initialLoadRef = useRef<boolean>(true)

  // Use SWR for auto-polling every 10 seconds to catch new requests in real-time
  const { data, error, mutate, isLoading } = useSWR('/api/branch-requests', fetcher, {
    refreshInterval: 10000, 
    revalidateOnFocus: true,
    onSuccess: (data) => {
      if (data?.requests && data.requests.length > 0) {
        const latestRequest = data.requests[0]
        if (initialLoadRef.current) {
          // On first load, just record the latest ID
          lastSeenIdRef.current = latestRequest.id
          initialLoadRef.current = false
        } else if (lastSeenIdRef.current !== null && latestRequest.id > lastSeenIdRef.current) {
          // A new request arrived!
          toast.success(`New Support Request from ${latestRequest.branch?.name}!`, { 
            icon: '🔔', 
            duration: 6000,
            style: { background: '#0a0f18', color: '#fff', border: '1px solid #00d2ff' }
          })
          lastSeenIdRef.current = latestRequest.id
        }
      }
    }
  })

  const [activeReq, setActiveReq] = useState<any>(null)
  const [modalStatus, setModalStatus] = useState('PENDING')
  const [modalPriority, setModalPriority] = useState('MEDIUM')
  const [modalComment, setModalComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleManageClick = (req: any) => {
    setActiveReq(req)
    setModalStatus(req.status)
    setModalPriority(req.priority || 'MEDIUM')
    setModalComment(req.adminComment || '')
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
          adminComment: modalComment 
        })
      })
      if (!res.ok) throw new Error('Failed to update request')
      toast.success('Request updated successfully')
      setActiveReq(null)
      mutate() // Immediately refresh data
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2 py-1 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-xs font-bold border border-[#f59e0b]/30">Pending</span>
      case 'IN_PROGRESS': return <span className="px-2 py-1 bg-[#3b82f6]/20 text-[#3b82f6] rounded text-xs font-bold border border-[#3b82f6]/30">In Progress</span>
      case 'RESOLVED': return <span className="px-2 py-1 bg-[#10b981]/20 text-[#10b981] rounded text-xs font-bold border border-[#10b981]/30">Resolved</span>
      case 'REJECTED': return <span className="px-2 py-1 bg-[#ef4444]/20 text-[#ef4444] rounded text-xs font-bold border border-[#ef4444]/30">Rejected</span>
      default: return null
    }
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'LOW': return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">Low Priority</span>
      case 'MEDIUM': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">Medium Priority</span>
      case 'HIGH': return <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">High Priority</span>
      case 'URGENT': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold animate-pulse border border-red-500/50">URGENT</span>
      default: return null
    }
  }

  const requests = data?.requests || []
  const filteredRequests = requests.filter((req: any) => filter === 'ALL' || req.status === filter)

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Branch Support Requests</h2>
        <p className="page-subtitle">Manage incoming requests from all branches</p>
      </div>

      <div className="page-body p-5">
        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-[#00d2ff] text-black' 
                  : 'bg-[#111827] text-[#8899aa] border border-[#1e2d45] hover:text-white'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="spinner" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center p-12 text-[#8899aa] bg-[#0a0f18] rounded-xl border border-[#1e2d45]">
            <div className="text-4xl mb-4">🛠️</div>
            <p>No requests found for this filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl">
            {filteredRequests.map((req: any) => (
              <div key={req.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-xl p-5 shadow flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-bold text-white bg-[#1e2d45] px-2 py-1 rounded text-xs">
                      {req.branch.name}
                    </span>
                    <span className="font-bold text-[#00d2ff]">{req.type}</span>
                    {getPriorityBadge(req.priority)}
                    <span className="text-xs text-[#8899aa]">
                      {new Date(req.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap text-sm">{req.description}</p>
                  
                  {req.adminComment && (
                    <div className="mt-3 p-3 bg-[#1e2d45]/50 border border-[#1e2d45] rounded-lg">
                      <p className="text-xs text-[#8899aa] mb-1 font-bold">Admin Comment:</p>
                      <p className="text-sm text-[#00d2ff] whitespace-pre-wrap">{req.adminComment}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-[#8899aa] mt-3">Requested by: {req.requestedBy?.username}</p>
                </div>
                
                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                  {getStatusBadge(req.status)}
                  <button 
                    onClick={() => handleManageClick(req)}
                    className="text-sm px-4 py-1.5 bg-[#111827] hover:bg-[#1e2d45] text-white border border-[#1e2d45] rounded-lg transition-colors"
                  >
                    Manage Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Request Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a0f18]">
              <h3 className="font-bold text-white">Manage Support Request</h3>
              <button onClick={() => setActiveReq(null)} className="text-[#8899aa] hover:text-white">✕</button>
            </div>
            
            <div className="p-5 border-b border-[#1e2d45]/50 bg-[#0a0f18]/50">
              <div className="text-sm text-[#8899aa] mb-1">Original Request from <span className="text-white font-bold">{activeReq.branch.name}</span>:</div>
              <p className="text-sm text-white bg-[#111827] p-3 rounded border border-[#1e2d45] whitespace-pre-wrap">
                {activeReq.description}
              </p>
            </div>

            <form onSubmit={handleUpdate} className="p-5 flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8899aa] mb-1">Status</label>
                  <select 
                    className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#00d2ff]"
                    value={modalStatus}
                    onChange={e => setModalStatus(e.target.value)}
                  >
                    <option value="PENDING" className="text-[#f59e0b]">Pending</option>
                    <option value="IN_PROGRESS" className="text-[#3b82f6]">In Progress</option>
                    <option value="RESOLVED" className="text-[#10b981]">Resolved</option>
                    <option value="REJECTED" className="text-[#ef4444]">Rejected</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8899aa] mb-1">Priority</label>
                  <select 
                    className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#00d2ff]"
                    value={modalPriority}
                    onChange={e => setModalPriority(e.target.value)}
                  >
                    <option value="LOW" className="text-gray-400">Low</option>
                    <option value="MEDIUM" className="text-blue-400">Medium</option>
                    <option value="HIGH" className="text-orange-400">High</option>
                    <option value="URGENT" className="text-red-400">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#8899aa] mb-1">Admin Comment (Visible to Branch)</label>
                <textarea
                  className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff] h-24 resize-none"
                  placeholder="Leave notes about resolution, schedule, or why it was rejected..."
                  value={modalComment}
                  onChange={e => setModalComment(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setActiveReq(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8899aa] hover:text-white hover:bg-[#1e2d45]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00d2ff] text-black hover:bg-[#00a8cc] disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
