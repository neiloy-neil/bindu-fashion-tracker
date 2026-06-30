import { useFieldArray, Control, UseFormRegister, FieldErrors, useWatch } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Account, Branch } from '@/lib/types'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  accounts: Account[]
  branches: Branch[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

// ─── TransferRow — top-level component to prevent remounting on parent re-renders
interface TransferRowProps {
  idx: number
  register: UseFormRegister<NewEntryFormValues>
  errors: FieldErrors<NewEntryFormValues>
  remove: (idx: number) => void
  accounts: Account[]
  branches: Branch[]
  inputClass: string
  selectClass: string
  transferValues: NewEntryFormValues['transfers']
}

function TransferRow({
  idx,
  register,
  errors,
  remove,
  accounts,
  branches,
  inputClass,
  selectClass,
  transferValues,
}: TransferRowProps) {
  const selectedBranchId = Number(transferValues?.[idx]?.branchId)

  // Filter accounts by selected branch (or show all if no branch selected)
  const filteredAccounts = selectedBranchId
    ? accounts.filter(a => a.branchId === selectedBranchId)
    : accounts

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
          <select
            className={selectClass}
            {...register(`transfers.${idx}.branchId` as const)}
          >
            <option value="">Any Branch</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Account selector — filtered by branch */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Account / Method</label>
          <select className={selectClass} {...register(`transfers.${idx}.accountId` as const)}>
            <option value="">Select Account</option>
            {filteredAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
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

export function TransferSection({ control, register, accounts, branches, inputClass, selectClass, errors, generateId }: Props) {
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
          register={register}
          errors={errors}
          remove={remove}
          accounts={accounts}
          branches={branches}
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
