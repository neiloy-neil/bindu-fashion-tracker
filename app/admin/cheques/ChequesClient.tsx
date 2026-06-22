'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, Search, AlertCircle, Building2, User, Image as ImageIcon } from 'lucide-react'
import { ViewReceiptModal } from '@/components/entries/ViewReceiptModal'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

interface Cheque {
  id: number
  issueDate: string
  withdrawDate: string
  status: string
  createdAt: string
  approvedBy?: { username: string } | null
  payment: {
    amount: number
    note: string | null
    attachmentUrl: string | null
    party: {
      name: string
      balance: number
    }
    dailyEntry: {
      date: string
      branch: {
        name: string
      }
    } | null
  }
}

export function ChequesClient() {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const fetchCheques = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cheques?status=${filter}`)
      if (!res.ok) throw new Error('Failed to fetch cheques')
      const data = await res.json()
      setCheques(data)
    } catch (err: any) {
      toast.error(err.message || 'Error loading cheques')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCheques()
  }, [filter])

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      if (!window.confirm('Are you sure you want to Clear this cheque? This will decrease the Party balance.')) return
    } else {
      if (!window.confirm('Are you sure you want to Reject/Bounce this cheque?')) return
    }

    setActionLoading(id)
    try {
      const res = await fetch(`/api/cheques/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action} cheque`)
      }
      toast.success(`Cheque ${action === 'approve' ? 'Cleared' : 'Rejected'} successfully`)
      fetchCheques()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredCheques = cheques.filter(c => 
    c.payment.party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.payment.dailyEntry?.branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🏦 Cheque Approval
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage pending cheques. Approving a cheque clears it and decrements the vendor's balance.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4 bg-muted/20">
          <div className="flex bg-muted/50 p-1 rounded-lg self-start">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  filter === f 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                {f === 'PENDING' && <Clock size={16} />}
                {f === 'APPROVED' && <CheckCircle size={16} />}
                {f === 'REJECTED' && <XCircle size={16} />}
                <span className="capitalize">{f.toLowerCase()}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search party or branch..."
              className="form-input w-full pl-9 h-10 bg-card border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Party & Branch</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Issue Date</th>
                <th className="px-6 py-4 font-medium">Withdraw Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <BrandSpinner size={16} />
                    Loading cheques...
                  </td>
                </tr>
              ) : filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle size={32} className="mb-4 opacity-20 text-[var(--accent)]" />
                      <h3 className="text-lg text-foreground font-semibold mb-2">No {filter.toLowerCase()} cheques require approval</h3>
                      <p className="text-sm">You're all caught up. New cheques from branch payments will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCheques.map(cheque => (
                  <tr key={cheque.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User size={14} className="text-muted-foreground" />
                        {cheque.payment.party.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Building2 size={13} />
                        {cheque.payment.dailyEntry?.branch.name || 'Unknown Branch'}
                      </div>
                      {cheque.payment.note && (
                        <div className="text-xs text-muted-foreground italic mt-1.5">
                          Note: {cheque.payment.note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-primary">
                        {formatCurrency(cheque.payment.amount)}
                      </div>
                      {cheque.payment.attachmentUrl && (
                        <button
                          onClick={() => setReceiptUrl(cheque.payment.attachmentUrl)}
                          className="text-xs text-blue-500 hover:text-blue-400 mt-1.5 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded w-fit"
                        >
                          <ImageIcon size={12} /> View Slip
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(cheque.issueDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${new Date(cheque.withdrawDate) <= new Date() && filter === 'PENDING' ? 'text-destructive' : 'text-foreground'}`}>
                        {formatDate(cheque.withdrawDate)}
                      </div>
                      {new Date(cheque.withdrawDate) <= new Date() && filter === 'PENDING' && (
                        <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                          Due
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {filter === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(cheque.id, 'reject')}
                            disabled={actionLoading === cheque.id}
                            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 text-xs px-3 h-8"
                            title="Reject/Bounce Cheque"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(cheque.id, 'approve')}
                            disabled={actionLoading === cheque.id}
                            className="btn btn-primary text-xs px-3 h-8"
                            title="Clear Cheque and Deduct Balance"
                          >
                            {actionLoading === cheque.id ? <BrandSpinner size={16} /> : 'Clear'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {filter === 'APPROVED' ? 'Cleared by' : 'Rejected by'} <br />
                          <span className="font-semibold">{cheque.approvedBy?.username || 'Admin'}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receiptUrl && (
        <ViewReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </div>
  )
}
