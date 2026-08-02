'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TargetRow {
  branchId: number
  branchName: string
  monthlyTarget: number
  dailyTarget: number
  todaySale: number
  mtdSale: number
  todayPct: number | null
  mtdPct: number | null
}

function pctColor(pct: number | null) {
  if (pct === null) return 'bg-[var(--border)]'
  if (pct >= 100) return 'bg-[var(--success)]'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-[var(--danger)]'
}

function pctText(pct: number | null) {
  if (pct === null) return '—'
  return pct.toFixed(1) + '%'
}

function ProgressBar({ pct, color }: { pct: number | null; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
    </div>
  )
}

export default function BranchTargetWidget() {
  const [rows, setRows] = useState<TargetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/targets')
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  const withTarget = rows.filter(r => r.monthlyTarget > 0)

  if (loading || withTarget.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[var(--accent)]" />
          <span className="font-semibold text-sm text-[var(--text-primary)]">Target vs Sale</span>
          <span className="text-xs text-[var(--text-muted)] ml-1">this month</span>
        </div>
        <Link href="/targets" className="text-xs text-[var(--accent)] hover:underline">Manage targets</Link>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {withTarget.map(row => {
          const todayColor = pctColor(row.todayPct)
          const mtdColor = pctColor(row.mtdPct)
          return (
            <div key={row.branchId} className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{row.branchName}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">৳{formatCurrency(row.monthlyTarget)} target</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)] w-14 shrink-0">Today</span>
                  <ProgressBar pct={row.todayPct} color={todayColor} />
                  <span className="font-mono text-[var(--text-secondary)] w-24 text-right shrink-0">
                    ৳{formatCurrency(row.todaySale)} <span className={row.todayPct !== null ? (row.todayPct >= 100 ? 'text-[var(--success)]' : row.todayPct >= 70 ? 'text-amber-500' : 'text-[var(--danger)]') : 'text-[var(--text-muted)]'}>({pctText(row.todayPct)})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)] w-14 shrink-0">MTD</span>
                  <ProgressBar pct={row.mtdPct} color={mtdColor} />
                  <span className="font-mono text-[var(--text-secondary)] w-24 text-right shrink-0">
                    ৳{formatCurrency(row.mtdSale)} <span className={row.mtdPct !== null ? (row.mtdPct >= 100 ? 'text-[var(--success)]' : row.mtdPct >= 70 ? 'text-amber-500' : 'text-[var(--danger)]') : 'text-[var(--text-muted)]'}>({pctText(row.mtdPct)})</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
