// TODO (Phase 5): When building the entries-list detail panel, add a "View Payslip" link next to any Bank/Cheque payment row that has an attachmentUrl.
'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { formatCurrency, computeTotals } from '@/lib/utils'
import { DailyEntry, Branch, Category } from '@/lib/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MessageCircle, CheckSquare, X, Eye } from 'lucide-react'
import CommentThread from '@/components/CommentThread'
import EditRequestModal from '@/components/EditRequestModal'
import EntryViewModal from '@/components/dashboard/EntryViewModal'
import { downloadWorkbook } from '@/lib/excel-export'

import { useSearchParams } from 'next/navigation'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'
import BranchPendingItems from '@/components/entries/BranchPendingItems'

function Entries() {
  const searchParams = useSearchParams()
  const now = new Date()
  const initialMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()

  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [branchFilter, setBranchFilter] = useState('')
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [visibleCount, setVisibleCount] = useState(50)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null)
  
  // Notice that editCell now uses categoryId since fields are dynamic
  const [editCell, setEditCell] = useState<{ id: number; categoryId: number; cellType: 'income' | 'expense' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeChat, setActiveChat] = useState<{ id: number, branchName: string, date: string } | null>(null)
  const [activeChecklist, setActiveChecklist] = useState<any>(null)
  const [activeViewEntry, setActiveViewEntry] = useState<DailyEntry | null>(null)
  const [requestEditData, setRequestEditData] = useState<{ id: number, branchName: string, date: string, categoryId: number, categoryName: string, oldValue: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [entriesReloadNonce, setEntriesReloadNonce] = useState(0)

  const [userRole, setUserRole] = useState<'ADMIN' | 'BRANCH' | null>(null)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const [branchRes, categoryRes, sessionRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/categories'),
        fetch('/api/auth/session'),
      ])

      const [branchData, categoryData, session] = await Promise.all([
        branchRes.json(),
        categoryRes.json(),
        sessionRes.json(),
      ])

      if (!cancelled) {
        setBranches(branchData)
        setCategories(categoryData)
        if (session?.user) {
          setUserRole(session.user.role)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loading && entries.length > visibleCount) {
      const t = setTimeout(() => setVisibleCount((v) => v + 50), 100)
      return () => clearTimeout(t)
    }
  }, [entries.length, visibleCount, loading])

  useEffect(() => {
    let cancelled = false

    const loadEntries = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          month: String(month),
          year: String(year),
          limit: '1000',
        })
        if (branchFilter) params.set('branchId', branchFilter)
        const res = await fetch(`/api/entries?${params}`)
        const data = await res.json()

        if (!cancelled) {
          setEntries(data.entries || [])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadEntries()

    return () => {
      cancelled = true
    }
  }, [month, year, branchFilter, entriesReloadNonce])

  useEffect(() => {
    if (editCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editCell])

  const startEdit = (entry: DailyEntry, category: Category, value: number, cellType: 'income' | 'expense' = 'income') => {
    const todayStr = new Date().toISOString().split('T')[0]
    const entryDateStr = new Date(entry.date).toISOString().split('T')[0]

    if (userRole === 'BRANCH' && todayStr !== entryDateStr) {
      setRequestEditData({
        id: entry.id,
        branchName: entry.branch?.name || 'Branch',
        date: entry.date,
        categoryId: category.id,
        categoryName: category.name,
        oldValue: value
      })
    } else {
      setEditCell({ id: entry.id, categoryId: category.id, cellType })
      setEditValue(String(value || 0))
    }
  }

  const saveEdit = async () => {
    if (!editCell) return
    setSaving(true)
    try {
      const payload = editCell.cellType === 'expense'
        ? { expenseEntries: [{ categoryId: editCell.categoryId, amount: parseFloat(editValue) || 0 }] }
        : { items: [{ categoryId: editCell.categoryId, amount: parseFloat(editValue) || 0 }] }
      const res = await fetch(`/api/entries/${editCell.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      
      const updatedEntry = await res.json()
      
      setEntries((prev) =>
        prev.map((e) => e.id === editCell.id ? updatedEntry : e)
      )
      toast.success('Cell saved!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
      setEditCell(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditCell(null)
  }

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

  const exportToExcel = async () => {
    const rows = entries.map((e) => {
      const totals = computeTotals(e as any)
      const row: Record<string, string | number> = {
        date: new Date(e.date).toLocaleDateString(),
        branch: e.branch?.name || '',
      }
      
      incomeCategories.forEach(c => {
        const item = (e.items || []).find((i: any) => i.categoryId === c.id)
        row[c.name] = item?.amount || 0
      })
      
      row.totalSale = totals.totalSale
      row.totalAmount = totals.totalAmount
      
      expenseCategories.forEach(c => {
        const exp = ((e as any).expenseEntries || []).find((x: any) => x.categoryId === c.id)
        row[c.name] = exp?.amount || 0
      })
      
      row.totalExpense = totals.totalExpense
      row.netBalance = totals.netBalance
      return row
    })

    await downloadWorkbook(`bindu-fashion-${year}-${String(month).padStart(2, '0')}.xlsx`, [
      {
        name: 'Entries',
        columns: [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Branch', key: 'branch', width: 22 },
          ...incomeCategories.map((category) => ({ header: category.name, key: category.name, width: 14 })),
          { header: 'Total Sale', key: 'totalSale', width: 14 },
          { header: 'Total Amount', key: 'totalAmount', width: 14 },
          ...expenseCategories.map((category) => ({ header: category.name, key: category.name, width: 14 })),
          { header: 'Total Expense', key: 'totalExpense', width: 14 },
          { header: 'Net Balance', key: 'netBalance', width: 14 },
        ],
        rows,
      },
    ])
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    if (e.branch?.name.toLowerCase().includes(q)) return true
    if (e.date.includes(q)) return true
    // check amounts in items
    if (e.items?.some(i => String(i.amount).includes(q))) return true
    return false
  })

  // Sort entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (!sortConfig) return 0
    // Dynamic sort by category ID or a fixed key
    let aVal = 0
    let bVal = 0
    
    if (sortConfig.key.startsWith('cat_')) {
      const catId = parseInt(sortConfig.key.replace('cat_', ''))
      const cat = categories.find(c => c.id === catId)
      if (cat?.type === 'EXPENSE') {
        aVal = (a as any).expenseEntries?.find((e: any) => e.categoryId === catId)?.amount || 0
        bVal = (b as any).expenseEntries?.find((e: any) => e.categoryId === catId)?.amount || 0
      } else {
        aVal = a.items?.find(i => i.categoryId === catId)?.amount || 0
        bVal = b.items?.find(i => i.categoryId === catId)?.amount || 0
      }
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const visibleEntries = sortedEntries.slice(0, visibleCount)

  const grouped = sortConfig
    ? new Map([['Sorted Results', visibleEntries]])
    : visibleEntries.reduce<Map<string, DailyEntry[]>>((acc, e) => {
        const d = new Date(e.date).toISOString().split('T')[0]
        if (!acc.has(d)) acc.set(d, [])
        acc.get(d)!.push(e)
        return acc
      }, new Map())

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const renderCell = (entry: DailyEntry, category: Category, cellType: 'income' | 'expense' = 'income') => {
    const value = cellType === 'expense'
      ? (entry as any).expenseEntries?.find((e: any) => e.categoryId === category.id)?.amount || 0
      : entry.items?.find((i: any) => i.categoryId === category.id)?.amount || 0
    const isEditing = editCell?.id === entry.id && editCell?.categoryId === category.id && editCell?.cellType === cellType

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="cell-input tabular-nums text-right font-mono focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          type="number"
        />
      )
    }

    return (
      <span
        className="editable-cell block min-w-[70px] cursor-pointer tabular-nums text-right font-mono hover:ring-2 hover:ring-[var(--accent)] hover:outline-none rounded px-1 transition-all"
        onClick={() => startEdit(entry, category, value, cellType)}
        title="Click to edit"
      >
        {value > 0 ? formatCurrency(value) : <span className="text-[var(--text-muted)] opacity-40">—</span>}
      </span>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-20 flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Sheet View</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{entries.length} entries • Click any cell to edit inline</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            className="flex h-9 w-[150px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="flex h-9 w-[130px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            className="flex h-9 w-[95px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {userRole === 'ADMIN' && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => { void exportToExcel() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </Button>
          <Button asChild size="sm" className="flex items-center gap-2">
            <Link href="/entries/new">+ New Entry</Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6 overflow-auto">
        {userRole === 'BRANCH' && <BranchPendingItems />}
        {loading || categories.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] gap-3">
            <BrandSpinner />
            <span className="text-[var(--text-secondary)]">Loading register data...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl text-[var(--text-primary)] mb-2 font-semibold">No register data submitted</h3>
            <p className="mb-6 text-sm">There are no entries for {MONTHS[month-1]} {year} yet.<br />If the shop is open today, click &apos;+ New Entry&apos; to start the daily sheet.</p>
            <div className="flex gap-3 justify-center">
              <Button asChild className="min-w-[160px]"><Link href="/entries/new">+ New Entry</Link></Button>
            </div>
          </div>
        ) : (
          <div className="sheet-table-wrapper">
            <table className="sheet-table">
              <thead>
                {/* Group headers */}
                <tr>
                  <th className="col-sticky-0 text-left min-w-[90px]" rowSpan={2}>Date</th>
                  <th className="col-sticky-1 text-left" rowSpan={2}>Branch</th>
                  <th className="income-header" colSpan={incomeCategories.length}>Income</th>
                  <th className="bg-[var(--surface)] text-[var(--text-primary)] font-bold py-2 px-3 text-[10px] text-center" colSpan={2}>Summary</th>
                  <th className="expense-header" colSpan={expenseCategories.length}>Expenses</th>
                  <th className="bg-[var(--surface)] text-[var(--text-primary)] font-bold py-2 px-3 text-[10px] text-center" colSpan={2}>Totals</th>
                  <th className="col-sticky-right-3 text-center w-[60px]" rowSpan={2}>View</th>
                  <th className="col-sticky-right-2 text-center w-[60px]" rowSpan={2}>EOD</th>
                  <th className="col-sticky-right-1 text-center w-[60px]" rowSpan={2}>Chat</th>
                </tr>
                {/* Column headers */}
                <tr>
                  {incomeCategories.map((c) => (
                    <th key={c.id} className="min-w-[90px] bg-emerald-500/5 cursor-pointer" onClick={() => handleSort(`cat_${c.id}`)}>
                      {c.name} {sortConfig?.key === `cat_${c.id}` ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                  <th className="min-w-[90px] text-[var(--info)]">Total Sale</th>
                  <th className="min-w-[90px] text-[var(--info)]">Total Amt</th>
                  {expenseCategories.map((c) => (
                    <th key={c.id} className="min-w-[90px] bg-rose-500/5 cursor-pointer" onClick={() => handleSort(`cat_${c.id}`)}>
                      {c.name} {sortConfig?.key === `cat_${c.id}` ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                  <th className="min-w-[90px] text-[var(--danger-light)]">Total Exp</th>
                  <th className="min-w-[90px] text-[var(--info)]">Net Bal</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => {
                  const dayLabel = sortConfig ? 'Sorted' : new Date(dateKey).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })
                  return dayEntries.map((entry, rowIdx) => {
                    const totals = computeTotals(entry as any)
                    return (
                      <tr
                        key={entry.id}
                        className={rowIdx === 0 ? 'first-of-date' : ''}
                      >
                        <td className="col-sticky-0 col-date bg-[var(--surface-raised)]">
                          {rowIdx === 0 ? dayLabel : ''}
                        </td>
                        <td className="col-sticky-1 col-meta bg-[var(--surface-raised)]">
                          {entry.branch?.name}
                        </td>
                        {incomeCategories.map((c) => (
                          <td key={c.id} className="income-cell">
                            {renderCell(entry, c)}
                          </td>
                        ))}
                        <td className="total-cell tabular-nums text-right font-mono text-[var(--info)]">
                          {formatCurrency(totals.totalSale)}
                        </td>
                        <td className="total-cell tabular-nums text-right font-mono text-[var(--info)]">
                          {formatCurrency(totals.totalAmount)}
                        </td>
                        {expenseCategories.map((c) => (
                          <td key={c.id} className="expense-cell">
                            {renderCell(entry, c, 'expense')}
                          </td>
                        ))}
                        <td className="total-cell tabular-nums text-right font-mono text-[var(--danger-light)]">
                          {formatCurrency(totals.totalExpense)}
                        </td>
                        <td className={`tabular-nums text-right font-mono ${totals.netBalance >= 0 ? 'net-positive' : 'net-negative'}`}>
                          {formatCurrency(totals.netBalance)}
                        </td>
                        <td className="col-sticky-right-3 text-center bg-[var(--surface-raised)]">
                          <button 
                            onClick={() => setActiveViewEntry(entry)}
                            className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--text-secondary)] hover:text-white transition-colors"
                            title="View Full Entry"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                        <td className="col-sticky-right-2 text-center bg-[var(--surface-raised)]">
                          {(entry as any).eodChecklist ? (
                            <button 
                              onClick={() => setActiveChecklist((entry as any).eodChecklist)}
                              className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--success)] hover:text-[var(--success)] opacity-80 hover:opacity-100 transition-colors"
                              title="View EOD Checklist"
                            >
                              <CheckSquare size={18} />
                            </button>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>
                        <td className="col-sticky-right-1 text-center bg-[var(--surface-raised)]">
                          <button 
                            onClick={() => setActiveChat({ id: entry.id, branchName: entry.branch?.name || 'Branch', date: entry.date })}
                            className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--accent)] hover:text-[var(--accent)] opacity-80 hover:opacity-100 transition-colors"
                            title="Open Chat"
                          >
                            <MessageCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {saving && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div className="toast toast-success flex items-center gap-2">
            <BrandSpinner size={16} />
            Saving…
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeChat && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[90]" onClick={() => setActiveChat(null)} />
          <CommentThread 
            entryId={activeChat.id} 
            branchName={activeChat.branchName} 
            date={activeChat.date} 
            onClose={() => setActiveChat(null)} 
          />
        </>
      )}

      {/* Checklist View Modal */}
      {activeChecklist && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setActiveChecklist(null)} 
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <CheckSquare className="text-[var(--success)]" /> Digital Audit Log
            </h3>
            
            <div className="space-y-4 mb-6">
              {[
                { key: 'safeLocked', label: 'Safe is locked and secured' },
                { key: 'acOff', label: 'All ACs and lights are turned off' },
                { key: 'shopClean', label: 'Floor is swept and shop is clean' },
                { key: 'shuttersDown', label: 'Main shutters are down and locked' },
                { key: 'cashVerified', label: 'Cash count has been double-verified' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${activeChecklist[item.key] ? 'bg-[var(--success)] text-black' : 'bg-[var(--border)] text-transparent'}`}>
                    ✓
                  </div>
                  <span className="text-[var(--text-primary)] text-sm">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4 text-center">
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Signed Off By</div>
              <div className="font-mono text-lg text-[var(--accent)]">{activeChecklist.signature}</div>
            </div>
          </div>
        </div>
      )}

      {/* Entry View Modal */}
      {activeViewEntry && (
        <EntryViewModal 
          entry={activeViewEntry} 
          onClose={() => setActiveViewEntry(null)} 
          onDeleted={() => {
            setActiveViewEntry(null)
            setEntriesReloadNonce((value) => value + 1)
          }}
        />
      )}

      {/* Edit Request Modal */}
      {requestEditData && (
        <EditRequestModal
          entryId={requestEditData.id}
          branchName={requestEditData.branchName}
          date={requestEditData.date}
          categoryId={requestEditData.categoryId}
          categoryName={requestEditData.categoryName}
          oldValue={requestEditData.oldValue}
          onClose={() => setRequestEditData(null)}
        />
      )}
    </>
  )
}

export default function EntriesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen gap-3">
        <BrandSpinner />
        <span className="text-[var(--text-secondary)]">Loading Sheet…</span>
      </div>
    }>
      <Entries />
    </Suspense>
  )
}
