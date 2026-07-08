'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Lock, Unlock } from 'lucide-react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function LockedMonthsPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [locked, setLocked] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [submitting, setSubmitting] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/locked-months').then(r => r.json()),
    ]).then(([branchData, lockData]) => {
      setBranches(branchData.branches ?? branchData ?? [])
      setLocked(lockData.locked ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const isLocked = (branchId: number, year: number, month: number) =>
    locked.some(l => l.branchId === branchId && l.year === year && l.month === month)

  const handleLock = async () => {
    if (!selectedBranch) return toast.error('Select a branch')
    setSubmitting(true)
    try {
      const res = await fetch('/api/locked-months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: parseInt(selectedBranch), year: selectedYear, month: selectedMonth }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.message ?? data.error ?? 'Failed to lock')
      const refreshed = await fetch('/api/locked-months').then(r => r.json())
      setLocked(refreshed.locked ?? [])
      toast.success('Month locked')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlock = async (branchId: number, year: number, month: number) => {
    const res = await fetch('/api/locked-months', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, year, month }),
    })
    if (!res.ok) return toast.error('Failed to unlock')
    setLocked(prev => prev.filter(l => !(l.branchId === branchId && l.year === year && l.month === month)))
    toast.success('Month unlocked')
  }

  if (loading) return <div className="flex justify-center py-20"><BrandSpinner /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Lock Months</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Locked months prevent BRANCH users from creating or editing entries for that period.
          SUPER_ADMIN can still make changes.
        </p>
      </div>

      {/* Lock form */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-medium text-[var(--text-primary)]">Lock a month</h2>
        <div className="grid grid-cols-3 gap-3">
          <select
            className="col-span-3 sm:col-span-1 border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
          >
            <option value="">Select branch…</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            className="border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] text-[var(--text-primary)] text-sm"
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleLock}
          disabled={submitting || !selectedBranch}
          className="flex items-center gap-2"
        >
          <Lock size={14} />
          {submitting ? 'Locking…' : 'Lock Month'}
        </Button>
      </div>

      {/* Locked list */}
      <div className="space-y-2">
        <h2 className="font-medium text-[var(--text-primary)]">Currently locked</h2>
        {locked.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4">No months are locked.</p>
        ) : (
          <div className="space-y-2">
            {locked.map(l => (
              <div key={l.id} className="flex items-center justify-between bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-[var(--text-primary)] text-sm">{l.branch?.name}</span>
                  <span className="text-[var(--text-secondary)] text-sm ml-2">
                    {MONTH_NAMES[l.month - 1]} {l.year}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs ml-2">
                    by {l.lockedBy?.username}
                  </span>
                </div>
                <button
                  onClick={() => handleUnlock(l.branchId, l.year, l.month)}
                  className="flex items-center gap-1 text-xs text-[var(--danger)] hover:opacity-80 transition-opacity"
                >
                  <Unlock size={12} />
                  Unlock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
