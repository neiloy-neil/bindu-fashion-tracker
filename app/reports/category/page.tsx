'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { dhakaDateString } from '@/lib/new-entry'
import toast from 'react-hot-toast'

interface Branch { id: number; name: string }
interface CategoryRow {
  categoryId: number
  categoryName: string
  frequency?: string | null
  total: number
  byBranch: Record<number, number>
}
interface ReportData {
  branches: Branch[]
  income: CategoryRow[]
  expenses: CategoryRow[]
}

function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function lastMonth() {
  const d = new Date()
  d.setDate(0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`,
  }
}

function fmt(n: number) { return '৳' + formatCurrency(n) }

function pct(part: number, total: number) {
  if (!total) return '—'
  return (part / total * 100).toFixed(1) + '%'
}

export default function CategoryReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(dhakaDateString())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  const fetchReport = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId)
      const res = await fetch(`/api/reports/category?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch {
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [from, to, selectedBranchId])

  useEffect(() => { void fetchReport() }, [fetchReport])

  // Quick date pickers
  const setThisMonth = () => { setFrom(startOfMonth()); setTo(dhakaDateString()) }
  const setLastMonth = () => { const l = lastMonth(); setFrom(l.from); setTo(l.to) }
  const setLast7 = () => {
    const d = new Date(); const t = dhakaDateString()
    d.setDate(d.getDate() - 6)
    setFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    setTo(t)
  }

  const exportCsv = () => {
    if (!data) return
    const displayBranches = selectedBranchId === 'all' ? data.branches : data.branches.filter(b => b.id === parseInt(selectedBranchId))
    const branchHeaders = displayBranches.map(b => b.name)
    const rows: string[][] = []

    rows.push([`Category Report — ${from} to ${to}`])
    rows.push([])

    // Income
    rows.push(['INCOME'])
    rows.push(['Category', ...branchHeaders, 'Total', '% of Total'])
    const incomeTotal = data.income.reduce((s, r) => s + r.total, 0)
    for (const row of data.income) {
      rows.push([
        row.categoryName,
        ...displayBranches.map(b => String(row.byBranch[b.id] ?? 0)),
        String(row.total),
        pct(row.total, incomeTotal),
      ])
    }
    rows.push(['Total', ...displayBranches.map(b => String(data.income.reduce((s, r) => s + (r.byBranch[b.id] ?? 0), 0))), String(incomeTotal), '100%'])
    rows.push([])

    // Expenses
    rows.push(['EXPENSES'])
    rows.push(['Category', ...branchHeaders, 'Total', '% of Total'])
    const expTotal = data.expenses.reduce((s, r) => s + r.total, 0)
    for (const row of data.expenses) {
      rows.push([
        row.categoryName,
        ...displayBranches.map(b => String(row.byBranch[b.id] ?? 0)),
        String(row.total),
        pct(row.total, expTotal),
      ])
    }
    rows.push(['Total', ...displayBranches.map(b => String(data.expenses.reduce((s, r) => s + (r.byBranch[b.id] ?? 0), 0))), String(expTotal), '100%'])

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CategoryReport_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayBranches = data
    ? (selectedBranchId === 'all' ? data.branches : data.branches.filter(b => b.id === parseInt(selectedBranchId)))
    : []

  const showBranchCols = selectedBranchId === 'all' && displayBranches.length > 1

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Category Report</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Income &amp; expense breakdown by category</p>
        </div>
        {data && (
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download size={14} /> Export Excel (CSV)
          </Button>
        )}
      </div>

      <div className="flex-1 p-3 sm:p-6 space-y-6 overflow-auto">
        {/* Filters */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">From</Label>
              <Input type="date" className="h-9 w-40 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">To</Label>
              <Input type="date" className="h-9 w-40 text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={setLast7} className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">Last 7 days</button>
              <button onClick={setThisMonth} className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">This month</button>
              <button onClick={setLastMonth} className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">Last month</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : data ? (
          <div className="space-y-8">
            <CategoryTable
              title="Income"
              rows={data.income}
              branches={displayBranches}
              showBranchCols={showBranchCols}
              colorClass="text-[var(--success)]"
              borderClass="border-l-[var(--success)]"
            />
            <CategoryTable
              title="Expenses"
              rows={data.expenses}
              branches={displayBranches}
              showBranchCols={showBranchCols}
              colorClass="text-[var(--danger)]"
              borderClass="border-l-[var(--danger)]"
            />
          </div>
        ) : null}
      </div>
    </>
  )
}

function CategoryTable({
  title, rows, branches, showBranchCols, colorClass, borderClass,
}: {
  title: string
  rows: CategoryRow[]
  branches: Branch[]
  showBranchCols: boolean
  colorClass: string
  borderClass: string
}) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)

  if (rows.length === 0) return (
    <div className={`rounded-xl border border-[var(--border)] border-l-4 ${borderClass} bg-[var(--surface)] p-5`}>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h2>
      <p className="text-sm text-[var(--text-muted)]">No {title.toLowerCase()} entries in this period.</p>
    </div>
  )

  return (
    <div className={`rounded-xl border border-[var(--border)] border-l-4 ${borderClass} bg-[var(--surface)] overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        <span className={`text-base font-bold font-mono ${colorClass}`}>{fmt(grandTotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              {showBranchCols && branches.map(b => (
                <th key={b.id} className="px-4 py-3 text-right font-medium whitespace-nowrap">{b.name}</th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.categoryId} className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-raised)]/40'}`}>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  {row.categoryName}
                  {row.frequency && row.frequency !== 'DAILY' && (
                    <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {row.frequency}
                    </span>
                  )}
                </td>
                {showBranchCols && branches.map(b => (
                  <td key={b.id} className="px-4 py-3 text-right tabular-nums font-mono text-[var(--text-secondary)]">
                    {row.byBranch[b.id] ? fmt(row.byBranch[b.id]) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                ))}
                <td className={`px-4 py-3 text-right tabular-nums font-mono font-semibold ${colorClass}`}>
                  {fmt(row.total)}
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)] text-xs">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current opacity-40"
                        style={{ width: grandTotal ? `${(row.total / grandTotal * 100)}%` : '0%' }}
                      />
                    </div>
                    {pct(row.total, grandTotal)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-raised)]">
            <tr>
              <td className="px-4 py-3 font-bold text-[var(--text-primary)]">Total</td>
              {showBranchCols && branches.map(b => (
                <td key={b.id} className="px-4 py-3 text-right tabular-nums font-mono font-bold text-[var(--text-primary)]">
                  {fmt(rows.reduce((s, r) => s + (r.byBranch[b.id] ?? 0), 0))}
                </td>
              ))}
              <td className={`px-4 py-3 text-right tabular-nums font-mono font-bold ${colorClass}`}>
                {fmt(grandTotal)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)]">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
