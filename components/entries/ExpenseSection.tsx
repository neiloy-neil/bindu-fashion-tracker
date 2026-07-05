'use client'

import { useFieldArray, Control, UseFormRegister, UseFormSetValue, useWatch, FieldErrors, Controller } from 'react-hook-form'
import { Plus, X, Paperclip, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Category } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setValue: UseFormSetValue<NewEntryFormValues>
  expenseCategories: Category[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

const PERIODIC = ['MONTHLY', 'WEEKLY', 'AS_NEEDED']

const freqBadge: Record<string, string> = {
  MONTHLY:   'Monthly',
  WEEKLY:    'Weekly',
  AS_NEEDED: 'As Needed',
}

// ─── ExpenseRow is a TOP-LEVEL component to prevent remounting on every render ───
// If defined inside ExpenseSection, React would recreate it on each parent render
// (triggered by useWatch), causing all inputs to unmount/remount and reset values.
interface ExpenseRowProps {
  idx: number
  fieldId: string
  expenses: NewEntryFormValues['expenseEntries']
  expenseCategories: Category[]
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setValue: UseFormSetValue<NewEntryFormValues>
  errors: FieldErrors<NewEntryFormValues>
  remove: (idx: number) => void
  inputClass: string
  selectClass: string
}

function ExpenseRow({
  idx,
  expenses,
  expenseCategories,
  control,
  register,
  setValue,
  errors,
  remove,
  inputClass,
  selectClass,
}: ExpenseRowProps) {
  const catId = Number(expenses[idx]?.categoryId)
  const cat = expenseCategories.find(c => c.id === catId)
  const isPeriodic = cat?.frequency && PERIODIC.includes(cat.frequency)
  const dailyCategories = expenseCategories.filter(c => !c.frequency || c.frequency === 'DAILY')
  const periodicCategories = expenseCategories.filter(c => c.frequency && PERIODIC.includes(c.frequency))
  const availableCats = isPeriodic ? periodicCategories : dailyCategories

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-3 relative">
      <button type="button" aria-label="Remove" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
        <X size={13} />
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <Controller
            control={control}
            name={`expenseEntries.${idx}.categoryId` as const}
            render={({ field }) => (
              <SearchableSelect
                value={field.value ? String(field.value) : ''}
                onChange={field.onChange}
                placeholder="Select Category"
                options={availableCats.map(c => ({ value: String(c.id), label: c.name }))}
              />
            )}
          />
          {errors.expenseEntries?.[idx]?.categoryId?.message && (
            <span className="text-xs text-destructive mt-1 block">{errors.expenseEntries[idx].categoryId.message}</span>
          )}
        </div>
        <div>
          <input
            type="number"
            className={`text-right tabular-nums font-mono ${inputClass}`}
            placeholder="Amount"
            {...register(`expenseEntries.${idx}.amount` as const)}
          />
          {errors.expenseEntries?.[idx]?.amount?.message && (
            <span className="text-xs text-destructive mt-1 block">{errors.expenseEntries[idx].amount.message}</span>
          )}
        </div>
        <div className="sm:col-span-2">
          <input type="text" className={inputClass} placeholder="Note" {...register(`expenseEntries.${idx}.note` as const)} />
        </div>
        <div className="sm:col-span-4">
          {cat?.requiresAttachment !== false && (
            !expenses[idx]?.attachmentKey ? (
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={event => {
                const file = event.target.files?.[0]
                if (!file) return
                setValue(`expenseEntries.${idx}.attachmentKey`, file, { shouldDirty: true })
              }} />
            ) : (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Paperclip size={13} />
                {expenses[idx].attachmentKey instanceof File ? expenses[idx].attachmentKey.name : 'Receipt attached'}
                <button type="button" className="text-destructive" onClick={() => {
                  const key = expenses[idx].attachmentKey
                  setValue(`expenseEntries.${idx}.attachmentKey`, undefined, { shouldDirty: true })
                  if (key && typeof key === 'string') void fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
                }}>Remove</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export function ExpenseSection({ control, register, setValue, expenseCategories, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'expenseEntries' })
  const expenses = useWatch({ control, name: 'expenseEntries' }) || []

  const dailyCategories   = expenseCategories.filter(c => !c.frequency || c.frequency === 'DAILY')
  const periodicCategories = expenseCategories.filter(c => c.frequency && PERIODIC.includes(c.frequency))

  // Determine which field indices belong to which zone
  const getZone = (idx: number) => {
    const catId = Number(expenses[idx]?.categoryId)
    const cat = expenseCategories.find(c => c.id === catId)
    return cat?.frequency && PERIODIC.includes(cat.frequency) ? 'periodic' : 'daily'
  }

  const dailyIndices   = fields.map((_, i) => i).filter(i => getZone(i) === 'daily')
  const periodicIndices = fields.map((_, i) => i).filter(i => getZone(i) === 'periodic')

  // Auto-expand periodic if it has saved data
  const [periodicOpen, setPeriodicOpen] = useState(() => periodicIndices.length > 0)

  return (
    <div>
      {/* Daily expenses — always visible */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Daily Expenses</h3>
      {dailyIndices.map(idx => (
        <ExpenseRow
          key={fields[idx].id}
          idx={idx}
          fieldId={fields[idx].id}
          expenses={expenses}
          expenseCategories={expenseCategories}
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          remove={remove}
          inputClass={inputClass}
          selectClass={selectClass}
        />
      ))}
      {dailyCategories.length > 0 ? (
        <button
          type="button"
          onClick={() => append({ id: generateId(), categoryId: '', amount: '', note: '' })}
          className="text-xs text-primary hover:underline flex items-center gap-1 mb-6"
        >
          <Plus size={13} /> Add Daily Expense
        </button>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] italic mb-6">No daily expense categories set up yet.</p>
      )}

      {/* Periodic expenses — collapsed by default */}
      <button
        type="button"
        onClick={() => setPeriodicOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 w-full text-left hover:text-[var(--text-primary)] transition-colors"
      >
        {periodicOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        Periodic Expenses
        {periodicIndices.length > 0 && (
          <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] normal-case tracking-normal">
            {periodicIndices.length} added
          </span>
        )}
        <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-[var(--text-secondary)]">
          Rent · Internet · etc.
        </span>
      </button>

      {periodicOpen && (
        <div className="pl-1 border-l-2 border-[var(--border)] ml-1 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {periodicCategories.map(c => (
              <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                {c.name} · {freqBadge[c.frequency ?? ''] ?? c.frequency}
              </span>
            ))}
            {periodicCategories.length === 0 && (
              <span className="text-xs text-[var(--text-secondary)] italic">No periodic categories set up yet.</span>
            )}
          </div>
          {periodicIndices.map(idx => (
            <ExpenseRow
              key={fields[idx].id}
              idx={idx}
              fieldId={fields[idx].id}
              expenses={expenses}
              expenseCategories={expenseCategories}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              remove={remove}
              inputClass={inputClass}
              selectClass={selectClass}
            />
          ))}
          {periodicCategories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                append({ id: generateId(), categoryId: String(periodicCategories[0].id), amount: '', note: '' })
                setPeriodicOpen(true)
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Add Periodic Expense
            </button>
          )}
        </div>
      )}
    </div>
  )
}
