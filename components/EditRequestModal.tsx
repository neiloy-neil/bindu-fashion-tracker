import { useState } from 'react'
import toast from 'react-hot-toast'

type EditRequestModalProps = {
  entryId: number
  branchName: string
  date: string
  categoryId?: number
  categoryName?: string
  field?: string
  oldValue: number
  userId: number
  onClose: () => void
}

export default function EditRequestModal({ entryId, branchName, date, categoryId, categoryName, field, oldValue, userId, onClose }: EditRequestModalProps) {
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
      let changes: any = {}
      if (categoryId) {
        changes = { items: [{ categoryId, amount: parseFloat(newValue) || 0 }] }
      } else if (field) {
        changes = { [field]: parseFloat(newValue) || 0 }
      }

      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          requestedById: userId,
          changes,
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

  const displayField = categoryName || field || 'Unknown Field'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
          <h3 className="font-bold text-white">Request Edit for Past Entry</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Entry: <strong className="text-white">{branchName} - {new Date(date).toLocaleDateString()}</strong><br/>
            Field: <strong className="text-white">{displayField}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">New Value</label>
            <input
              type="number"
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent)]"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reason for Edit</label>
            <textarea
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent)] h-24 resize-none"
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--accent)] text-black hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
