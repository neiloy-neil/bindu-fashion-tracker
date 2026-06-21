'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod' // wait, the original used '@hookform/resolvers/zod'
import { NewEntryFormValues, newEntryFormSchema } from '@/lib/schemas'
import { Account, Branch, Category, Employee, ExpenseCategory, Party } from '@/lib/types'
import { computeTotals, formatCurrency } from '@/lib/utils'
import { dhakaDateString, NewEntryPayload } from '@/lib/new-entry'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { IncomeSection } from './IncomeSection'
import { ExpenseSection } from './ExpenseSection'
import { TransferSection } from './TransferSection'
import { PaymentSection } from './PaymentSection'
import { AdvanceSalarySection } from './AdvanceSalarySection'
import { EODChecklistModal } from './EODChecklistModal'

const generateId = () => Math.random().toString(36).substring(2, 9)

function ErrorMsg({ error }: { error?: { message?: string } }) {
  if (!error?.message) return null
  return <span className="text-xs text-destructive mt-1 block">{error.message}</span>
}

interface Props {
  initialData: {
    branches: Branch[]
    categories: Category[]
    accounts: Account[]
    parties: Party[]
    expenseCategories: ExpenseCategory[]
    employees: Employee[]
  }
  userId: string
}

export function NewEntryForm({ initialData, userId }: Props) {
  const router = useRouter()
  const { branches, categories, accounts, parties, expenseCategories, employees } = initialData
  
  const [loading, setLoading] = useState(false)
  const [showChecklistModal, setShowChecklistModal] = useState(false)

  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)

  const today = dhakaDateString()
  const draftKey = `newEntryDraft:v2:${userId}`

  const form = useForm<NewEntryFormValues>({
    resolver: zodResolver(newEntryFormSchema),
    defaultValues: {
      formMeta: { date: today, branchId: branches.length === 1 ? String(branches[0].id) : '', openingTime: '09:00', closingTime: '21:00' },
      incomeItems: [],
      transfers: [],
      payments: [],
      expenseEntries: [],
      advanceSalaries: [],
      globalNotes: '',
      actualPhysicalCash: '',
      cashDifferenceNote: '',
      eodChecklist: {
        safeLocked: false, acOff: false, shopClean: false, shuttersDown: false, cashVerified: false, signature: ''
      }
    }
  })

  const { control, handleSubmit, setValue, formState: { errors } } = form

  const { fields: incomeFields } = useFieldArray({ control, name: 'incomeItems' })
  const { fields: transferFields } = useFieldArray({ control, name: 'transfers' })
  const { fields: paymentFields } = useFieldArray({ control, name: 'payments' })
  const { fields: expenseFields } = useFieldArray({ control, name: 'expenseEntries' })
  const { fields: advanceFields } = useFieldArray({ control, name: 'advanceSalaries' })

  // Use localized useWatch for performance
  const branchId = useWatch({ control, name: 'formMeta.branchId' })
  const date = useWatch({ control, name: 'formMeta.date' })
  const actualPhysicalCash = useWatch({ control, name: 'actualPhysicalCash' })
  
  const incomeAmounts = useWatch({ control, name: incomeFields.map((_, i) => `incomeItems.${i}.amount` as const) })
  const incomeCategories = useWatch({ control, name: incomeFields.map((_, i) => `incomeItems.${i}.categoryId` as const) })
  const expenseAmounts = useWatch({ control, name: expenseFields.map((_, i) => `expenseEntries.${i}.amount` as const) })
  const transferAmounts = useWatch({ control, name: transferFields.map((_, i) => `transfers.${i}.amount` as const) })
  const paymentAmounts = useWatch({ control, name: paymentFields.map((_, i) => `payments.${i}.amount` as const) })
  const paymentMethods = useWatch({ control, name: paymentFields.map((_, i) => `payments.${i}.method` as const) })
  const advanceAmounts = useWatch({ control, name: advanceFields.map((_, i) => `advanceSalaries.${i}.amount` as const) })
  const advanceTypes = useWatch({ control, name: advanceFields.map((_, i) => `advanceSalaries.${i}.type` as const) })
  
  const payments = useWatch({ control, name: 'payments' })
  const draftValues = useWatch({ control })

  const hasInvalidPayments = payments?.some(p => (p.method === 'BANK' || p.method === 'CHEQUE') && !p.attachmentKey)

  const totals = useMemo(() => {
    const fakeEntry = {
      items: (incomeAmounts || []).map((amt, i) => ({ amount: Number(amt), category: categories.find(c => c.id === Number(incomeCategories[i])) || null })),
      transfers: (transferAmounts || []).map(amt => ({ amount: Number(amt) })),
      payments: (paymentAmounts || []).map((amt, i) => ({ amount: Number(amt), method: paymentMethods[i] })),
      expenseEntries: (expenseAmounts || []).map(amt => ({ amount: Number(amt) })),
      advanceSalaries: (advanceAmounts || []).map((amt, i) => ({ amount: Number(amt), type: advanceTypes[i] }))
    }
    return computeTotals(fakeEntry)
  }, [incomeAmounts, incomeCategories, expenseAmounts, transferAmounts, paymentAmounts, paymentMethods, advanceAmounts, advanceTypes, categories])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(draftValues))
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [draftKey, draftValues])

  useEffect(() => {
    const draft = localStorage.getItem(draftKey)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        const validated = newEntryFormSchema.safeParse(parsed)
        if (validated.success && window.confirm('Restore your saved New Entry draft?')) form.reset(validated.data)
        else if (!validated.success || window.confirm('Discard the saved draft?')) localStorage.removeItem(draftKey)
      } catch { localStorage.removeItem(draftKey) }
    }
  }, [draftKey, form])

  useEffect(() => {
    if (branchId && date && categories.length > 0) {
      fetch(`/api/branches/${branchId}/last-balance?date=${date}`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            const openingCat = categories.find(c => c.name === 'Opening Balance')
            if (openingCat) {
              const currentIncome = form.getValues('incomeItems')
              const idx = currentIncome.findIndex(i => String(i.categoryId) === String(openingCat.id))
              if (idx !== -1) {
                setValue(`incomeItems.${idx}.amount`, data.openingBalance)
              } else {
                setValue('incomeItems', [
                  { id: generateId(), categoryId: String(openingCat.id), amount: data.openingBalance || 0, detail: { note: 'Auto-filled from previous closing balance', partyName: '', files: [] } },
                  ...currentIncome
                ])
              }
            }
          }
        }).catch(() => toast.error('Could not load the latest opening balance'))
    }
  }, [branchId, date, categories, setValue, form, branches.length])

  const onSubmitFinal = async () => {
    const data = form.getValues()
    
    setLoading(true)
    const uploadToast = toast.loading('Uploading attachments and submitting entry...')
    
    try {
      // Helper to upload a File and return its remote key, or return the existing string key
      const uploadFile = async (file: File | string | undefined): Promise<string | undefined> => {
        if (!file) return undefined
        if (typeof file === 'string') return file
        
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || result.error || 'Upload failed')
        return result.key
      }

      const itemsToSubmit = []
      for (const item of data.incomeItems) {
        if (!item.categoryId) continue
        const note = item.detail.note?.trim()
        const rawFiles = item.detail.files || []
        
        if (note && rawFiles.length === 0) {
          toast.error("Receipt image is required when a note is provided for Income/Expense.")
          toast.dismiss(uploadToast)
          setLoading(false)
          return
        }
        
        // Upload any pending File objects
        const uploadedKeys = await Promise.all(rawFiles.map(f => uploadFile(f)))
        const validKeys = uploadedKeys.filter(Boolean) as string[]

        itemsToSubmit.push({
          categoryId: Number(item.categoryId),
          amount: Number(item.amount),
          receiptKeys: validKeys,
          note: note || '',
          partyName: item.detail.partyName?.trim() || ''
        })
      }
      
      // Upload pending attachment files for Payments
      const processedPayments = await Promise.all(data.payments.map(async p => {
        const key = await uploadFile(p.attachmentKey as any)
        return { ...p, method: p.method as 'CASH' | 'BANK' | 'CHEQUE', partyId: Number(p.partyId), amount: Number(p.amount), attachmentKey: key }
      }))

      // Upload pending attachment files for Expenses
      const processedExpenses = await Promise.all(data.expenseEntries.map(async e => {
        const key = await uploadFile(e.attachmentKey as any)
        return { ...e, categoryId: Number(e.categoryId), amount: Number(e.amount), attachmentKey: key }
      }))
      
      const payload: NewEntryPayload = {
        date: data.formMeta.date,
        branchId: Number(data.formMeta.branchId),
        openingTime: data.formMeta.openingTime || '09:00',
        closingTime: data.formMeta.closingTime || '21:00',
        notes: data.globalNotes || '',
        actualPhysicalCash: Number(data.actualPhysicalCash),
        cashDifferenceNote: data.cashDifferenceNote || '',
        expectedNetBalance: totals.netBalance,
        eodChecklist: data.eodChecklist,
        items: itemsToSubmit,
        transfers: data.transfers.map(t => ({ ...t, accountId: Number(t.accountId), amount: Number(t.amount) })),
        payments: processedPayments,
        expenseEntries: processedExpenses,
        advanceSalaries: data.advanceSalaries.map(a => ({
          type: a.type as 'CASH' | 'PRODUCT', employeeId: Number(a.employeeId), amount: Number(a.amount),
          productDescription: a.productDescription || '', note: a.note || '',
        }))
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || errorData.error || 'Failed to submit')
      }
      
      localStorage.removeItem(draftKey)
      
      // Auto-download Daily Report PDF
      try {
        const dateStr = payload.date
        const branchName = branches.find(b => b.id === payload.branchId)?.name || 'Branch'
        const reportRes = await fetch(`/api/reports/daily?branchId=${payload.branchId}&date=${dateStr}`)
        if (!reportRes.ok) throw new Error('Failed to fetch report')
        const reportData = await reportRes.json()
        
        const { exportReportAsPdf } = await import('@/lib/exportPdf')
        await exportReportAsPdf(reportData, branchName, dateStr)
        
        toast.success('Register closed — daily report downloaded.', { id: uploadToast })
      } catch {
        toast.error('Register closed and saved successfully. Report download failed — you can re-download it from the Daily Report page.', { id: uploadToast, duration: 8000 })
      }

      router.push('/entries')

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving entry', { id: uploadToast })
      setLoading(false)
    }
  }

  const onSubmit = async () => {
    setShowChecklistModal(true)
  }

  // Common UI classes
  const inputClass = "form-input h-10 w-full text-sm bg-card border-border"
  const selectClass = "form-input form-select h-10 w-full text-sm bg-card border-border"

  return (
    <div className="page-body min-w-0">
      <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📝 Daily Entry
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit the end-of-day financial report for your branch.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Branch & Meta Section */}
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label text-xs">Date</label>
              <input type="date" className={inputClass} {...form.register('formMeta.date')} />
              <ErrorMsg error={errors.formMeta?.date} />
            </div>
            <div>
              <label className="form-label text-xs">Branch</label>
              <select className={selectClass} {...form.register('formMeta.branchId')}>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ErrorMsg error={errors.formMeta?.branchId} />
            </div>
            <div>
              <label className="form-label text-xs">Opening Time</label>
              <input type="time" className={inputClass} {...form.register('formMeta.openingTime')} />
            </div>
            <div>
              <label className="form-label text-xs">Closing Time</label>
              <input type="time" className={inputClass} {...form.register('formMeta.closingTime')} />
            </div>
          </div>
        </div>

        {/* Income Section */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <button type="button" aria-expanded={showIncome}
            className="flex w-full justify-between items-center gap-3 p-4 bg-muted/30 text-left"
            onClick={() => setShowIncome(!showIncome)}
          >
            <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
              💰 Income & Collections
              <span className="text-xs bg-[#10b981]/20 text-[#10b981] px-2 py-0.5 rounded ml-2 font-mono">
                {formatCurrency(totals.totalAmount)}
              </span>
            </h2>
            {showIncome ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </button>
          
          {showIncome && (
            <div className="p-4 sm:p-5">
              <IncomeSection 
                control={control}
                register={form.register}
                setValue={setValue}
                categories={categories} 
                inputClass={inputClass} 
                selectClass={selectClass} 
                errors={errors} 
                generateId={generateId} 
              />
            </div>
          )}
        </div>

        {/* Unified Expenses Section */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <button type="button" aria-expanded={showExpense}
            className="flex w-full justify-between items-center gap-3 p-4 bg-muted/30 text-left"
            onClick={() => setShowExpense(!showExpense)}
          >
            <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
              💸 Expenses & Dispersals
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded ml-2 font-mono">
                {formatCurrency(totals.totalExpense)}
              </span>
            </h2>
            {showExpense ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </button>
          
          {showExpense && (
            <div className="p-4 sm:p-5 space-y-8">
              <ExpenseSection control={control} register={form.register} setValue={setValue} expenseCategories={expenseCategories} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
              <TransferSection control={control} register={form.register} accounts={accounts} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
              <AdvanceSalarySection control={control} register={form.register} employees={employees} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
              <PaymentSection control={control} register={form.register} setValue={setValue} parties={parties} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
            </div>
          )}
        </div>

        {/* Net Balance & Physical Cash */}
        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 p-5 sm:p-6 rounded-lg border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <svg viewBox="0 0 24 24" width="100" height="100" fill="currentColor" className="text-primary"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.4-.91-2.51-1.92H7.72c.12 1.96 1.49 3.33 3.18 3.73V20h2.4v-1.72c1.69-.32 3.01-1.37 3.01-3.08 0-2.39-2.04-3.07-4.04-3.56z"/></svg>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10">
            <div>
              <h3 className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-1">System Net Balance</h3>
              <div className="text-4xl font-bold text-foreground font-mono tracking-tight flex items-baseline gap-2">
                <span className="text-2xl text-primary">৳</span>
                {formatCurrency(totals.netBalance).replace('৳', '')}
              </div>
            </div>

            <div className="w-full sm:w-64">
              <label className="form-label text-xs text-primary">Actual Physical Cash *</label>
              <input 
                type="number" 
                className="form-input w-full h-12 text-lg font-mono focus:ring-2 focus:ring-primary border-primary/50 bg-card/80"
                placeholder="Enter exact cash amount"
                {...form.register('actualPhysicalCash')}
              />
              <ErrorMsg error={errors.actualPhysicalCash} />
            </div>
          </div>
          
          {Number(actualPhysicalCash) > 0 && Math.abs(totals.netBalance - Number(actualPhysicalCash)) > 0 && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-destructive">Discrepancy Detected</span>
                <span className="font-mono font-bold text-destructive">
                  {formatCurrency(Math.abs(totals.netBalance - Number(actualPhysicalCash)))}
                </span>
              </div>
              <input 
                type="text" 
                className="form-input w-full text-sm border-destructive/30 focus:border-destructive bg-card" 
                placeholder="Reason for cash discrepancy... (Required)"
                {...form.register('cashDifferenceNote')}
              />
            </div>
          )}
        </div>

        {/* Submission Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-card p-4 border border-border rounded-lg mt-8 shadow-2xl sticky bottom-4 z-40">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => router.push('/entries')}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary justify-center sm:min-w-[200px]"
            disabled={loading || hasInvalidPayments}
          >
            {loading ? <span className="spinner" /> : 'Close Register'}
          </button>
        </div>
      </form>

      {showChecklistModal && (
        <EODChecklistModal 
          control={control}
          register={form.register}
          setShowChecklistModal={setShowChecklistModal} 
          onSubmitFinal={onSubmitFinal} 
        />
      )}
      </div>
    </div>
  )
}
