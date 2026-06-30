'use client'

import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Landmark, Smartphone, Banknote, FileSignature, CheckCircle2 } from 'lucide-react'

type PaymentMethod = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'CHEQUE'

async function uploadReceipt(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload?bucket=receipts', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Upload failed')
  }

  const { url } = await response.json()
  return url as string
}

export function PaymentModal({ isOpen, onClose, partyId, bankAccounts = [], onSuccess }: { isOpen: boolean, onClose: () => void, partyId: number, bankAccounts?: Array<{id: number, type: string, isDefault?: boolean}>, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0])
  const [partyBankInfoId, setPartyBankInfoId] = useState<number | ''>('')
  const [transactionRef, setTransactionRef] = useState('')
  const [chequeNumber, setChequeNumber] = useState('') // transactionRef used for cheque number too

  // Filter accounts based on selected method
  const relevantAccounts = useMemo(() => {
    if (method === 'BANK') return bankAccounts.filter(a => a.type === 'BANK')
    if (method === 'BKASH') return bankAccounts.filter(a => a.type === 'BKASH')
    if (method === 'NAGAD') return bankAccounts.filter(a => a.type === 'NAGAD')
    return []
  }, [method, bankAccounts])

  // Auto-select default account when method changes
  useEffect(() => {
    if (relevantAccounts.length > 0) {
      const defaultAcc = relevantAccounts.find(a => a.isDefault)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPartyBankInfoId(defaultAcc ? defaultAcc.id : relevantAccounts[0].id)
    } else {
      setPartyBankInfoId('')
    }
  }, [relevantAccounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parseFloat(amount) <= 0) return toast.error('Amount must be positive')
    if ((method === 'BANK' || method === 'CHEQUE') && !file) {
      return toast.error('Attachment is required for BANK or CHEQUE')
    }
    if ((method === 'BANK' || method === 'BKASH' || method === 'NAGAD') && !partyBankInfoId) {
       return toast.error(`Please select a ${method} account.`)
    }
    
    setLoading(true)
    try {
      let attachmentUrl = null
      if (file) {
        attachmentUrl = await uploadReceipt(file)
      }

      const payload = {
        partyId,
        method,
        amount: parseFloat(amount),
        note,
        attachmentUrl,
        partyBankInfoId: partyBankInfoId ? Number(partyBankInfoId) : undefined,
        transactionRef: method === 'CHEQUE' ? chequeNumber : transactionRef,
        ...(method === 'CHEQUE' && {
          issueDate,
          withdrawDate
        })
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to make payment')
      }

      toast.success('Payment recorded successfully')
      
      setTimeout(() => {
        onSuccess()
        onClose()
        setMethod('CASH')
        setAmount('')
        setNote('')
        setTransactionRef('')
        setChequeNumber('')
        setFile(null)
      }, 300)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-full max-w-md rounded-2xl border-border bg-card p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Make Direct Payment</DialogTitle>
        </DialogHeader>

        {/* Payment Method Tabs */}
        <div className="flex gap-2 mb-6 bg-muted/30 p-1.5 rounded-xl border border-border/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'CASH', label: 'Cash', icon: Banknote },
            { id: 'BANK', label: 'Bank', icon: Landmark },
            { id: 'BKASH', label: 'bKash', icon: Smartphone },
            { id: 'NAGAD', label: 'Nagad', icon: Smartphone },
            { id: 'CHEQUE', label: 'Cheque', icon: FileSignature }
          ].map((m) => {
            const Icon = m.icon
            const isActive = method === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id as PaymentMethod)}
                className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  isActive 
                    ? 'bg-background shadow-sm text-primary ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {m.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium mb-1 text-card-foreground">Amount (৳)</label>
            <input required type="number" step="0.01" min="0.01" className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 text-sm font-mono" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          {(method === 'BANK' || method === 'BKASH' || method === 'NAGAD') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">Select {method === 'BANK' ? 'Bank' : method} Account</label>
                {relevantAccounts.length > 0 ? (
                  <select 
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20"
                    value={partyBankInfoId}
                    onChange={(e) => setPartyBankInfoId(Number(e.target.value))}
                    required
                  >
                    {relevantAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.label || a.bankName || a.type} - {a.accountNo} {a.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                    No {method} accounts found for this party. Please add one first from their profile.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">Transaction Ref / TRX ID <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input type="text" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/20" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="Enter transaction reference" />
              </div>
            </div>
          )}

          {method === 'CHEQUE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-card-foreground">Cheque Number</label>
                <input required type="text" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/20" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="Enter cheque number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-card-foreground">Issue Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-card-foreground">Withdraw Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20" value={withdrawDate} onChange={e => setWithdrawDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-card-foreground">Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <textarea className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add any additional notes..." />
          </div>

          {(method === 'BANK' || method === 'CHEQUE') && (
            <div>
              <label className="block text-sm font-medium mb-1 text-card-foreground">Attachment <span className="text-destructive">*</span></label>
              <input 
                required
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 text-sm border border-border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all text-muted-foreground"
              />
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={loading || ((method === 'BANK' || method === 'BKASH' || method === 'NAGAD') && !partyBankInfoId)} 
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : <><CheckCircle2 className="w-4 h-4" /> Pay {amount ? `৳${amount}` : ''}</>}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
