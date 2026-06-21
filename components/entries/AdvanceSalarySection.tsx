import { useFieldArray, Control, UseFormRegister, FieldErrors } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Employee } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  employees: Employee[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

export function AdvanceSalarySection({ control, register, employees, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'advanceSalaries'
  })
  
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Advance Salaries</h3>
      {fields.map((field, idx) => (
        <div key={field.id} className="bg-card border border-border rounded-lg p-4 mb-3 relative group">
          <button type="button" aria-label="Remove advance" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
            <X size={14} />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <select className={selectClass} {...register(`advanceSalaries.${idx}.employeeId` as const)}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.advanceSalaries?.[idx]?.employeeId?.message && <span className="text-xs text-destructive mt-1 block">{errors.advanceSalaries[idx].employeeId.message}</span>}
            </div>
            <div>
              <select className={selectClass} {...register(`advanceSalaries.${idx}.type` as const)}>
                <option value="CASH">Cash Advance</option>
                <option value="PRODUCT">Product Purchase</option>
              </select>
            </div>
            <div>
              <input type="number" className={inputClass} placeholder="Amount" {...register(`advanceSalaries.${idx}.amount` as const)} />
              {errors.advanceSalaries?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.advanceSalaries[idx].amount.message}</span>}
            </div>
            <div>
              <input type="text" className={inputClass} placeholder="Note" {...register(`advanceSalaries.${idx}.note` as const)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => append({ id: generateId(), employeeId: '', type: 'CASH', amount: '', productDescription: '', note: '' })} className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Advance
      </button>
    </div>
  )
}
