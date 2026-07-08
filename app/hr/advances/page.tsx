'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import useSWR from 'swr'
import { DollarSign, User } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Advance = {
  id: number
  type: string
  amount: number | null
  note: string | null
  productDescription: string | null
  createdAt: string
  employee: { id: number; name: string; employeeId: string; designation: string }
  dailyEntry: { date: string; branch: { id: number; name: string } }
}

type Summary = { employee: { id: number; name: string; employeeId: string; designation: string }; total: number; count: number }

export default function AdvancesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [empSearch, setEmpSearch] = useState('')
  const [view, setView] = useState<'list' | 'summary'>('summary')

  const url = `/api/hr/advances?month=${month}&year=${year}`
  const { data, isLoading } = useSWR<{ advances: Advance[]; summary: Summary[]; total: number }>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const advances = data?.advances ?? []
  const summary = data?.summary ?? []
  const total = data?.total ?? 0

  const filteredSummary = empSearch
    ? summary.filter(s => s.employee.name.toLowerCase().includes(empSearch.toLowerCase()) || s.employee.employeeId.toLowerCase().includes(empSearch.toLowerCase()))
    : summary

  const filteredList = empSearch
    ? advances.filter(a => a.employee.name.toLowerCase().includes(empSearch.toLowerCase()) || a.employee.employeeId.toLowerCase().includes(empSearch.toLowerCase()))
    : advances

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Advance Salary</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {MONTHS[month - 1]} {year} · {summary.length} employee{summary.length !== 1 ? 's' : ''} · {formatCurrency(total)} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search employee…"
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            className="h-9 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <select
            value={month}
            onChange={e => setMonth(+e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(+e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
            {(['summary', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${view === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)]'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-5 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">Loading…</span>
          </div>
        ) : view === 'summary' ? (
          filteredSummary.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-sm">No advance records for this period.</div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4 font-medium">Employee</th>
                      <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Designation</th>
                      <th className="text-center py-3 px-4 font-medium">Count</th>
                      <th className="text-right py-3 px-4 font-medium">Total Advance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.map(({ employee: emp, total: empTotal, count }) => (
                      <tr
                        key={emp.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                        onClick={() => { setEmpSearch(emp.name); setView('list') }}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{emp.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{emp.employeeId}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{emp.designation}</td>
                        <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-[var(--danger)]">{formatCurrency(empTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--surface-raised)] border-t-2 border-[var(--border)]">
                      <td colSpan={2} className="py-3 px-4 font-semibold text-[var(--text-primary)] hidden md:table-cell">Total</td>
                      <td colSpan={2} className="py-3 px-4 text-right font-bold text-[var(--danger)] md:hidden">Total: {formatCurrency(total)}</td>
                      <td className="py-3 px-4 text-center font-semibold text-[var(--text-secondary)] hidden md:table-cell">{advances.length}</td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--danger)] hidden md:table-cell">{formatCurrency(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        ) : (
          filteredList.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-sm">No advance records found.</div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Employee</th>
                      <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Branch</th>
                      <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map(a => (
                      <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(a.dailyEntry.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{a.employee.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{a.employee.employeeId}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)] hidden md:table-cell">{a.dailyEntry.branch.name}</td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.type === 'CASH' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[var(--danger)]">
                          {formatCurrency(a.amount ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)] text-xs hidden lg:table-cell max-w-[180px] truncate">
                          {a.note || a.productDescription || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </>
  )
}
