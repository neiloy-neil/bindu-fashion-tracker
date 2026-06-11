'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

export default function BranchRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<number | null>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState('MAINTENANCE')
  const [priority, setPriority] = useState('MEDIUM')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/branch-requests')
      const data = await res.json()
      if (data.requests) setRequests(data.requests)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      if (s?.user?.id) setUserId(s.user.id)
    })
    fetchRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return toast.error('Please provide a description')
    if (!userId) return toast.error('User not identified')

    setSubmitting(true)
    try {
      const res = await fetch('/api/branch-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedById: userId, type, description, priority })
      })
      if (!res.ok) throw new Error('Failed to submit request')
      toast.success('Request submitted successfully')
      setShowModal(false)
      setDescription('')
      fetchRequests()
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
      case 'URGENT': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold animate-pulse">URGENT</span>
      default: return null
    }
  }

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Support Requests</h2>
          <p className="page-subtitle">Submit requests for maintenance, supplies, staff, or other needs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Request
        </button>
      </div>

      <div className="page-body p-5">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="spinner" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 text-[#8899aa]">
            <div className="text-4xl mb-4">🛠️</div>
            <p>You haven't submitted any requests yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl">
            {requests.map(req => (
              <div key={req.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-xl p-5 shadow flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-[#00d2ff]">{req.type}</span>
                    {getPriorityBadge(req.priority)}
                    <span className="text-xs text-[#8899aa]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{req.description}</p>
                  {req.adminComment && (
                    <div className="mt-4 p-3 bg-[#1e2d45]/50 border border-[#1e2d45] rounded-lg">
                      <p className="text-xs text-[#8899aa] mb-1 font-bold">Admin Comment:</p>
                      <p className="text-sm text-[#00d2ff] whitespace-pre-wrap">{req.adminComment}</p>
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
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a0f18]">
              <h3 className="font-bold text-white">New Support Request</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8899aa] hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[#8899aa] mb-1">Request Type</label>
                <select 
                  className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff]"
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
                <label className="block text-sm font-medium text-[#8899aa] mb-1">Priority</label>
                <select 
                  className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff]"
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
                <label className="block text-sm font-medium text-[#8899aa] mb-1">Description</label>
                <textarea
                  className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff] h-32 resize-none"
                  placeholder="Describe what you need in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8899aa] hover:text-white hover:bg-[#1e2d45]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00d2ff] text-black hover:bg-[#00a8cc] disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
