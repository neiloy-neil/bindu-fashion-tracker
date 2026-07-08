'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

type Branch = { id: number; name: string }

type PettyCashRow = {
  id: number
  date: string
  branch: { name: string }
  pettyCashOpening: number
  pettyCashReplenished: number
  pettyCashUsed: number
  pettyCashClosing: number
  actualPhysicalCash: number | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PettyCashReportPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<PettyCashRow[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(Array.isArray(d) ? d : (d.branches || [])))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setHasSearched(true)
    const params = new URLSearchParams({ month: String(month), year: String(year) })
    if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId)
    fetch(`/api/reports/petty-cash?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [selectedBranchId, month, year])

  const totals = rows.reduce((acc, r) => ({
    opening: acc.opening + r.pettyCashOpening,
    replenished: acc.replenished + r.pettyCashReplenished,
    used: acc.used + r.pettyCashUsed,
    closing: acc.closing + r.pettyCashClosing,
  }), { opening: 0, replenished: 0, used: 0, closing: 0 })

  const exportExcel = async () => {
    if (!rows.length) return
    const { downloadWorkbook } = await import('@/lib/excel-export')
    const label = selectedBranchId === 'all' ? 'All Branches' : (branches.find(b => String(b.id) === selectedBranchId)?.name || '')
    await downloadWorkbook(`petty-cash-${MONTHS[month - 1]}-${year}${label !== 'All Branches' ? `-${label}` : ''}.xlsx`, [
      {
        name: 'Petty Cash',
        columns: [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Branch', key: 'branch', width: 20 },
          { header: 'Opening', key: 'opening', width: 14 },
          { header: 'Replenished', key: 'replenished', width: 14 },
          { header: 'Used', key: 'used', width: 14 },
          { header: 'Closing', key: 'closing', width: 14 },
          { header: 'Physical Cash', key: 'physical', width: 14 },
        ],
        rows: rows.map(r => ({
          date: new Date(r.date).toLocaleDateString('en-BD'),
          branch: r.branch.name,
          opening: r.pettyCashOpening,
          replenished: r.pettyCashReplenished,
          used: r.pettyCashUsed,
          closing: r.pettyCashClosing,
          physical: r.actualPhysicalCash ?? '',
        })),
      },
    ])
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Petty Cash Report</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Daily petty cash float per branch</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Month</Label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Year</Label>
              <Input type="number" className="h-9 w-full text-sm" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : hasSearched && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm font-medium text-[var(--text-muted)]">No petty cash entries found for this period.</p>
          </div>
        ) : rows.length > 0 ? (
          <div>
            <div className="flex gap-3 mb-4">
              <Button variant="outline" className="gap-2" onClick={exportExcel}>
                <Download size={16} /> Export Excel
              </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Opening', value: totals.opening, color: 'var(--text-primary)' },
                { label: 'Replenished', value: totals.replenished, color: '#059669' },
                { label: 'Used', value: totals.used, color: '#dc2626' },
                { label: 'Total Closing', value: totals.closing, color: 'var(--accent)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                  <p className="text-lg font-bold" style={{ color }}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-[var(--border)]">
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Opening</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Replenished</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Used</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Closing</TableHead>
                      <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Physical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => {
                      const variance = row.actualPhysicalCash != null ? row.actualPhysicalCash - row.pettyCashClosing : null
                      return (
                        <TableRow key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                          <TableCell className="whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                            {new Date(row.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-secondary)]">{row.branch.name}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(row.pettyCashOpening)}</TableCell>
                          <TableCell className="text-right text-sm text-green-400">{row.pettyCashReplenished > 0 ? `+${formatCurrency(row.pettyCashReplenished)}` : '—'}</TableCell>
                          <TableCell className="text-right text-sm text-red-400">{row.pettyCashUsed > 0 ? formatCurrency(row.pettyCashUsed) : '—'}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(row.pettyCashClosing)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {row.actualPhysicalCash != null ? (
                              <span className={variance !== 0 ? 'text-orange-400' : 'text-[var(--text-secondary)]'}>
                                {formatCurrency(row.actualPhysicalCash)}
                                {variance !== 0 && <span className="ml-1 text-xs">({variance! > 0 ? '+' : ''}{formatCurrency(variance!)})</span>}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
