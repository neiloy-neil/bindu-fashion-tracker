'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'

export function BankModal({ isOpen, onClose, partyId, onSuccess }: { isOpen: boolean, onClose: () => void, partyId: number, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ bankName: '', branchName: '', accountNo: '', routingNo: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/parties/${partyId}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add bank info')
      }
      toast.success('Bank info added successfully')
      
      // Delay closing slightly for better UX
      setTimeout(() => {
        onSuccess()
        onClose()
        setFormData({ bankName: '', branchName: '', accountNo: '', routingNo: '' })
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
          <Dialog.Title className="text-xl font-bold mb-6">Add Bank Information</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch Name</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Routing Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <input className="w-full p-2.5 rounded-lg border border-border bg-background" value={formData.routingNo} onChange={e => setFormData({...formData, routingNo: e.target.value})} />
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
