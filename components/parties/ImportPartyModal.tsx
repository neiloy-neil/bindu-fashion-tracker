import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImportPartyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Party Name (*)' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'secondaryNumber', label: 'Secondary Number' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'balance', label: 'Balance / Opening Due' },
]

export function ImportPartyModal({ isOpen, onClose, onSuccess }: ImportPartyModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  
  // Mapping: Excel Header -> System Field Key
  const [mapping, setMapping] = useState<Record<string, string>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    
    // Preview headers
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', selected)
      
      const res = await fetch('/api/parties/import/preview', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to read Excel file')
      
      setHeaders(data.headers || [])
      
      // Auto-map based on exact or lower-case match
      const initialMapping: Record<string, string> = {}
      ;(data.headers || []).forEach((h: string) => {
        const lowerH = h.toLowerCase()
        const match = REQUIRED_FIELDS.find(f => lowerH.includes(f.key.toLowerCase()) || lowerH.includes(f.label.toLowerCase().replace(' (*)', '')))
        if (match) {
          initialMapping[h] = match.key
        }
      })
      
      setMapping(initialMapping)
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    
    setIsProcessing(true)
    const toastId = toast.loading('Importing parties...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))
      
      const res = await fetch('/api/parties/import', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to import')
      
      toast.success(`Imported ${data.summary.created} parties.`, { id: toastId })
      if (data.summary.errors.length > 0) {
        // Show errors in console or a separate modal if needed
        console.warn('Import Errors:', data.summary.errors)
        toast.error(`${data.summary.errors.length} rows had errors. Check console.`)
      }
      
      resetAndClose()
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetAndClose = () => {
    setFile(null)
    setStep(1)
    setHeaders([])
    setMapping({})
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && resetAndClose()}>
      <DialogContent className="sm:max-w-[600px] bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Parties</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Upload an Excel file to bulk import parties.' : 'Map your Excel columns to the system fields.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-raised)] gap-4 mt-4">
            <Upload size={48} className="text-[var(--text-muted)]" />
            <div className="text-center">
              <h3 className="font-medium text-lg">Click to select an Excel file</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Supports .xlsx and .xls</p>
            </div>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? 'Reading file...' : 'Select File'}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4">
            <div className="bg-[var(--accent)]/10 text-[var(--accent)] p-3 rounded-lg flex gap-3 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unmapped columns are safe!</p>
                <p className="opacity-90 mt-0.5">Any columns you leave as &quot;Save as Extra Data&quot; will be dynamically saved to the party&apos;s profile.</p>
              </div>
            </div>

            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-3 font-semibold text-[var(--text-muted)] w-1/2">Excel Column Header</th>
                    <th className="text-left p-3 font-semibold text-[var(--text-muted)] w-1/2">System Field</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, idx) => (
                    <tr key={idx} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium text-[var(--text-primary)] truncate max-w-[200px]" title={header}>
                        {header}
                      </td>
                      <td className="p-2">
                        <select
                          className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          value={mapping[header] || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setMapping(prev => ({
                              ...prev,
                              [header]: val
                            }))
                          }}
                        >
                          <option value="">-- Save as Extra Data --</option>
                          {REQUIRED_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isProcessing}>Back</Button>
              <Button onClick={handleImport} disabled={isProcessing} className="gap-2">
                <CheckCircle2 size={16} /> {isProcessing ? 'Importing...' : 'Confirm & Import'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
