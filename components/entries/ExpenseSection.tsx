import { useFieldArray, Control, UseFormRegister, UseFormSetValue, useWatch, FieldErrors } from 'react-hook-form'
import { Plus, X, Paperclip } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ExpenseCategory } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setValue: UseFormSetValue<NewEntryFormValues>
  expenseCategories: ExpenseCategory[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

export function ExpenseSection({ control, register, setValue, expenseCategories, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'expenseEntries'
  })
  const expenses = useWatch({ control, name: 'expenseEntries' }) || []
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Expenses</h3>
      {fields.map((field, idx) => (
        <div key={field.id} className="bg-card border border-border rounded-lg p-4 mb-3 relative group">
          <button type="button" aria-label="Remove expense" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
            <X size={14} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <select className={selectClass} {...register(`expenseEntries.${idx}.categoryId` as const)}>
                <option value="">Select Category</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.expenseEntries?.[idx]?.categoryId?.message && <span className="text-xs text-destructive mt-1 block">{errors.expenseEntries[idx].categoryId.message}</span>}
            </div>
            <div>
              <input type="number" className={inputClass} placeholder="Amount" {...register(`expenseEntries.${idx}.amount` as const)} />
              {errors.expenseEntries?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.expenseEntries[idx].amount.message}</span>}
            </div>
            <div className="sm:col-span-2">
              <input type="text" className={inputClass} placeholder="Note" {...register(`expenseEntries.${idx}.note` as const)} />
            </div>
            <div className="sm:col-span-4">
              {!expenses[idx]?.attachmentKey ? <input type="file" accept="image/*,.pdf" disabled={uploading[idx]} onChange={async event => {
                const file = event.target.files?.[0]
                if (!file) return
                setUploading(value => ({ ...value, [idx]: true }))
                try {
                  const formData = new FormData(); formData.append('file', file)
                  const response = await fetch('/api/upload', { method: 'POST', body: formData })
                  const result = await response.json()
                  if (!response.ok) throw new Error(result.message || result.error || 'Upload failed')
                  setValue(`expenseEntries.${idx}.attachmentKey`, result.key)
                } catch (error) { toast.error(error instanceof Error ? error.message : 'Upload failed') }
                finally { setUploading(value => ({ ...value, [idx]: false })) }
              }} /> : <div className="flex items-center gap-2 text-xs text-primary"><Paperclip size={14}/> Receipt attached <button type="button" className="text-destructive" onClick={() => {
                const key = expenses[idx].attachmentKey
                setValue(`expenseEntries.${idx}.attachmentKey`, undefined)
                if (key) void fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
              }}>Remove</button></div>}
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => append({ id: generateId(), categoryId: '', amount: '', note: '' })} className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Expense
      </button>
    </div>
  )
}
