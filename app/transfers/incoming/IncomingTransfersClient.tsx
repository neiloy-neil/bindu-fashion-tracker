'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TransferForClient = {
  id: number
  amount: number
  note: string | null
  attachmentUrl: string | null
  createdAt: string
  senderBranch: string
  targetAccount: string
}

export default function IncomingTransfersClient({ initialTransfers }: { initialTransfers: TransferForClient[] }) {
  const [transfers, setTransfers] = useState<TransferForClient[]>(initialTransfers)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const router = useRouter()

  const handleAction = async (id: number, action: 'ACKNOWLEDGE' | 'REJECT') => {
    if (action === 'REJECT' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection.')
      return
    }

    setLoadingId(id)
    try {
      const res = await fetch(`/api/transfers/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason })
      })

      if (!res.ok) {
        const error = await res.json()
        alert('Error: ' + error.error)
      } else {
        setTransfers(transfers.filter(t => t.id !== id))
        router.refresh()
      }
    } catch (e) {
      alert('An error occurred.')
    } finally {
      setLoadingId(null)
      setRejectingId(null)
      setRejectionReason('')
    }
  }

  return (
    <div className="space-y-4">
      {transfers.map(t => (
        <div key={t.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="text-sm text-[var(--text-muted)]">Sent from</div>
              <div className="font-bold text-lg text-[var(--text-primary)]">{t.senderBranch}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--text-muted)]">Amount</div>
              <div className="font-bold text-xl text-green-500">+{t.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
            </div>
          </div>

          {(t.note || t.attachmentUrl) && (
            <div className="mt-4 p-3 bg-[var(--bg-muted)] rounded-lg text-sm">
              {t.note && <div className="mb-2"><span className="text-[var(--text-muted)]">Note:</span> {t.note}</div>}
              {t.attachmentUrl && (
                <a href={t.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                  View Attachment
                </a>
              )}
            </div>
          )}

          {rejectingId === t.id ? (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Reason for rejection:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-2 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Required"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setRejectingId(null)}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(t.id, 'REJECT')}
                  disabled={loadingId === t.id || !rejectionReason.trim()}
                  className="px-4 py-1.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setRejectingId(t.id)}
                disabled={loadingId === t.id}
                className="px-4 py-2 font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(t.id, 'ACKNOWLEDGE')}
                disabled={loadingId === t.id}
                className="px-5 py-2 font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm disabled:opacity-50"
              >
                Acknowledge
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
