'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Branch { id: number; name: string }
interface Target {
  id?: number
  branchId: number
  branch: { id: number; name: string }
  month: number
  year: number
  monthlyTarget: number
  dailyTarget: number
  setBy?: { username: string }
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

export default function TargetsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [branches, setBranches] = useState<Branch[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [canWrite, setCanWrite] = useState(false)
  const [editRow, setEditRow] = useState<number | null>(null) // branchId being edited
  const [editValues, setEditValues] = useState<{ monthlyTarget: string; dailyTarget: string }>({ monthlyTarget: '', dailyTarget: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches)
    // Check write permission via a dummy POST that returns 403 or 200
    fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _check: true }) })
      .then(r => { if (r.status !== 403) setCanWrite(true) })
      .catch(() => {})
  }, [])

  const fetchTargets = useCallback(async () => {
    const res = await fetch(`/api/targets?month=${month}&year=${year}`)
    if (res.ok) setTargets(await res.json())
  }, [month, year])

  useEffect(() => { void fetchTargets() }, [fetchTargets])

  // Build rows: one per branch, merge with existing target if any
  const rows = branches.map(b => {
    const t = targets.find(t => t.branchId === b.id)
    return {
      branchId: b.id,
      branchName: b.name,
      monthlyTarget: t?.monthlyTarget ?? 0,
      dailyTarget: t?.dailyTarget ?? 0,
      setBy: t?.setBy?.username ?? null,
    }
  })

  function startEdit(branchId: number, monthly: number, daily: number) {
    setEditRow(branchId)
    setEditValues({ monthlyTarget: monthly > 0 ? String(monthly) : '', dailyTarget: daily > 0 ? String(daily) : '' })
  }

  async function saveEdit(branchId: number) {
    const monthlyTarget = parseFloat(editValues.monthlyTarget) || 0
    const dailyTarget = parseFloat(editValues.dailyTarget) || 0
    setSaving(true)
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, month, year, monthlyTarget, dailyTarget }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Target saved')
      setEditRow(null)
      await fetchTargets()
    } catch {
      toast.error('Failed to save target')
    } finally {
      setSaving(false)
    }
  }

  const days = daysInMonth(month, year)

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Sales Targets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Set monthly &amp; daily targets per branch</p>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6 space-y-6 overflow-auto">
        {/* Filters */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Month</Label>
              <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Year</Label>
              <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger className="h-9 w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-4 py-3 text-xs text-[var(--accent)] space-y-1">
          <p><strong>Commission rule:</strong> Daily sale ≥ daily target → <strong>2% bonus</strong> · Daily sale &lt; daily target → <strong>1% bonus</strong> (minimum)</p>
          <p>Daily target auto-computes as Monthly Target ÷ {days} days if left blank.</p>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Branch</th>
                  <th className="px-4 py-3 text-right font-medium">Monthly Target</th>
                  <th className="px-4 py-3 text-right font-medium">Daily Target</th>
                  <th className="px-4 py-3 text-right font-medium">Effective Daily</th>
                  <th className="px-4 py-3 text-left font-medium">Set By</th>
                  {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isEditing = editRow === row.branchId
                  const effectiveDaily = row.dailyTarget > 0 ? row.dailyTarget : (row.monthlyTarget > 0 ? row.monthlyTarget / days : 0)

                  return (
                    <tr key={row.branchId} className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-raised)]/40'}`}>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.branchName}</td>

                      {isEditing ? (
                        <>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              className="h-8 text-sm text-right w-36 ml-auto"
                              placeholder="Monthly target"
                              value={editValues.monthlyTarget}
                              onChange={e => setEditValues(v => ({ ...v, monthlyTarget: e.target.value }))}
                              autoFocus
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              className="h-8 text-sm text-right w-36 ml-auto"
                              placeholder={`Auto (÷${days})`}
                              value={editValues.dailyTarget}
                              onChange={e => setEditValues(v => ({ ...v, dailyTarget: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-muted)] text-xs tabular-nums">
                            {editValues.monthlyTarget
                              ? `৳${formatCurrency((parseFloat(editValues.dailyTarget) || 0) > 0 ? parseFloat(editValues.dailyTarget) : (parseFloat(editValues.monthlyTarget) / days))}`
                              : '—'}
                          </td>
                          <td />
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" className="h-7 px-2" onClick={() => saveEdit(row.branchId)} disabled={saving}>
                                <Check size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditRow(null)}>
                                <X size={13} />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-[var(--text-primary)]">
                            {row.monthlyTarget > 0 ? `৳${formatCurrency(row.monthlyTarget)}` : <span className="text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-[var(--text-secondary)] text-xs">
                            {row.dailyTarget > 0 ? `৳${formatCurrency(row.dailyTarget)}` : <span className="text-[var(--text-muted)]">auto</span>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-[var(--text-secondary)] text-xs">
                            {effectiveDaily > 0 ? `৳${formatCurrency(effectiveDaily)}` : <span className="text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.setBy ?? '—'}</td>
                          {canWrite && (
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => startEdit(row.branchId, row.monthlyTarget, row.dailyTarget)}
                              >
                                <Pencil size={12} className="mr-1" /> Set
                              </Button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No branches found.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
