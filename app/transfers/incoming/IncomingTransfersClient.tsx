'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type TransferForClient = {
  id: number
  amount: number
  note: string | null
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

  const openReject = (id: number) => {
    setRejectionReason('')
    setRejectingId(id)
  }

  const cancelReject = () => {
    setRejectingId(null)
    setRejectionReason('')
  }

  const handleAction = async (id: number, action: 'ACKNOWLEDGE' | 'REJECT') => {
    if (action === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.')
      return
    }

    setLoadingId(id)
    try {
      const res = await fetch(`/api/transfers/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: rejectionReason.trim() || undefined })
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Failed to process transfer')
      } else {
        setTransfers(prev => prev.filter(t => t.id !== id))
        toast.success(action === 'ACKNOWLEDGE' ? 'Transfer acknowledged.' : 'Transfer rejected.')
        router.refresh()
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoadingId(null)
      setRejectingId(null)
      setRejectionReason('')
    }
  }

  if (transfers.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        No pending transfers to acknowledge.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transfers.map(t => {
        const isProcessing = loadingId === t.id
        const anyProcessing = loadingId !== null

        return (
          <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Sent from</p>
                <p className="font-bold text-lg text-[var(--text-primary)]">{t.senderBranch}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(t.createdAt).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">To: {t.targetAccount}</p>
                <p className="font-bold text-xl text-[var(--success)] tabular-nums mt-0.5">
                  +৳{t.amount.toLocaleString('en-BD')}
                </p>
              </div>
            </div>

            {t.note && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--surface-raised)] text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)] mr-1">Note:</span>{t.note}
              </div>
            )}

            {rejectingId === t.id ? (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                  Reason for rejection:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]"
                  rows={2}
                  placeholder="Required"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={cancelReject}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(t.id, 'REJECT')}
                    disabled={isProcessing || !rejectionReason.trim()}
                    className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : null}
                    Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => openReject(t.id)}
                  disabled={anyProcessing}
                  className="px-4 py-2 text-sm font-medium border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger-subtle)] rounded-lg disabled:opacity-40 transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(t.id, 'ACKNOWLEDGE')}
                  disabled={anyProcessing}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold bg-[var(--success)] hover:opacity-90 text-white rounded-lg disabled:opacity-40 transition-opacity"
                >
                  {isProcessing ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : null}
                  Acknowledge
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
