import { useState } from 'react'
import toast from 'react-hot-toast'

type EditRequestModalProps = {
  entryId: number
  branchName: string
  date: string
  field: string
  oldValue: number
  userId: number
  onClose: () => void
}

export default function EditRequestModal({ entryId, branchName, date, field, oldValue, userId, onClose }: EditRequestModalProps) {
  const [newValue, setNewValue] = useState(String(oldValue))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          requestedById: userId,
          changes: { [field]: parseFloat(newValue) || 0 },
          reason
        })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit')
      }
      toast.success('Edit request submitted to Admin!')
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Error submitting request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-[#1e2d45] flex justify-between items-center bg-[#0a0f18]">
          <h3 className="font-bold text-white">Request Edit for Past Entry</h3>
          <button onClick={onClose} className="text-[#8899aa] hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="text-sm text-[#8899aa]">
            Entry: <strong className="text-white">{branchName} - {new Date(date).toLocaleDateString()}</strong><br/>
            Field: <strong className="text-white">{field}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8899aa] mb-1">New Value</label>
            <input
              type="number"
              className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff]"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8899aa] mb-1">Reason for Edit</label>
            <textarea
              className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d2ff] h-24 resize-none"
              placeholder="Why are you changing this value from a previous day?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#8899aa] hover:text-white hover:bg-[#1e2d45] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00d2ff] text-black hover:bg-[#00a8cc] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
