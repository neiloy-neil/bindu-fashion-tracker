'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

export function PurchaseModal({ isOpen, onClose, partyId, onSuccess }: { isOpen: boolean, onClose: () => void, partyId: number, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    invoiceNumber: '',
    note: '',
    isOpeningDue: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parseFloat(formData.amount) <= 0) return toast.error('Amount must be positive')
    
    setLoading(true)
    try {
      let attachmentUrl = null
      if (file) {
        attachmentUrl = await uploadReceipt(file)
      }

      const payload = {
        partyId,
        amount: parseFloat(formData.amount),
        date: formData.date,
        invoiceNumber: formData.invoiceNumber,
        note: formData.note,
        isOpeningDue: formData.isOpeningDue,
        attachmentUrl
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add purchase')
      }

      toast.success('Purchase added successfully')
      
      // Delay closing slightly for better UX
      setTimeout(() => {
        onSuccess()
        onClose()
        setFormData({ date: new Date().toISOString().split('T')[0], amount: '', invoiceNumber: '', note: '', isOpeningDue: false })
        setFile(null)
      }, 300)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-full max-w-md rounded-2xl border-border bg-card p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Purchase / Opening Due</DialogTitle>
        </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg border border-border">
              <input 
                type="checkbox" 
                id="isOpeningDue" 
                checked={formData.isOpeningDue} 
                onChange={e => setFormData({...formData, isOpeningDue: e.target.checked})}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50 bg-background"
              />
              <label htmlFor="isOpeningDue" className="text-sm font-medium cursor-pointer">This is an Opening Due balance</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (৳)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>

            {!formData.isOpeningDue && (
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <textarea className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>

            {!formData.isOpeningDue && (
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Photo <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full p-2 text-sm border border-border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  )
}
