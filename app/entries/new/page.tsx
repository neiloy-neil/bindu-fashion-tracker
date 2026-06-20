'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Branch, Category } from '@/lib/types'
import { computeTotals, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Paperclip, X, Lock, Plus } from 'lucide-react'

type FieldDetail = {
  note: string;
  files: File[];
}

type EntryItemInput = {
  id: string;
  categoryId: number | '';
  amount: string | number;
  detail: FieldDetail;
}

type TransferInput = { id: string; accountId: string; amount: string; note: string }
type PaymentInput = { id: string; partyId: string; method: string; amount: string; note: string; issueDate: string; withdrawDate: string }
type ExpenseEntryInput = { id: string; categoryId: string; amount: string; note: string }
type AdvanceSalaryInput = { id: string; employeeId: string; type: string; amount: string; productDescription: string; note: string }

const generateId = () => Math.random().toString(36).substring(2, 9)

function DynamicItemRow({
  item,
  categories,
  onChange,
  onRemove,
  isExpense
}: {
  item: EntryItemInput;
  categories: Category[];
  onChange: (updated: EntryItemInput) => void;
  onRemove: () => void;
  isExpense?: boolean;
}) {
  const [focused, setFocused] = useState(false)
  const [manualExpand, setManualExpand] = useState(false)

  const displayValue = focused ? String(item.amount || '') : (item.amount ? Number(item.amount).toLocaleString('en-BD') : '')
  const numValue = parseFloat(String(item.amount)) || 0

  const hasDetails = item.detail.note.trim() !== '' || item.detail.files.length > 0
  const showDetailsPanel = hasDetails || manualExpand

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      onChange({ ...item, detail: { ...item.detail, files: [...item.detail.files, ...newFiles] } })
    }
  }

  const removeFile = (index: number) => {
    const newFiles = [...item.detail.files]
    newFiles.splice(index, 1)
    onChange({ ...item, detail: { ...item.detail, files: newFiles } })
  }

  return (
    <div className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-4 mb-3 relative group">
      <button 
        type="button" 
        onClick={onRemove}
        className="absolute -right-2 -top-2 bg-[#ef4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] shadow-lg"
      >
        <X size={14} />
      </button>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="form-label text-xs">Category</label>
          <select 
            className="form-input form-select text-sm h-10"
            value={item.categoryId}
            onChange={(e) => onChange({ ...item, categoryId: e.target.value ? Number(e.target.value) : '' })}
          >
            <option value="">Select...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <label className="form-label text-xs">Amount</label>
          <div className="relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] transition-colors ${focused ? 'text-[#00d2ff]' : 'text-[#8899aa]'}`}>
              ৳
            </span>
            <input
              type="text"
              className="form-input pl-8 h-10 focus:ring-2 focus:ring-[#00d2ff] transition-all"
              value={displayValue}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '')
                onChange({ ...item, amount: val })
              }}
              onFocus={(e) => {
                setFocused(true)
                if (item.amount === 0 || item.amount === '0') e.target.select()
              }}
              onBlur={() => setFocused(false)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {isExpense && numValue > 0 && (
        <div className="mt-3">
          {showDetailsPanel ? (
            <div className={`p-3 rounded-md text-xs transition-all bg-[#162033] border border-[#1e2d45]`}>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[#8899aa] mb-1 block">Reason / Note</label>
                  <textarea
                    className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded p-2 text-[#f0f4ff] focus:outline-none focus:border-[#00d2ff]"
                    rows={2}
                    placeholder="Enter reason..."
                    value={item.detail.note}
                    onChange={(e) => onChange({ ...item, detail: { ...item.detail, note: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-[#8899aa] mb-1 block">Receipt Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#8899aa] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#10b981] file:text-white hover:file:bg-[#059669] cursor-pointer"
                  />
                  {item.detail.files.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      {item.detail.files.map((file, idx) => (
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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const [formMeta, setFormMeta] = useState<{ date: string; branchId: string; openingTime: string; closingTime: string }>({
    date: today,
    branchId: '',
    openingTime: '09:00',
    closingTime: '21:00'
  })
  
  const [incomeItems, setIncomeItems] = useState<EntryItemInput[]>([])
  
  const [transfers, setTransfers] = useState<TransferInput[]>([])
  const [payments, setPayments] = useState<PaymentInput[]>([])
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntryInput[]>([])
  const [advanceSalaries, setAdvanceSalaries] = useState<AdvanceSalaryInput[]>([])

  const [accounts, setAccounts] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

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

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data)
        if (data.length === 1 && !formMeta.branchId) {
          setFormMeta(prev => ({ ...prev, branchId: String(data[0].id) }))
        }
      })

    fetch('/api/categories?active=true')
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data)

        const draft = localStorage.getItem('newEntryDraft')
        if (draft) {
          try {
            const parsed = JSON.parse(draft)
            if (parsed.formMeta) setFormMeta(parsed.formMeta)
            if (parsed.incomeItems) setIncomeItems(parsed.incomeItems)
            if (parsed.transfers) setTransfers(parsed.transfers)
            if (parsed.payments) setPayments(parsed.payments)
            if (parsed.expenseEntries) setExpenseEntries(parsed.expenseEntries)
            if (parsed.advanceSalaries) setAdvanceSalaries(parsed.advanceSalaries)
          } catch (e) {}
        }
      })

    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/parties').then(r => r.json()),
      fetch('/api/expense-categories').then(r => r.json()),
      fetch('/api/employees').then(r => r.json())
    ]).then(([accData, partyData, expCatData, empData]) => {
      setAccounts(accData.accounts || accData)
      setParties(partyData.parties || partyData)
      setExpenseCategories(expCatData.categories || expCatData)
      setEmployees(empData.employees || empData)
    })
  }, [])

  useEffect(() => {
    if (formMeta.branchId && categories.length > 0) {
      fetch(`/api/entries/last-balance?branchId=${formMeta.branchId}`)
        .then(r => r.json())
        .then(data => {
          if (data.lastNetBalance !== undefined) {
            const openingCat = categories.find(c => c.name === 'Opening Balance')
            if (openingCat) {
              setIncomeItems(prev => {
                const exists = prev.some(item => item.categoryId === openingCat.id)
                if (!exists) {
                  return [{ id: generateId(), categoryId: openingCat.id, amount: data.lastNetBalance, detail: { note: '', files: [] } }, ...prev]
                }
                return prev
              })
            }
          }
        })
    }
  }, [formMeta.branchId, categories])

  useEffect(() => {
    localStorage.setItem('newEntryDraft', JSON.stringify({ formMeta, incomeItems, transfers, payments, expenseEntries, advanceSalaries }))
  }, [formMeta, incomeItems, transfers, payments, expenseEntries, advanceSalaries])

  const handleMetaChange = (field: string, value: string) => {
    setFormMeta((prev) => ({ ...prev, [field]: value }))
  }

  const addIncomeItem = () => setIncomeItems(prev => [...prev, { id: generateId(), categoryId: '', amount: '', detail: { note: '', files: [] } }])
  const updateIncomeItem = (id: string, updated: EntryItemInput) => setIncomeItems(prev => prev.map(item => item.id === id ? updated : item))
  const removeIncomeItem = (id: string) => setIncomeItems(prev => prev.filter(item => item.id !== id))

  const addTransfer = () => setTransfers(prev => [...prev, { id: generateId(), accountId: '', amount: '', note: '' }])
  const updateTransfer = (id: string, field: string, value: string) => setTransfers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  const removeTransfer = (id: string) => setTransfers(prev => prev.filter(t => t.id !== id))

  const addPayment = () => setPayments(prev => [...prev, { id: generateId(), partyId: '', method: 'CASH', amount: '', note: '', issueDate: today, withdrawDate: today }])
  const updatePayment = (id: string, field: string, value: string) => setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  const removePayment = (id: string) => setPayments(prev => prev.filter(p => p.id !== id))

  const addExpenseEntry = () => setExpenseEntries(prev => [...prev, { id: generateId(), categoryId: '', amount: '', note: '' }])
  const updateExpenseEntry = (id: string, field: string, value: string) => setExpenseEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  const removeExpenseEntry = (id: string) => setExpenseEntries(prev => prev.filter(e => e.id !== id))

  const addAdvanceSalary = () => setAdvanceSalaries(prev => [...prev, { id: generateId(), employeeId: '', type: 'CASH', amount: '', productDescription: '', note: '' }])
  const updateAdvanceSalary = (id: string, field: string, value: string) => setAdvanceSalaries(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  const removeAdvanceSalary = (id: string) => setAdvanceSalaries(prev => prev.filter(a => a.id !== id))

  const dummyEntry = {
    items: [...incomeItems].map(item => {
      const category = categories.find(c => c.id === item.categoryId)
      return { category, amount: parseFloat(String(item.amount)) || 0 }
    })
  }
  
  const baseTotals = computeTotals(dummyEntry)
  
  const newLinesExpense = 
    transfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) +
    payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) +
    expenseEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) +
    advanceSalaries.reduce((sum, a) => sum + (a.type === 'CASH' ? (parseFloat(a.amount) || 0) : 0), 0)
    
  const totals = {
    totalSale: baseTotals.totalSale,
    totalExpense: baseTotals.totalExpense + newLinesExpense,
    netBalance: baseTotals.totalSale - (baseTotals.totalExpense + newLinesExpense)
  }

  const handleAttemptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formMeta.branchId) { 
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
    setLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      const finalItems = []

      for (const item of [...incomeItems]) {
        const amount = parseFloat(String(item.amount)) || 0
        if (item.categoryId && amount > 0) {
          const detail = item.detail
          let urls: string[] = []

          if (detail && detail.files && detail.files.length > 0) {
            for (const file of detail.files) {
              const fileExt = file.name.split('.').pop()
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
              const filePath = `receipts/${fileName}`
              const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file)
              if (uploadError) throw new Error(`Upload failed: ` + uploadError.message)
              const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
              urls.push(data.publicUrl)
            }
          }

          finalItems.push({
            categoryId: item.categoryId,
            amount,
            receiptUrls: urls,
            note: detail?.note || undefined
          })
        }
      }

      // Consolidate item notes to global notes
      let consolidatedNotes = globalNotes.trim()
      for (const item of [...incomeItems]) {
        if (item.detail.note.trim() && item.categoryId) {
          const catName = categories.find(c => c.id === item.categoryId)?.name || 'Item'
          consolidatedNotes += `\n[${catName} Note]: ${item.detail.note}`
        }
      }

      const body = {
        date: formMeta.date,
        branchId: formMeta.branchId,
        openingTime: formMeta.openingTime,
        closingTime: formMeta.closingTime,
        notes: consolidatedNotes || null,
        actualPhysicalCash: actualPhysicalCash || null,
        cashDifferenceNote: cashDifferenceNote.trim() || null,
        eodChecklist: eodChecklist,
        items: finalItems
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
      
      const createdEntry = await res.json()
      const entryId = createdEntry.id
      
      const reqs: Promise<any>[] = []
      transfers.forEach(t => {
        if (t.accountId && t.amount) reqs.push(fetch('/api/transfers', { headers: {'Content-Type': 'application/json'}, method: 'POST', body: JSON.stringify({ ...t, dailyEntryId: entryId }) }))
      })
      payments.forEach(p => {
        if (p.partyId && p.amount) reqs.push(fetch('/api/payments', { headers: {'Content-Type': 'application/json'}, method: 'POST', body: JSON.stringify({ ...p, dailyEntryId: entryId }) }))
      })
      expenseEntries.forEach(e => {
        if (e.categoryId && e.amount) reqs.push(fetch('/api/expense-entries', { headers: {'Content-Type': 'application/json'}, method: 'POST', body: JSON.stringify({ ...e, dailyEntryId: entryId }) }))
      })
      advanceSalaries.forEach(a => {
        if (a.employeeId && (a.type === 'CASH' ? a.amount : a.productDescription)) reqs.push(fetch('/api/advance-salaries', { headers: {'Content-Type': 'application/json'}, method: 'POST', body: JSON.stringify({ ...a, dailyEntryId: entryId }) }))
      })

      if (reqs.length > 0) {
        const results = await Promise.allSettled(reqs)
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
        if (failures.length > 0) {
          toast.error(`Entry created, but ${failures.length} line item(s) failed to save.`)
        } else {
          toast.success('Entry and all line items saved successfully!')
        }
      } else {
        toast.success('Entry saved successfully!')
      }
      
      localStorage.removeItem('newEntryDraft')
      router.push('/entries')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'INCOME')

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
            {loading ? 'Saving…' : <><Lock size={16} /> Close Register</>}
          </button>
        </div>
      </div>

      <div className="page-body pb-24">
        <form onSubmit={handleAttemptSubmit}>
          {/* Meta */}
          <div className="form-section">
            <div className="form-section-title">Record Details</div>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input focus:ring-2 focus:ring-[#00d2ff]"
                  value={formMeta.date}
                  onChange={(e) => handleMetaChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <select
                  className="form-input form-select focus:ring-2 focus:ring-[#00d2ff]"
                  value={formMeta.branchId}
                  onChange={(e) => handleMetaChange('branchId', e.target.value)}
                  disabled={branches.length === 1}
                  required
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Opening Time</label>
                <input
                  type="time"
                  className="form-input focus:ring-2 focus:ring-[#00d2ff]"
                  value={formMeta.openingTime}
                  onChange={(e) => handleMetaChange('openingTime', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Closing Time</label>
                <input
                  type="time"
                  className="form-input focus:ring-2 focus:ring-[#00d2ff]"
                  value={formMeta.closingTime}
                  onChange={(e) => handleMetaChange('closingTime', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Income */}
          <div className="form-section">
            <div 
              className="form-section-title income cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowIncome(!showIncome)}
            >
              <div className="flex items-center gap-2">
                {showIncome ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>💚 Income</span>
              </div>
              <span className="font-bold text-[16px] text-[#34d399]">
                Total Sale: ৳{formatCurrency(totals.totalSale)}
              </span>
            </div>
            {showIncome && (
              <div className="mt-4">
                {incomeItems.map((item) => (
                  <DynamicItemRow
                    key={item.id}
                    item={item}
                    categories={incomeCategories}
                    onChange={(updated) => updateIncomeItem(item.id, updated)}
                    onRemove={() => removeIncomeItem(item.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addIncomeItem}
                  className="w-full py-3 border-2 border-dashed border-[#1e2d45] rounded-lg text-[#8899aa] hover:text-[#34d399] hover:border-[#34d399] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Income
                </button>
              </div>
            )}
          </div>

          {/* Line Item Expenses */}
          <div className="form-section">
            <div 
              className="form-section-title expense cursor-pointer hover:opacity-80 flex items-center justify-between"
              onClick={() => setShowExpense(!showExpense)}
            >
              <div className="flex items-center gap-2">
                {showExpense ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span>❤️ Expenses & Outflow</span>
              </div>
              <span className="font-bold text-[16px] text-[#f87171]">
                Total Exp: ৳{formatCurrency(totals.totalExpense)}
              </span>
            </div>
            
            {showExpense && (
              <div className="mt-4 flex flex-col gap-6">
                
                {/* TRANSFERS */}
                <div>
                  <h4 className="text-sm font-semibold text-[#8899aa] mb-2 uppercase tracking-wide">Transfers</h4>
                  {transfers.map((t) => (
                    <div key={t.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-3 mb-2 flex gap-3 items-start relative group">
                      <button type="button" onClick={() => removeTransfer(t.id)} className="absolute -right-2 -top-2 bg-[#ef4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] shadow-lg z-10"><X size={14} /></button>
                      <select className="form-input text-sm h-10 flex-1" value={t.accountId} onChange={e => updateTransfer(t.id, 'accountId', e.target.value)}>
                        <option value="">Select Account...</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                      </select>
                      <input type="number" className="form-input text-sm h-10 flex-1" placeholder="Amount" value={t.amount} onChange={e => updateTransfer(t.id, 'amount', e.target.value)} />
                      <input type="text" className="form-input text-sm h-10 flex-1" placeholder="Note" value={t.note} onChange={e => updateTransfer(t.id, 'note', e.target.value)} />
                    </div>
                  ))}
                  <button type="button" onClick={addTransfer} className="w-full py-2 border border-dashed border-[#1e2d45] rounded-lg text-xs text-[#8899aa] hover:text-[#f87171] hover:border-[#f87171] transition-colors flex items-center justify-center gap-1"><Plus size={14} /> Add Transfer</button>
                </div>

                {/* PAYMENTS */}
                <div>
                  <h4 className="text-sm font-semibold text-[#8899aa] mb-2 uppercase tracking-wide">Party Payments</h4>
                  {payments.map((p) => (
                    <div key={p.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-3 mb-2 relative group">
                      <button type="button" onClick={() => removePayment(p.id)} className="absolute -right-2 -top-2 bg-[#ef4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] shadow-lg z-10"><X size={14} /></button>
                      <div className="flex gap-3 items-start mb-2">
                        <select className="form-input text-sm h-10 flex-[2]" value={p.partyId} onChange={e => updatePayment(p.id, 'partyId', e.target.value)}>
                          <option value="">Select Party...</option>
                          {parties.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                        <select className="form-input text-sm h-10 flex-1" value={p.method} onChange={e => updatePayment(p.id, 'method', e.target.value)}>
                          <option value="CASH">CASH</option>
                          <option value="BANK">BANK</option>
                          <option value="CHEQUE">CHEQUE</option>
                        </select>
                        <input type="number" className="form-input text-sm h-10 flex-1" placeholder="Amount" value={p.amount} onChange={e => updatePayment(p.id, 'amount', e.target.value)} />
                      </div>
                      <div className="flex gap-3 items-start">
                        <input type="text" className="form-input text-sm h-10 flex-1" placeholder="Note" value={p.note} onChange={e => updatePayment(p.id, 'note', e.target.value)} />
                        {p.method === 'CHEQUE' && (
                          <>
                            <div className="flex-1"><label className="text-[10px] text-gray-400">Issue Date</label><input type="date" className="form-input text-sm h-8" value={p.issueDate} onChange={e => updatePayment(p.id, 'issueDate', e.target.value)} /></div>
                            <div className="flex-1"><label className="text-[10px] text-gray-400">Withdraw Date</label><input type="date" className="form-input text-sm h-8" value={p.withdrawDate} onChange={e => updatePayment(p.id, 'withdrawDate', e.target.value)} /></div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addPayment} className="w-full py-2 border border-dashed border-[#1e2d45] rounded-lg text-xs text-[#8899aa] hover:text-[#f87171] hover:border-[#f87171] transition-colors flex items-center justify-center gap-1"><Plus size={14} /> Add Payment</button>
                </div>

                {/* EXPENSES */}
                <div>
                  <h4 className="text-sm font-semibold text-[#8899aa] mb-2 uppercase tracking-wide">Expenses</h4>
                  {expenseEntries.map((e) => (
                    <div key={e.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-3 mb-2 flex gap-3 items-start relative group">
                      <button type="button" onClick={() => removeExpenseEntry(e.id)} className="absolute -right-2 -top-2 bg-[#ef4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] shadow-lg z-10"><X size={14} /></button>
                      <select className="form-input text-sm h-10 flex-1" value={e.categoryId} onChange={evt => updateExpenseEntry(e.id, 'categoryId', evt.target.value)}>
                        <option value="">Select Category...</option>
                        {expenseCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.period})</option>)}
                      </select>
                      <input type="number" className="form-input text-sm h-10 flex-1" placeholder="Amount" value={e.amount} onChange={evt => updateExpenseEntry(e.id, 'amount', evt.target.value)} />
                      <input type="text" className="form-input text-sm h-10 flex-1" placeholder="Note" value={e.note} onChange={evt => updateExpenseEntry(e.id, 'note', evt.target.value)} />
                    </div>
                  ))}
                  <button type="button" onClick={addExpenseEntry} className="w-full py-2 border border-dashed border-[#1e2d45] rounded-lg text-xs text-[#8899aa] hover:text-[#f87171] hover:border-[#f87171] transition-colors flex items-center justify-center gap-1"><Plus size={14} /> Add Expense</button>
                </div>

                {/* ADVANCE SALARY */}
                <div>
                  <h4 className="text-sm font-semibold text-[#8899aa] mb-2 uppercase tracking-wide">Advance Salary</h4>
                  {advanceSalaries.map((a) => (
                    <div key={a.id} className="bg-[#0a0f18] border border-[#1e2d45] rounded-lg p-3 mb-2 relative group">
                      <button type="button" onClick={() => removeAdvanceSalary(a.id)} className="absolute -right-2 -top-2 bg-[#ef4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] shadow-lg z-10"><X size={14} /></button>
                      <div className="flex gap-3 items-start mb-2">
                        <select className="form-input text-sm h-10 flex-[2]" value={a.employeeId} onChange={e => updateAdvanceSalary(a.id, 'employeeId', e.target.value)}>
                          <option value="">Select Employee...</option>
                          {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                        <select className="form-input text-sm h-10 flex-1" value={a.type} onChange={e => updateAdvanceSalary(a.id, 'type', e.target.value)}>
                          <option value="CASH">CASH</option>
                          <option value="PRODUCT">PRODUCT</option>
                        </select>
                      </div>
                      <div className="flex gap-3 items-start">
                        {a.type === 'CASH' ? (
                          <input type="number" className="form-input text-sm h-10 flex-[2]" placeholder="Amount" value={a.amount} onChange={e => updateAdvanceSalary(a.id, 'amount', e.target.value)} />
                        ) : (
                          <input type="text" className="form-input text-sm h-10 flex-[2]" placeholder="Product Description" value={a.productDescription} onChange={e => updateAdvanceSalary(a.id, 'productDescription', e.target.value)} />
                        )}
                        <input type="text" className="form-input text-sm h-10 flex-1" placeholder="Note" value={a.note} onChange={e => updateAdvanceSalary(a.id, 'note', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addAdvanceSalary} className="w-full py-2 border border-dashed border-[#1e2d45] rounded-lg text-xs text-[#8899aa] hover:text-[#f87171] hover:border-[#f87171] transition-colors flex items-center justify-center gap-1"><Plus size={14} /> Add Advance Salary</button>
                </div>

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
              />
            </div>
          </div>

          <div style={{ height: '100px' }}></div>
        </form>
      </div>

      <div className="fixed bottom-0 right-0 bg-[#0a0f18] border-t border-[#1e2d45] z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] mobile-sticky-bar">
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
                    className="mt-1 w-4 h-4 rounded border-[#1e2d45] bg-[#0a0f18] text-[#3b82f6]"
                    checked={(eodChecklist as any)[item.key]}
                    onChange={(e) => setEodChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  <span className={`text-sm ${ (eodChecklist as any)[item.key] ? 'text-white' : 'text-[#8899aa]' }`}>
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
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setShowChecklistModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary bg-[#3b82f6] hover:bg-[#2563eb]" 
                onClick={executeSubmit}
                disabled={!eodChecklist.safeLocked || !eodChecklist.acOff || !eodChecklist.shopClean || !eodChecklist.shuttersDown || !eodChecklist.cashVerified || eodChecklist.signature.trim().length < 3}
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
