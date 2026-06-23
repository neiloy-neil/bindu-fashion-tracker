import { useState } from 'react'
import { X, Building2, Phone, MapPin, Loader2, Calendar } from 'lucide-react'

interface AddPartyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddPartyModal({ isOpen, onClose, onSuccess }: AddPartyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    contactNumber: '',
    secondaryNumber: '',
    address: '',
    openingDueAmount: '',
    openingDueDate: new Date().toISOString().split('T')[0]
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation per user's strict requirements
    if (!formData.name || !formData.contactPerson || !formData.contactNumber || !formData.secondaryNumber || !formData.address) {
      setError('All fields (Name, Contact Person, Contact Number, Secondary Number, Address) are strictly required.')
      return
    }

    if (parseFloat(formData.openingDueAmount || '0') > 0 && !formData.openingDueDate) {
      setError('Activity Date is required if Opening Due Amount is specified.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create party')
      }

      onSuccess()
      onClose()
      setFormData({
        name: '',
        contactPerson: '',
        contactNumber: '',
        secondaryNumber: '',
        address: '',
        openingDueAmount: '',
        openingDueDate: new Date().toISOString().split('T')[0]
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl max-h-[90dvh] flex flex-col rounded-xl shadow-xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border bg-muted/20">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="text-primary" />
            Add New Party / Vendor
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Company / Party Name <span className="text-destructive">*</span></label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  required
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Person <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Address <span className="text-destructive">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 123 Business St, Dhaka"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Number <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="tel"
                    required
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="e.g. 01700000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Secondary Number <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="tel"
                    required
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.secondaryNumber}
                    onChange={e => setFormData({ ...formData, secondaryNumber: e.target.value })}
                    placeholder="e.g. 01800000000"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border my-4" />
            <h3 className="font-semibold text-foreground">Opening Balance (Optional)</h3>
            <p className="text-xs text-muted-foreground mb-3">If this party already has a prior due amount, enter it below.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Opening Due Amount (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  value={formData.openingDueAmount}
                  onChange={e => setFormData({ ...formData, openingDueAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Activity Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="date"
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.openingDueDate}
                    onChange={e => setFormData({ ...formData, openingDueDate: e.target.value })}
                    required={parseFloat(formData.openingDueAmount || '0') > 0}
                  />
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="p-6 flex justify-end gap-3 border-t border-border bg-card shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Party'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
