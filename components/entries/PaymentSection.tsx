import { useFieldArray, Control, UseFormRegister, useWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Plus, X, Paperclip } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Party } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setValue: UseFormSetValue<NewEntryFormValues>
  parties: Party[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

export function PaymentSection({ control, register, setValue, parties, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'payments'
  })
  
  const paymentsWatch = useWatch({ control, name: 'payments' }) || []
  const [uploadingAttachment, setUploadingAttachment] = useState<Record<string, boolean>>({})

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Party Payments</h3>
      {fields.map((field, idx) => (
        <div key={field.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-3 relative group">
          <button type="button" aria-label="Remove payment" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
            <X size={14} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <select className={selectClass} {...register(`payments.${idx}.partyId` as const)}>
                <option value="">Select Party</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.payments?.[idx]?.partyId?.message && <span className="text-xs text-destructive mt-1 block">{errors.payments[idx].partyId.message}</span>}
            </div>
            <div>
              <select className={selectClass} {...register(`payments.${idx}.method` as const)}>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div>
              <input type="number"
                className={`text-right tabular-nums font-mono ${inputClass}`} placeholder="Amount" {...register(`payments.${idx}.amount` as const)} />
              {errors.payments?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.payments[idx].amount.message}</span>}
            </div>
            <div>
              <input type="text" className={inputClass} placeholder="Note" {...register(`payments.${idx}.note` as const)} />
            </div>
            {paymentsWatch[idx]?.method === 'CHEQUE' && (
              <>
                <div><label className="form-label">Issue date</label><input type="date" className={inputClass} {...register(`payments.${idx}.issueDate` as const)} /></div>
                <div><label className="form-label">Withdrawal date</label><input type="date" className={inputClass} {...register(`payments.${idx}.withdrawDate` as const)} /></div>
              </>
            )}
            
            {(paymentsWatch[idx]?.method === 'BANK' || paymentsWatch[idx]?.method === 'CHEQUE') && (
              <div className="sm:col-span-4 mt-2 p-3 bg-muted/30 border border-border rounded-lg">
                <label className="form-label text-xs flex items-center gap-2">
                  Payslip Attachment (required) 
                  {uploadingAttachment[idx] && <span className="text-primary animate-pulse">Uploading...</span>}
                </label>
                {!paymentsWatch[idx]?.attachmentKey ? (
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    disabled={uploadingAttachment[idx]}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setValue(`payments.${idx}.attachmentKey`, file, { shouldDirty: true })
                    }}
                    className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-primary text-xs flex items-center gap-1"><Paperclip size={14} /> {paymentsWatch[idx].attachmentKey instanceof File ? paymentsWatch[idx].attachmentKey.name : 'Payslip attached'}</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const key = paymentsWatch[idx].attachmentKey
                        setValue(`payments.${idx}.attachmentKey`, undefined, { shouldDirty: true })
                        if (key && typeof key === 'string') void fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      ))}
      <button type="button" onClick={() => append({ id: generateId(), partyId: '', method: 'CASH', amount: '', note: '', issueDate: '', withdrawDate: '' })} className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Payment
      </button>
    </div>
  )
}
