'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export function PaymentModal({ isOpen, onClose, partyId, onSuccess }: { isOpen: boolean, onClose: () => void, partyId: number, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    method: 'CASH',
    amount: '',
    note: '',
    issueDate: new Date().toISOString().split('T')[0],
    withdrawDate: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parseFloat(formData.amount) <= 0) return toast.error('Amount must be positive')
    if ((formData.method === 'BANK' || formData.method === 'CHEQUE') && !file) {
      return toast.error('Attachment is required for BANK or CHEQUE')
    }
    
    setLoading(true)
    try {
      let attachmentUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `receipts/${fileName}`
        
        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        
        const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
        attachmentUrl = data.publicUrl
      }

      const payload = {
        partyId,
        method: formData.method,
        amount: parseFloat(formData.amount),
        note: formData.note,
        attachmentUrl,
        ...(formData.method === 'CHEQUE' && {
          issueDate: formData.issueDate,
          withdrawDate: formData.withdrawDate
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
      
      // Delay closing slightly for better UX
      setTimeout(() => {
        onSuccess()
        onClose()
        setFormData({ method: 'CASH', amount: '', note: '', issueDate: new Date().toISOString().split('T')[0], withdrawDate: new Date().toISOString().split('T')[0] })
        setFile(null)
      }, 300)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl shadow-2xl z-50 border border-border">
          <Dialog.Title className="text-xl font-bold mb-6">Make Direct Payment</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select 
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" 
                  value={formData.method} 
                  onChange={e => setFormData({...formData, method: e.target.value})}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (৳)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm font-mono" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>

            {formData.method === 'CHEQUE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Withdraw Date</label>
                  <input required type="date" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" value={formData.withdrawDate} onChange={e => setFormData({...formData, withdrawDate: e.target.value})} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <textarea className="w-full p-2.5 rounded-lg border border-border bg-background text-sm" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>

            {(formData.method === 'BANK' || formData.method === 'CHEQUE') && (
              <div>
                <label className="block text-sm font-medium mb-1">Attachment <span className="text-destructive">*</span></label>
                <input 
                  required
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
                {loading ? 'Processing...' : 'Pay'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
