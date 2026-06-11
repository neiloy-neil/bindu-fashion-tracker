'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Branch, INCOME_COLUMNS, EXPENSE_COLUMNS } from '@/lib/types'
import { computeTotals, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Save, Paperclip, X, Lock, Copy } from 'lucide-react'

type FieldDetail = {
  note: string;
  files: File[];
}

const THRESHOLDS: Record<string, { note: number, receipt?: number }> = {
  lunch: { note: 500 },
  conveyance: { note: 1000 },
  partyPayment: { note: 5000, receipt: 5000 },
  otherExpense: { note: 2000, receipt: 2000 },
}

function CurrencyInput({ 
  value, 
  onChange, 
  label,
  fieldKey,
  isExpense,
  expenseDetails,
  onDetailsChange
}: { 
  value: string | number; 
  onChange: (val: string) => void;
  label: string;
  fieldKey: string;
  isExpense?: boolean;
  expenseDetails?: Record<string, FieldDetail>;
  onDetailsChange?: (key: string, detail: FieldDetail) => void;
}) {
  const [focused, setFocused] = useState(false)
  const [manualExpand, setManualExpand] = useState(false)

  const displayValue = focused ? String(value || '') : (value ? Number(value).toLocaleString('en-BD') : '')
  const numValue = parseFloat(String(value)) || 0

  const threshold = THRESHOLDS[fieldKey]
  const isHigh = threshold ? numValue > threshold.note : false
  const receiptRequired = threshold?.receipt ? numValue > threshold.receipt : false
  
  const detail = expenseDetails?.[fieldKey] || { note: '', files: [] }
  const hasDetails = detail.note.trim() !== '' || detail.files.length > 0
  const showDetailsPanel = isHigh || hasDetails || manualExpand

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onDetailsChange) {
      const newFiles = Array.from(e.target.files)
      onDetailsChange(fieldKey, { ...detail, files: [...detail.files, ...newFiles] })
    }
  }

  const removeFile = (index: number) => {
    if (onDetailsChange) {
      const newFiles = [...detail.files]
      newFiles.splice(index, 1)
      onDetailsChange(fieldKey, { ...detail, files: newFiles })
    }
  }

  return (
    <div className="form-group group">
      <label className="form-label transition-colors group-hover:text-[#00d2ff]">{label}</label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] transition-colors ${focused ? 'text-[#00d2ff]' : 'text-[#8899aa]'}`}>
          ৳
        </span>
        <input
          type="text"
          className="form-input pl-8 focus:ring-2 focus:ring-[#00d2ff] transition-all"
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9.]/g, '')
            onChange(val)
          }}
          onFocus={(e) => {
            setFocused(true)
            if (value === 0 || value === '0') e.target.select()
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const form = e.currentTarget.closest('form')
              if (form) {
                const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), button:not([disabled])')) as HTMLElement[]
                const index = inputs.indexOf(e.currentTarget)
                if (index > -1 && index < inputs.length - 1) {
                  inputs[index + 1].focus()
                }
              }
            }
          }}
          placeholder="0"
        />
      </div>

      {isExpense && numValue > 0 && (
        <div className="mt-2">
          {showDetailsPanel ? (
            <div className={`p-3 rounded-md text-xs transition-all ${isHigh ? 'bg-[#3b2a18] border border-[#f59e0b]' : 'bg-[#162033] border border-[#1e2d45]'}`}>
              {isHigh && (
                <div className="text-[#f59e0b] font-semibold mb-2 flex items-center gap-1">
                  ⚠️ High Expense Detected
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[#8899aa] mb-1 block">
                    Reason / Note {isHigh ? <span className="text-[#f87171]">*</span> : ''}
                  </label>
                  <textarea
                    className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded p-2 text-[#f0f4ff] focus:outline-none focus:border-[#00d2ff]"
                    rows={2}
                    placeholder="Enter reason..."
                    value={detail.note}
                    onChange={(e) => onDetailsChange?.(fieldKey, { ...detail, note: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[#8899aa] mb-1 block">
                    Receipt Images {receiptRequired ? <span className="text-[#f87171]">*</span> : ''}
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#8899aa] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#10b981] file:text-white hover:file:bg-[#059669] cursor-pointer"
                  />
                  {detail.files.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      {detail.files.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#0a0f1e] p-1.5 rounded border border-[#1e2d45]">
                          <span className="truncate max-w-[150px] text-[#34d399]">{file.name}</span>
                          <button type="button" onClick={() => removeFile(idx)} className="text-[#f87171] hover:text-[#dc2626]">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setManualExpand(true)}
              className="text-xs text-[#8899aa] hover:text-[#00d2ff] flex items-center gap-1 transition-colors"
            >
              <Paperclip size={12} /> Add Note / Receipt
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function NewEntryPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [showIncome, setShowIncome] = useState(true)
  const [showIncomeBank, setShowIncomeBank] = useState(false)
  const [showExpense, setShowExpense] = useState(true)
  const [showExpenseBank, setShowExpenseBank] = useState(false)

  const bankIncomeKeys = ['bkashIncome', 'nagadIncome', 'rocketIncome', 'posPubali', 'posCity', 'posBrac', 'posDbbl', 'acBindu', 'bindu2Transfer', 'receivedAziz1']
  const bankExpenseKeys = ['bankDeposit', 'dmcb', 'bkashExpense', 'nagadExpense', 'posExpense', 'rocketDbbl', 'acBinduExpense', 'aziz2Transfer']

  const regularIncome = INCOME_COLUMNS.filter(c => !bankIncomeKeys.includes(c.key as string))
  const bankIncome = INCOME_COLUMNS.filter(c => bankIncomeKeys.includes(c.key as string))
  
  const regularExpense = EXPENSE_COLUMNS.filter(c => !bankExpenseKeys.includes(c.key as string))
  const bankExpense = EXPENSE_COLUMNS.filter(c => bankExpenseKeys.includes(c.key as string))

  const defaultValues = () =>
    Object.fromEntries(
      [...INCOME_COLUMNS, ...EXPENSE_COLUMNS].map((c) => [c.key, 0])
    )

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<Record<string, string | number>>({
    date: today,
    branchId: '',
    ...defaultValues(),
  })
  
  const [expenseDetails, setExpenseDetails] = useState<Record<string, FieldDetail>>({})
  const [globalNotes, setGlobalNotes] = useState('')
  const [actualPhysicalCash, setActualPhysicalCash] = useState<string>('')
  const [cashDifferenceNote, setCashDifferenceNote] = useState<string>('')
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [eodChecklist, setEodChecklist] = useState({
    safeLocked: false,
    acOff: false,
    shopClean: false,
    shuttersDown: false,
    cashVerified: false,
    signature: ''
  })

  const handleAutoFill = async () => {
    if (!form.branchId) {
      toast.error('Select a branch first')
      return
    }
    try {
      const res = await fetch(`/api/entries/last-balance?branchId=${form.branchId}`)
      const data = await res.json()
      if (data.lastEntry) {
        const routineFields = ['snacksTea', 'dailySomity', 'shopRent', 'waterBill', 'utilities', 'salary', 'stationary', 'electricRecharge', 'phoneBill']
        setForm(prev => {
          const updated = { ...prev }
          for (const f of routineFields) {
            if (data.lastEntry[f] !== undefined && data.lastEntry[f] !== null) {
              updated[f] = data.lastEntry[f]
            }
          }
          return updated
        })
        toast.success("Routine expenses auto-filled!")
      } else {
        toast.error("No previous entry found to copy from.")
      }
    } catch (e) {
      toast.error("Failed to auto-fill.")
    }
  }

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data)
        // Auto-select if there is only 1 branch (Branch Managers)
        if (data.length === 1 && !form.branchId) {
          setForm(prev => ({ ...prev, branchId: String(data[0].id) }))
        }
      })

    const draft = localStorage.getItem('newEntryDraft')
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        setForm(parsed.form || parsed)
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    if (form.branchId) {
      fetch(`/api/entries/last-balance?branchId=${form.branchId}`)
        .then(r => r.json())
        .then(data => {
          if (data.lastNetBalance !== undefined) {
            setForm(prev => ({ ...prev, openingBalance: data.lastNetBalance }))
          }
        })
    }
  }, [form.branchId])

  useEffect(() => {
    // Only save form fields to localstorage, Files can't be saved in JSON easily
    localStorage.setItem('newEntryDraft', JSON.stringify({ form }))
  }, [form])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleDetailsChange = (key: string, detail: FieldDetail) => {
    setExpenseDetails(prev => ({ ...prev, [key]: detail }))
  }

  const numericForm = Object.fromEntries(
    [...INCOME_COLUMNS, ...EXPENSE_COLUMNS].map((c) => [c.key, parseFloat(String(form[c.key])) || 0])
  ) as Record<string, number>
  
  const totals = computeTotals(numericForm)

  const handleAttemptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.branchId) { 
      toast.error('Please select a branch')
      return 
    }
    const diff = Math.abs(totals.netBalance - (parseFloat(actualPhysicalCash) || 0))
    if (actualPhysicalCash !== '' && diff > 0 && !cashDifferenceNote.trim()) {
      toast.error('Please provide a reason for the cash difference.')
      return
    }
    setShowChecklistModal(true)
  }

  const executeSubmit = async () => {
    setShowChecklistModal(false)

    // Validation for high expenses
    for (const [key, t] of Object.entries(THRESHOLDS)) {
      const val = numericForm[key] || 0
      if (val > t.note) {
        const d = expenseDetails[key]
        if (!d || !d.note.trim()) {
          const colLabel = EXPENSE_COLUMNS.find(c => c.key === key)?.label || key
          toast.error(`A reason is required for high ${colLabel} expense.`)
          return
        }
        if (t.receipt && val > t.receipt) {
          if (!d || !d.files || d.files.length === 0) {
            const colLabel = EXPENSE_COLUMNS.find(c => c.key === key)?.label || key
            toast.error(`A receipt image is required for high ${colLabel} expense.`)
            return
          }
        }
      }
    }

    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const uploadedExpenseDetails: Record<string, any> = {}

      for (const [key, detail] of Object.entries(expenseDetails)) {
        if (!detail.note && (!detail.files || detail.files.length === 0)) continue

        let urls: string[] = []
        if (detail.files && detail.files.length > 0) {
          for (const file of detail.files) {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `receipts/${fileName}`
            const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file)
            if (uploadError) throw new Error(`Upload failed for ${key}: ` + uploadError.message)
            const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
            urls.push(data.publicUrl)
          }
        }

        uploadedExpenseDetails[key] = {
          note: detail.note,
          receiptUrls: urls
        }
      }

      const body = {
        date: form.date,
        branchId: form.branchId,
        notes: globalNotes.trim() || null,
        expenseDetails: Object.keys(uploadedExpenseDetails).length > 0 ? uploadedExpenseDetails : null,
        actualPhysicalCash: actualPhysicalCash || null,
        cashDifferenceNote: cashDifferenceNote.trim() || null,
        eodChecklist: eodChecklist,
        ...Object.fromEntries(
          [...INCOME_COLUMNS, ...EXPENSE_COLUMNS].map((c) => [c.key, parseFloat(String(form[c.key])) || 0])
        ),
      }
      
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create entry')
      }
      localStorage.removeItem('newEntryDraft')
      toast.success('Entry saved successfully!')
      router.push('/entries')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">New Entry</h2>
          <p className="page-subtitle">Add a daily branch record</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button
            className="btn btn-primary hidden md:inline-flex"
            type="button"
            onClick={handleAttemptSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                Saving…
              </>
            ) : (
              <>
                <Lock size={16} /> Close Register
              </>
            )}
          </button>
        </div>
      </div>

      <div className="page-body pb-24">
        <form onSubmit={handleAttemptSubmit}>
          {/* Meta */}
          <div className="form-section">
            <div className="form-section-title flex justify-between items-center">
              <span>Record Details</span>
              <button type="button" onClick={handleAutoFill} className="btn btn-secondary btn-sm flex items-center gap-1 text-xs" disabled={!form.branchId}>
                <Copy size={14} /> Auto-Fill Routine
              </button>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input focus:ring-2 focus:ring-[#00d2ff]"
                  value={String(form.date)}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <select
                  className="form-input form-select focus:ring-2 focus:ring-[#00d2ff]"
                  value={String(form.branchId)}
                  onChange={(e) => handleChange('branchId', e.target.value)}
                  disabled={branches.length === 1}
                  required
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Income - Cash/Regular */}
          <div className="form-section">
            <div 
              className="form-section-title income cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowIncome(!showIncome)}
            >
              <div className="flex items-center gap-2">
                {showIncome ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>💚 Income Fields (Cash & Sales)</span>
              </div>
              <span className="font-bold text-[16px] text-[#34d399]">
                Total Sale: ৳{formatCurrency(totals.totalSale)}
              </span>
            </div>
            {showIncome && (
              <div className="form-grid" style={{ alignItems: 'start' }}>
                {regularIncome.map((col) => (
                  <CurrencyInput
                    key={col.key}
                    fieldKey={col.key as string}
                    label={col.label}
                    value={form[col.key] ?? 0}
                    onChange={(val) => handleChange(col.key as string, val)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Income - Bank/Transfer */}
          <div className="form-section">
            <div 
              className="form-section-title income cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowIncomeBank(!showIncomeBank)}
            >
              <div className="flex items-center gap-2">
                {showIncomeBank ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>🏦 Income Fields (Bank & Transfer)</span>
              </div>
            </div>
            {showIncomeBank && (
              <div className="form-grid" style={{ alignItems: 'start' }}>
                {bankIncome.map((col) => (
                  <CurrencyInput
                    key={col.key}
                    fieldKey={col.key as string}
                    label={col.label}
                    value={form[col.key] ?? 0}
                    onChange={(val) => handleChange(col.key as string, val)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Expenses - Regular */}
          <div className="form-section">
            <div 
              className="form-section-title expense cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowExpense(!showExpense)}
            >
              <div className="flex items-center gap-2">
                {showExpense ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>❤️ Expense Fields (Cash & Operating)</span>
              </div>
              <span className="font-bold text-[16px] text-[#f87171]">
                Total Exp: ৳{formatCurrency(totals.totalExpense)}
              </span>
            </div>
            {showExpense && (
              <div className="form-grid" style={{ alignItems: 'start' }}>
                {regularExpense.map((col) => (
                  <CurrencyInput
                    key={col.key}
                    fieldKey={col.key as string}
                    label={col.label}
                    value={form[col.key] ?? 0}
                    onChange={(val) => handleChange(col.key as string, val)}
                    isExpense
                    expenseDetails={expenseDetails}
                    onDetailsChange={handleDetailsChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Expenses - Bank/Transfer */}
          <div className="form-section">
            <div 
              className="form-section-title expense cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowExpenseBank(!showExpenseBank)}
            >
              <div className="flex items-center gap-2">
                {showExpenseBank ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>🏛️ Expense Fields (Bank & Transfer)</span>
              </div>
            </div>
            {showExpenseBank && (
              <div className="form-grid" style={{ alignItems: 'start' }}>
                {bankExpense.map((col) => (
                  <CurrencyInput
                    key={col.key}
                    fieldKey={col.key as string}
                    label={col.label}
                    value={form[col.key] ?? 0}
                    onChange={(val) => handleChange(col.key as string, val)}
                    isExpense
                    expenseDetails={expenseDetails}
                    onDetailsChange={handleDetailsChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* EOD Cash Count */}
          <div className="form-section border-t-[3px] border-[#3b82f6]">
            <div className="form-section-title text-[#3b82f6]">💵 EOD Cash Count</div>
            <div className="p-4 bg-[#0a0f18] border border-[#1e2d45] rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                <div>
                  <div className="text-sm text-[#8899aa]">Theoretical Net Balance</div>
                  <div className="text-xl font-bold text-[#34d399]">৳{formatCurrency(totals.netBalance)}</div>
                </div>
                <div className="flex-1 max-w-[250px]">
                  <label className="text-sm text-[#8899aa] mb-1 block">Actual Physical Cash</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]">৳</span>
                    <input 
                      type="number" 
                      className="form-input pl-8 focus:ring-2 focus:ring-[#3b82f6]"
                      value={actualPhysicalCash}
                      onChange={e => setActualPhysicalCash(e.target.value)}
                      placeholder="Enter counted cash..."
                    />
                  </div>
                </div>
              </div>
              {actualPhysicalCash !== '' && Math.abs(totals.netBalance - parseFloat(actualPhysicalCash)) > 0 && (
                <div className="mt-3 p-3 bg-[#3b2a18] border border-[#f59e0b] rounded-lg">
                  <div className="text-[#f59e0b] font-semibold text-sm mb-2 flex items-center gap-1">
                    ⚠️ Mismatch of ৳{formatCurrency(Math.abs(totals.netBalance - parseFloat(actualPhysicalCash)))}. Please explain:
                  </div>
                  <textarea 
                    className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded p-2 text-[#f0f4ff] focus:outline-none focus:border-[#f59e0b] text-sm"
                    rows={2}
                    required
                    value={cashDifferenceNote}
                    onChange={e => setCashDifferenceNote(e.target.value)}
                    placeholder="E.g., Shortage due to change missing, or forgot to log an expense..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Global Notes */}
          <div className="form-section">
            <div className="form-section-title">
              <div className="flex items-center gap-2">
                <span>📎 General Notes</span>
              </div>
            </div>
            <div className="form-group">
              <textarea 
                className="form-input focus:ring-2 focus:ring-[#00d2ff]" 
                rows={3} 
                value={globalNotes}
                onChange={e => setGlobalNotes(e.target.value)}
                placeholder="Any general remarks for this daily entry..."
              />
            </div>
          </div>

          {/* Spacer to prevent sticky bar overlap */}
          <div style={{ height: '100px' }}></div>
        </form>
      </div>

      {/* Mobile Sticky Summary Bar */}
      <div 
        className="fixed bottom-0 right-0 bg-[#0a0f18] border-t border-[#1e2d45] z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] mobile-sticky-bar"
      >
        <div className="flex gap-4 sm:gap-8 items-center w-full sm:w-auto justify-around sm:justify-start">
          <div className="text-center sm:text-left">
            <div className="text-[10px] sm:text-xs text-[#8899aa] uppercase tracking-wider mb-1">Total Sale</div>
            <div className="text-[#34d399] font-bold text-sm sm:text-base">৳{formatCurrency(totals.totalSale)}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[10px] sm:text-xs text-[#8899aa] uppercase tracking-wider mb-1">Total Exp</div>
            <div className="text-[#f87171] font-bold text-sm sm:text-base">৳{formatCurrency(totals.totalExpense)}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[10px] sm:text-xs text-[#8899aa] uppercase tracking-wider mb-1">Net Balance</div>
            <div className={`font-bold text-sm sm:text-base ${totals.netBalance >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              ৳{formatCurrency(Math.abs(totals.netBalance))}
            </div>
          </div>
        </div>
        
          <button
            type="button"
            className="btn btn-primary mt-3 sm:mt-0 w-full sm:w-auto py-3 sm:py-2 flex items-center justify-center gap-2"
            onClick={handleAttemptSubmit}
          disabled={loading}
          style={{ minWidth: 140 }}
        >
          {loading ? 'Saving…' : <><Lock size={16} /> Close Register</>}
        </button>
      </div>

      {/* EOD Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#162033] border border-[#1e2d45] rounded-xl max-w-md w-full p-6 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="text-[#3b82f6]" /> EOD Checklist
            </h3>
            <p className="text-[#8899aa] mb-4 text-sm">
              Before closing the register, you must verify the following standard operating procedures:
            </p>
            
            <div className="flex flex-col gap-3 mb-6">
              {[
                { key: 'safeLocked', label: 'Safe is locked and secured' },
                { key: 'acOff', label: 'All ACs and lights are turned off' },
                { key: 'shopClean', label: 'Floor is swept and shop is clean' },
                { key: 'shuttersDown', label: 'Main shutters are down and locked' },
                { key: 'cashVerified', label: 'Cash count has been double-verified' },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-[#1e2d45] bg-[#0a0f18] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-[#162033]"
                    checked={(eodChecklist as any)[item.key]}
                    onChange={(e) => setEodChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  <span className={`text-sm ${ (eodChecklist as any)[item.key] ? 'text-white' : 'text-[#8899aa] group-hover:text-[#cbd5e1]' }`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-[#8899aa] text-sm mb-1 block">Digital Signature (Type your full name)</label>
              <input 
                type="text" 
                className="w-full bg-[#0a0f18] border border-[#1e2d45] rounded p-2 text-white focus:outline-none focus:border-[#3b82f6]"
                value={eodChecklist.signature}
                onChange={(e) => setEodChecklist(prev => ({ ...prev, signature: e.target.value }))}
                placeholder="Manager's Name..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setShowChecklistModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={executeSubmit}
                disabled={
                  !eodChecklist.safeLocked || !eodChecklist.acOff || !eodChecklist.shopClean || 
                  !eodChecklist.shuttersDown || !eodChecklist.cashVerified || eodChecklist.signature.trim().length < 3
                }
              >
                Sign & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
