'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod' // wait, the original used '@hookform/resolvers/zod'
import { NewEntryFormValues, newEntryFormSchema } from '@/lib/schemas'
import { Account, Branch, Category, Employee, Party } from '@/lib/types'
import { computeTotals, formatCurrency } from '@/lib/utils'
import { dhakaDateString, NewEntryPayload } from '@/lib/new-entry'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Save, CheckCircle } from 'lucide-react'
import { toPng } from 'html-to-image'

import { IncomeSection } from './IncomeSection'
import { ExpenseSection } from './ExpenseSection'
import { TransferSection } from './TransferSection'
import { PaymentSection } from './PaymentSection'
import { AdvanceSalarySection } from './AdvanceSalarySection'
import { EODChecklistModal } from './EODChecklistModal'
import DailyReportTemplate from '@/components/reports/DailyReportTemplate'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const generateId = () => Math.random().toString(36).substring(2, 9)

function ErrorMsg({ error }: { error?: { message?: string } }) {
  if (!error?.message) return null
  return <span className="text-xs text-destructive mt-1 block" role="alert" aria-live="polite">{error.message}</span>
}

interface Props {
  initialData: {
    branches: Branch[]
    allBranches?: Branch[]
    categories: Category[]
    accounts: Account[]
    parties: Party[]
    expenseCategories: Category[]
    employees: Employee[]
  }
  userId: string
}

export function NewEntryForm({ initialData, userId }: Props) {
  const router = useRouter()
  const { branches, allBranches, categories, accounts, parties, expenseCategories, employees } = initialData
  
  const [loading, setLoading] = useState(false)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [pendingReportData, setPendingReportData] = useState<any>(null)
  const reportRef = useRef<HTMLDivElement>(null)

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
  
  const incomeItemsWatch = useWatch({ control, name: 'incomeItems' })
  const expenseEntriesWatch = useWatch({ control, name: 'expenseEntries' })
  const transfersWatch = useWatch({ control, name: 'transfers' })
  const paymentsWatch = useWatch({ control, name: 'payments' })
  const advanceSalariesWatch = useWatch({ control, name: 'advanceSalaries' })
  
  const hasInvalidPayments = paymentsWatch?.some(p => (p.method === 'BANK' || p.method === 'CHEQUE') && !p.attachmentKey)

  const totals = useMemo(() => {
    const fakeEntry = {
      items: (incomeItemsWatch || []).map(item => ({ amount: Number(item.amount), category: categories.find(c => String(c.id) === String(item.categoryId)) || null })),
      transfers: (transfersWatch || []).map(t => ({ amount: Number(t.amount) })),
      payments: (paymentsWatch || []).map(p => ({ amount: Number(p.amount), method: p.method })),
      expenseEntries: (expenseEntriesWatch || []).map(e => ({ amount: Number(e.amount) })),
      advanceSalaries: (advanceSalariesWatch || []).map(a => ({ amount: Number(a.amount), type: a.type }))
    }
    return computeTotals(fakeEntry)
  }, [incomeItemsWatch, expenseEntriesWatch, transfersWatch, paymentsWatch, advanceSalariesWatch, categories])

  const selectedBranchObj = useMemo(() => branches.find(b => String(b.id) === branchId), [branches, branchId])
  const isFactory = selectedBranchObj?.type === 'FACTORY'
  const isHeadOffice = selectedBranchObj?.type === 'HEAD_OFFICE'
  const hideIncome = isFactory || isHeadOffice

  const branchType = selectedBranchObj?.type ?? ''
  const filterByBranchType = <T extends { applicableTo?: string[] }>(cats: T[]): T[] =>
    cats.filter(c => !c.applicableTo?.length || c.applicableTo.includes(branchType))

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const subscription = form.watch((value) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify(value))
        setLastSavedAt(new Date())
      }, 1000)
    })
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [form.watch, draftKey])

  // When report data is ready, capture PNG then navigate away
  useEffect(() => {
    if (!pendingReportData || !reportRef.current) return
    const el = reportRef.current
    const run = async () => {
      try {
        // Wait for logo and any other images to load before capturing
        await Promise.all(Array.from(el.querySelectorAll('img')).map(img =>
          img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
        ))
        await new Promise(r => setTimeout(r, 400))
        const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' })
        const link = document.createElement('a')
        const branchName = branches.find(b => String(b.id) === String(pendingReportData.branch?.id))?.name
          || pendingReportData.branch?.name || 'Branch'
        link.download = `DailyReport_${branchName.replace(/\s+/g, '_')}_${pendingReportData.date}.png`
        link.href = dataUrl
        link.click()
      } catch (err) {
        console.error('PNG export failed', err)
        toast.error('Report PNG export failed — you can download it from the Daily Report page.')
      } finally {
        router.push('/entries')
      }
    }
    void run()
  }, [pendingReportData])

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
    if (branchId && date && categories.length > 0 && !hideIncome) {
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
  }, [branchId, date, categories, setValue, form, branches.length, hideIncome])

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

      // Fetch report data then render → PNG download (handled by useEffect watching pendingReportData)
      try {
        const reportRes = await fetch(`/api/reports/daily?branchId=${payload.branchId}&date=${payload.date}`)
        if (!reportRes.ok) throw new Error('Failed to fetch report')
        const reportData = await reportRes.json()
        toast.success('Register closed — preparing PNG report…', { id: uploadToast })
        setPendingReportData(reportData)
      } catch {
        toast.error('Saved successfully. Report PNG failed — download it from the Daily Report page.', { id: uploadToast, duration: 8000 })
        router.push('/entries')
      }

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving entry', { id: uploadToast })
      setLoading(false)
    }
  }

  const onSubmit = async () => {
    setShowChecklistModal(true)
  }

  // Common UI classes
  const inputClass = "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
  const selectClass = "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            📝 {isFactory ? 'Factory Daily Entry' : 'Daily Entry'}
            {isFactory && <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-medium ml-2">FACTORY</span>}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Submit the end-of-day financial report for {isFactory ? 'your factory.' : 'your branch.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastSavedAt ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 px-2.5 py-1 rounded-full">
              <CheckCircle size={12} />
              Draft saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Auto-saves as you type</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              localStorage.setItem(draftKey, JSON.stringify(form.getValues()))
              setLastSavedAt(new Date())
              toast.success('Draft saved')
            }}
          >
            <Save size={13} /> Save Draft
          </Button>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">
        <div className="max-w-5xl mx-auto w-full pb-32">

      <form onSubmit={handleSubmit(onSubmit, (errs) => {
        const messages = Object.values(errs).flatMap(e => {
          if (!e) return []
          if (typeof e.message === 'string') return [e.message]
          // nested arrays (incomeItems, expenseEntries, etc.)
          if (Array.isArray(e)) {
            return (e as any[]).flatMap(item =>
              item ? Object.values(item).map((f: any) => f?.message).filter(Boolean) : []
            )
          }
          return Object.values(e as Record<string, any>).map((f: any) => f?.message).filter(Boolean)
        })
        const first = messages[0]
        toast.error(first ? `Validation error: ${first}` : 'Please fix the highlighted fields before closing the register.')
      })} className="space-y-6">
        
        {/* Branch & Meta Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Date</Label>
              <Input type="date" className="h-10 w-full text-sm" {...form.register('formMeta.date')} />
              <ErrorMsg error={errors.formMeta?.date} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Controller
                control={control}
                name="formMeta.branchId"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full text-sm">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorMsg error={errors.formMeta?.branchId} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Opening Time</Label>
              <Input type="time" className="h-10 w-full text-sm" {...form.register('formMeta.openingTime')} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Closing Time</Label>
              <Input type="time" className="h-10 w-full text-sm" {...form.register('formMeta.closingTime')} />
            </div>
          </div>
        </div>

        {/* Income Section — hidden for factory and head office (income comes via transfers) */}
        {!hideIncome && (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <button type="button" aria-expanded={showIncome}
              className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] p-4 text-left"
              onClick={() => setShowIncome(!showIncome)}
            >
              <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
                💰 Income & Collections
                <span className="text-xs bg-[var(--success)]/20 text-[var(--success)] px-2 py-0.5 rounded ml-2 font-mono">
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
                  categories={filterByBranchType(categories)}
                  inputClass={inputClass}
                  selectClass={selectClass}
                  errors={errors}
                  generateId={generateId}
                />
              </div>
            )}
          </div>
        )}

        {/* Info banner for factory/HO explaining where their income comes from */}
        {hideIncome && (
          <div className="p-4 rounded-xl border border-[var(--info)]/30 bg-[var(--info-subtle)] text-sm text-[var(--info)]">
            {isHeadOffice
              ? '🏢 Head Office income is received from branch transfers. Use the Incoming Transfers section to acknowledge funds from branches.'
              : '🏭 Factory funds are received from Head Office via transfers. Use the Incoming Transfers section to acknowledge funds.'}
          </div>
        )}

        {/* Unified Expenses Section */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <button type="button" aria-expanded={showExpense}
            className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] p-4 text-left"
            onClick={() => setShowExpense(!showExpense)}
          >
            <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
              💸 {isFactory ? 'Factory Expenses' : isHeadOffice ? 'Head Office Expenses' : 'Expenses & Dispersals'}
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded ml-2 font-mono">
                {formatCurrency(totals.totalExpense)}
              </span>
            </h2>
            {showExpense ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </button>

          {showExpense && (
            <div className="p-4 sm:p-5 space-y-8">
              <ExpenseSection control={control} register={form.register} setValue={setValue} expenseCategories={filterByBranchType(expenseCategories)} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
              {/* HO can send transfers to factory; factory cannot send transfers out */}
              {!isFactory && <TransferSection control={control} register={form.register} accounts={accounts} branches={allBranches || branches} currentBranchId={branchId} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />}
              <AdvanceSalarySection control={control} register={form.register} employees={employees} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />
              {!hideIncome && <PaymentSection control={control} register={form.register} setValue={setValue} parties={parties} inputClass={inputClass} selectClass={selectClass} errors={errors} generateId={generateId} />}
            </div>
          )}
        </div>

        {/* Net Balance & Physical Cash */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-xl">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0 overflow-hidden">
            <img src="/bindu-logo.webp" alt="" className="w-64 h-64 object-contain translate-x-1/4" />
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
              <Label htmlFor="actualPhysicalCash" className="mb-1.5 block text-xs font-medium text-[var(--accent)]">Actual Physical Cash *</Label>
              <Input 
                id="actualPhysicalCash"
                type="number" 
                className="h-12 w-full border-[var(--accent)]/50 bg-[var(--surface)]/80 text-lg font-mono text-[var(--text-primary)]"
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
              <Input 
                type="text" 
                className="h-9 w-full border-destructive/30 text-sm" 
                placeholder="Reason for cash discrepancy... (Required)"
                {...form.register('cashDifferenceNote')}
              />
            </div>
          )}
        </div>

        {/* Submission Actions */}
        <div className="sticky bottom-4 z-40 mt-8 flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl sm:flex-row sm:items-center">
          <Button 
            variant="outline"
            type="button" 
            onClick={() => router.push('/entries')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="w-full sm:w-auto py-6 px-8 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold shadow-lg shadow-[var(--accent-glow)] text-lg"
            disabled={loading || hasInvalidPayments}
          >
            {loading ? <BrandSpinner size={16} /> : 'Close Register'}
          </Button>
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

      {/* Report capture: overlay hides it from user, report renders in viewport for html-to-image */}
      {pendingReportData && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>Generating report…</span>
          </div>
          <div
            ref={reportRef}
            className="light"
            style={{ position: 'fixed', left: 0, top: 0, width: '960px', zIndex: 9998, background: '#ffffff', pointerEvents: 'none' }}
          >
            <DailyReportTemplate entryData={pendingReportData} />
          </div>
        </>
      )}
    </>
  )
}
