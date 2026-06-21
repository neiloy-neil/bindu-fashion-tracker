import { useFieldArray, Control, UseFormRegister, FieldErrors } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Account } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  accounts: Account[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

export function TransferSection({ control, register, accounts, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'transfers'
  })
  
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bank/Bkash Transfers</h3>
      {fields.map((field, idx) => (
        <div key={field.id} className="bg-card border border-border rounded-lg p-4 mb-3 relative group">
          <button type="button" aria-label="Remove transfer" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
            <X size={14} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <select className={selectClass} {...register(`transfers.${idx}.accountId` as const)}>
                <option value="">Select Account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.transfers?.[idx]?.accountId?.message && <span className="text-xs text-destructive mt-1 block">{errors.transfers[idx].accountId.message}</span>}
            </div>
            <div>
              <input type="number" className={inputClass} placeholder="Amount" {...register(`transfers.${idx}.amount` as const)} />
              {errors.transfers?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.transfers[idx].amount.message}</span>}
            </div>
            <div className="sm:col-span-2">
              <input type="text" className={inputClass} placeholder="Note" {...register(`transfers.${idx}.note` as const)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => append({ id: generateId(), accountId: '', amount: '', note: '' })} className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Transfer
      </button>
    </div>
  )
}
