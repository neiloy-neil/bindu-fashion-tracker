'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import { Building2, Smartphone, Landmark, CheckCircle2 } from 'lucide-react'

type MethodType = 'BANK' | 'BKASH' | 'NAGAD' | 'OTHER'

export function PaymentMethodModal({ isOpen, onClose, partyId, onSuccess }: { isOpen: boolean, onClose: () => void, partyId: number, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<MethodType>('BANK')
  const [formData, setFormData] = useState({
    accountNo: '',
    accountName: '',
    bankName: '',
    branchName: '',
    routingNo: '',
    isDefault: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        type,
        accountNo: formData.accountNo,
        accountName: formData.accountName,
        isDefault: formData.isDefault,
        ...(type === 'BANK' ? {
          bankName: formData.bankName,
          branchName: formData.branchName,
          routingNo: formData.routingNo
        } : {})
      }

      const res = await fetch(`/api/parties/${partyId}/bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add payment method')
      }
      toast.success('Payment method added successfully')
      
      setTimeout(() => {
        onSuccess()
        onClose()
        setType('BANK')
        setFormData({ accountNo: '', accountName: '', bankName: '', branchName: '', routingNo: '', isDefault: false })
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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl shadow-2xl z-50 border border-border">
          <Dialog.Title className="text-xl font-bold mb-6 text-card-foreground">Add Payment Method</Dialog.Title>
          
          <div className="flex gap-2 mb-6 bg-muted/30 p-1.5 rounded-xl border border-border/50">
            {[
              { id: 'BANK', label: 'Bank', icon: Landmark },
              { id: 'BKASH', label: 'bKash', icon: Smartphone },
              { id: 'NAGAD', label: 'Nagad', icon: Smartphone }
            ].map((m) => {
              const Icon = m.icon
              const isActive = type === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setType(m.id as MethodType)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
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
            {type === 'BANK' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-card-foreground">Bank Name</label>
                  <input required className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="e.g. City Bank" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-card-foreground">Branch</label>
                    <input className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} placeholder="e.g. Gulshan" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-card-foreground">Routing No.</label>
                    <input className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" value={formData.routingNo} onChange={e => setFormData({...formData, routingNo: e.target.value})} placeholder="Optional" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5 text-card-foreground">{type === 'BANK' ? 'Account Number' : 'Mobile Number'}</label>
              <input required className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} placeholder={type === 'BANK' ? 'Enter account number' : 'e.g. 017XXXXXXXX'} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-card-foreground">Account Name <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <input className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} placeholder="Name on the account" />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors mt-2">
              <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} />
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">Set as Default {type === 'BANK' ? 'Bank' : type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Will be pre-selected for future payments</p>
              </div>
            </label>

            <div className="flex gap-3 mt-8 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Method</>}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
