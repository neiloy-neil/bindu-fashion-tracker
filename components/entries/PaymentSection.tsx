import { useFieldArray, Control, UseFormRegister, useWatch, UseFormSetValue, FieldErrors, Controller } from 'react-hook-form'
import { Plus, X, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { Party } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
        <div key={field.id} className="relative mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group">
          <Button type="button" size="icon" aria-label="Remove payment" onClick={() => remove(idx)} className="absolute -right-2 -top-2 z-10 h-7 w-7 rounded-full bg-destructive text-destructive-foreground">
            <X size={14} />
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Controller
                control={control}
                name={`payments.${idx}.partyId` as const}
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full text-sm">
                      <SelectValue placeholder="Select Party" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.payments?.[idx]?.partyId?.message && <span className="text-xs text-destructive mt-1 block">{errors.payments[idx].partyId.message}</span>}
            </div>
            <div>
              <Controller
                control={control}
                name={`payments.${idx}.method` as const}
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="BANK">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Input type="number"
                className="h-10 w-full text-right tabular-nums font-mono" placeholder="Amount" {...register(`payments.${idx}.amount` as const)} />
              {errors.payments?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.payments[idx].amount.message}</span>}
            </div>
            <div>
              <Input type="text" className="h-10 w-full text-sm" placeholder="Note" {...register(`payments.${idx}.note` as const)} />
            </div>
            {paymentsWatch[idx]?.method === 'CHEQUE' && (
              <>
                <div><Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Issue date</Label><Input type="date" className="h-10 w-full text-sm" {...register(`payments.${idx}.issueDate` as const)} /></div>
                <div><Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Withdrawal date</Label><Input type="date" className="h-10 w-full text-sm" {...register(`payments.${idx}.withdrawDate` as const)} /></div>
              </>
            )}
             
            {(paymentsWatch[idx]?.method === 'BANK' || paymentsWatch[idx]?.method === 'CHEQUE') && (
              <div className="sm:col-span-4 mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <Label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  Payslip Attachment (required) 
                  {uploadingAttachment[idx] && <span className="text-primary animate-pulse">Uploading...</span>}
                </Label>
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
                    <Button 
                      type="button"
                      onClick={() => {
                        const key = paymentsWatch[idx].attachmentKey
                        setValue(`payments.${idx}.attachmentKey`, undefined, { shouldDirty: true })
                        if (key && typeof key === 'string') void fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => append({ id: generateId(), partyId: '', method: 'CASH', amount: '', note: '', issueDate: '', withdrawDate: '' })} className="h-auto gap-1 px-0 text-xs text-primary hover:text-primary">
        <Plus size={14} /> Add Payment
      </Button>
    </div>
  )
}
