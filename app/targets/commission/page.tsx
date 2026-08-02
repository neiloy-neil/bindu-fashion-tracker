'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { dhakaDateString } from '@/lib/new-entry'
import toast from 'react-hot-toast'

interface Branch { id: number; name: string }
interface BonusRecord {
  id: number
  branchId: number
  branch: { id: number; name: string }
  date: string
  dailySale: number
  dailyTarget: number
  achievedPct: number
  bonusPct: number
  bonusAmount: number
}

function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}

export default function CommissionReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(dhakaDateString())
  const [records, setRecords] = useState<BonusRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
  }, [])

  const fetchRecords = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (selectedBranch !== 'all') params.set('branchId', selectedBranch)
      const res = await fetch(`/api/targets/commission?${params}`)
      if (!res.ok) throw new Error()
      setRecords(await res.json())
    } catch {
      toast.error('Failed to load commission data')
    } finally {
      setLoading(false)
    }
  }, [from, to, selectedBranch])

  useEffect(() => { void fetchRecords() }, [fetchRecords])

  const totalBonus = records.reduce((s, r) => s + r.bonusAmount, 0)
  const totalSale = records.reduce((s, r) => s + r.dailySale, 0)

  const exportCsv = () => {
    const rows: string[][] = [
      [`Sales Commission Report — ${from} to ${to}`],
      [],
      ['Date', 'Branch', 'Daily Sale', 'Daily Target', 'Achievement %', 'Bonus %', 'Bonus Amount'],
      ...records.map(r => [
        new Date(r.date).toLocaleDateString('en-GB'),
        r.branch.name,
        String(r.dailySale),
        r.dailyTarget > 0 ? String(r.dailyTarget) : 'No target',
        r.dailyTarget > 0 ? r.achievedPct.toFixed(1) + '%' : 'N/A',
        r.bonusPct + '%',
        String(r.bonusAmount.toFixed(2)),
      ]),
      [],
      ['', 'TOTAL', String(totalSale), '', '', '', String(totalBonus.toFixed(2))],
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SalesCommission_${from}_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function colorFor(pct: number) {
    if (pct >= 100) return 'text-[var(--success)]'
    if (pct >= 70) return 'text-amber-500'
    return 'text-[var(--danger)]'
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Sales Commission</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Daily bonus earned per branch by target achievement</p>
        </div>
        {records.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
        )}
      </div>

      <div className="flex-1 p-3 sm:p-6 space-y-6 overflow-auto">
        {/* Filters */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9 w-48 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
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
          </div>
        </div>

        {/* Summary tiles */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Total Sales</p>
              <p className="text-xl font-bold font-mono text-[var(--success)]">৳{formatCurrency(totalSale)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Total Commission</p>
              <p className="text-xl font-bold font-mono text-[var(--accent)]">৳{formatCurrency(totalBonus)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">Days Recorded</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{records.length}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--text-muted)]">
            No commission records in this period. Records are created automatically when daily entries are submitted.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Branch</th>
                    <th className="px-4 py-3 text-right font-medium">Daily Sale</th>
                    <th className="px-4 py-3 text-right font-medium">Daily Target</th>
                    <th className="px-4 py-3 text-right font-medium">Achievement</th>
                    <th className="px-4 py-3 text-right font-medium">Bonus %</th>
                    <th className="px-4 py-3 text-right font-medium">Bonus Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-raised)]/40'}`}>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{r.branch.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-[var(--success)]">৳{formatCurrency(r.dailySale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-[var(--text-secondary)] text-xs">
                        {r.dailyTarget > 0 ? `৳${formatCurrency(r.dailyTarget)}` : <span className="text-[var(--text-muted)]">No target</span>}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${r.dailyTarget > 0 ? colorFor(r.achievedPct) : 'text-[var(--text-muted)]'}`}>
                        {r.dailyTarget > 0 ? r.achievedPct.toFixed(1) + '%' : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">{r.bonusPct}%</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold text-[var(--accent)]">
                        ৳{formatCurrency(r.bonusAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-raised)]">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-[var(--text-primary)]">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-bold text-[var(--success)]">৳{formatCurrency(totalSale)}</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-bold text-[var(--accent)]">৳{formatCurrency(totalBonus)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
