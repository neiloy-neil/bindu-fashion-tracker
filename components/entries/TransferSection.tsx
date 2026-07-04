import { useFieldArray, Control, UseFormRegister, FieldErrors, useWatch, Controller } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Account, Branch } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  accounts: Account[]
  branches: Branch[]
  currentBranchId?: string
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

// ─── TransferRow — top-level component to prevent remounting on parent re-renders
interface TransferRowProps {
  idx: number
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  errors: FieldErrors<NewEntryFormValues>
  remove: (idx: number) => void
  accounts: Account[]
  branches: Branch[]
  currentBranchId?: string
  inputClass: string
  selectClass: string
  transferValues: NewEntryFormValues['transfers']
}

function TransferRow({
  idx,
  control,
  register,
  errors,
  remove,
  accounts,
  branches,
  currentBranchId,
  inputClass,
  selectClass,
  transferValues,
}: TransferRowProps) {
  const selectedBranchId = Number(transferValues?.[idx]?.branchId)

  // Filter accounts by selected branch (or show all if no branch selected)
  const filteredAccounts = selectedBranchId
    ? accounts.filter(a => a.branchId === selectedBranchId)
    : accounts

  // Filter out the current branch from the "To Branch" dropdown
  const filteredBranches = currentBranchId 
    ? branches.filter(b => String(b.id) !== currentBranchId)
    : branches

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-3 relative group">
      <button
        type="button"
        aria-label="Remove transfer"
        onClick={() => remove(idx)}
        className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10"
      >
        <X size={14} />
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* To Branch selector */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">To Branch</label>
          <Controller
            control={control}
            name={`transfers.${idx}.branchId` as const}
            render={({ field }) => (
              <SearchableSelect
                value={field.value ? String(field.value) : ''}
                onChange={field.onChange}
                placeholder="Select Branch"
                options={filteredBranches.map(b => ({ value: String(b.id), label: b.name }))}
              />
            )}
          />
        </div>

        {/* Account selector — filtered by branch */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Account / Method</label>
          <Controller
            control={control}
            name={`transfers.${idx}.accountId` as const}
            render={({ field }) => (
              <SearchableSelect
                value={field.value ? String(field.value) : ''}
                onChange={field.onChange}
                placeholder="Select Account"
                options={filteredAccounts.map(a => ({ value: String(a.id), label: a.name }))}
              />
            )}
          />
          {errors.transfers?.[idx]?.accountId?.message && (
            <span className="text-xs text-destructive mt-1 block">{errors.transfers[idx].accountId.message}</span>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Amount</label>
          <input
            type="number"
            className={`text-right tabular-nums font-mono ${inputClass}`}
            placeholder="Amount"
            {...register(`transfers.${idx}.amount` as const)}
          />
          {errors.transfers?.[idx]?.amount?.message && (
            <span className="text-xs text-destructive mt-1 block">{errors.transfers[idx].amount.message}</span>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Note</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Note (optional)"
            {...register(`transfers.${idx}.note` as const)}
          />
        </div>
      </div>
    </div>
  )
}

export function TransferSection({ control, register, accounts, branches, currentBranchId, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'transfers'
  })

  const transferValues = useWatch({ control, name: 'transfers' })

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bank / Bkash Transfers</h3>
      {fields.map((field, idx) => (
        <TransferRow
          key={field.id}
          idx={idx}
          control={control}
          register={register}
          errors={errors}
          remove={remove}
          accounts={accounts}
          branches={branches}
          currentBranchId={currentBranchId}
          inputClass={inputClass}
          selectClass={selectClass}
          transferValues={transferValues || []}
        />
      ))}
      <button
        type="button"
        onClick={() => append({ id: generateId(), branchId: '', accountId: '', amount: '', note: '' })}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Plus size={14} /> Add Transfer
      </button>
    </div>
  )
}
