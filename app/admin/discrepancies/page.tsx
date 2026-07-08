'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'

type DiscrepancyEntry = {
  id: number
  date: string
  branch: { id: number; name: string }
  actualPhysicalCash: number | null
  expectedNetBalance: number | null
  cashDifferenceNote: string | null
}

export default function DiscrepanciesPage() {
  const [entries, setEntries] = useState<DiscrepancyEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/discrepancies')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 md:p-8">Loading discrepancies...</div>

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="text-amber-500 w-8 h-8" />
        <h1 className="text-2xl font-bold">Discrepancy Inbox</h1>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Flagged Entries</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Entries where actual physical cash does not match system calculated balance, or a manual variance note was provided.
            </p>
          </div>
          <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium border border-amber-500/30">
            {entries.length} Issues
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--border)] mb-4">
              <FileText className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg">No discrepancies found.</p>
            <p className="text-sm mt-1">All branch cash registers match system expectations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--border)]/50 border-b border-[var(--border)] text-[var(--text-muted)] text-sm">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Branch</th>
                  <th className="p-4 font-medium text-right">System Balance</th>
                  <th className="p-4 font-medium text-right">Actual Cash</th>
                  <th className="p-4 font-medium text-right">Variance</th>
                  <th className="p-4 font-medium w-1/3">Note provided</th>
                  <th className="p-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {entries.map(entry => {
                  const expected = entry.expectedNetBalance ?? 0
                  const actual = entry.actualPhysicalCash ?? 0
                  const variance = actual - expected
                  
                  return (
                    <tr key={entry.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="p-4 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="p-4 font-medium text-[var(--text-primary)]">{entry.branch.name}</td>
                      <td className="p-4 text-right">{formatCurrency(expected)}</td>
                      <td className="p-4 text-right font-medium">{formatCurrency(actual)}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${variance < 0 ? 'bg-red-500/20 text-red-600' : variance > 0 ? 'bg-green-500/20 text-green-700' : 'text-[var(--text-muted)]'}`}>
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)] italic">
                        {entry.cashDifferenceNote || <span className="opacity-50">No note provided</span>}
                      </td>
                      <td className="p-4 text-center">
                        <Link href={`/entries?date=${entry.date.split('T')[0]}&branchId=${entry.branch.id}`} className="text-sm bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-primary)] px-3 py-1.5 rounded transition-colors">
                          View Entry
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
