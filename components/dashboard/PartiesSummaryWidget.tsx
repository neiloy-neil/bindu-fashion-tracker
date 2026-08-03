'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInCalendarDays } from 'date-fns'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function daysDiff(date: string) {
  return differenceInCalendarDays(new Date(date), new Date())
}

function DueChip({ days }: { days: number }) {
  if (days < 0) return <span className="text-[10px] font-semibold text-[var(--danger)]">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-[10px] font-semibold text-amber-500">Due today</span>
  if (days <= 3) return <span className="text-[10px] font-semibold text-amber-500">Due in {days}d</span>
  return <span className="text-[10px] text-[var(--text-muted)]">Due in {days}d</span>
}

// ── Add Reminder Modal ─────────────────────────────────────────────────────────
function AddReminderModal({ parties, onClose, onSaved }: { parties: any[]; onClose: () => void; onSaved: () => void }) {
  const [partyId, setPartyId] = useState('')
  const [committedDate, setCommittedDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!partyId || !committedDate) { toast.error('Party and date are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, committedDate, note }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success('Reminder set')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Set Payment Reminder</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Party *</label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select party…</option>
              {parties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Payment Committed Date *</label>
            <input
              type="date"
              value={committedDate}
              onChange={e => setCommittedDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Partial payment of ৳10,000 committed"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Widget ────────────────────────────────────────────────────────────────
type Tab = 'reminders' | 'cheques' | 'payments'

export function PartiesSummaryWidget() {
  const [tab, setTab] = useState<Tab>('reminders')
  const [showAdd, setShowAdd] = useState(false)

  const { data: summary } = useSWR('/api/dashboard/parties', fetcher, { revalidateOnFocus: false })
  const { data: reminders, mutate: mutateReminders } = useSWR('/api/payment-reminders', fetcher, { revalidateOnFocus: false })
  const { data: cheques } = useSWR('/api/cheques?status=PENDING&limit=8', fetcher, { revalidateOnFocus: false })
  const { data: payments } = useSWR('/api/payments?approvalStatus=PENDING&limit=8', fetcher, { revalidateOnFocus: false })
  const { data: partiesData } = useSWR('/api/parties', fetcher, { revalidateOnFocus: false })

  const reminderList: any[] = Array.isArray(reminders) ? reminders : []
  const chequeList: any[] = Array.isArray(cheques) ? cheques : []
  const paymentList: any[] = Array.isArray(payments) ? payments : []
  const partiesList: any[] = Array.isArray(partiesData) ? partiesData : []

  const markDone = async (id: number) => {
    await fetch(`/api/payment-reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    toast.success('Marked as done')
    mutateReminders()
  }

  const tabs: { key: Tab; label: string; count: number | null }[] = [
    { key: 'reminders', label: 'Payment Reminders', count: reminderList.length },
    { key: 'cheques',   label: 'Cheques Due',       count: chequeList.length },
    { key: 'payments',  label: 'Pending Payments',  count: paymentList.length },
  ]

  const methodLabel: Record<string, string> = {
    CASH: 'Cash', CHEQUE: 'Cheque', BKASH: 'bKash', NAGAD: 'Nagad', BANK_TRANSFER: 'Bank',
  }

  return (
    <>
      {showAdd && partiesList.length > 0 && (
        <AddReminderModal
          parties={partiesList}
          onClose={() => setShowAdd(false)}
          onSaved={() => mutateReminders()}
        />
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Parties & Payments</h3>
          <Link href="/parties" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold tabular-nums text-[var(--danger)]">৳{formatCurrency(summary?.totalOutstanding ?? 0)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{summary?.withDue ?? 0} parties</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Paid this month</p>
            <p className="text-lg font-bold tabular-nums text-[var(--success)]">৳{formatCurrency(summary?.monthPayments ?? 0)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Approved</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Pending approval</p>
            <p className={`text-lg font-bold tabular-nums ${(summary?.pendingPayments ?? 0) > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {summary?.pendingPayments ?? 0}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Payments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-[var(--border)] bg-[var(--surface-raised)]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
              {(t.count ?? 0) > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--border)] text-[var(--text-muted)]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
          {tab === 'reminders' && (
            <button
              onClick={() => setShowAdd(true)}
              className="ml-auto mr-3 text-[10px] font-semibold text-[var(--accent)] hover:underline"
            >
              + Add
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="divide-y divide-[var(--border)]">

          {/* Payment Reminders */}
          {tab === 'reminders' && (
            reminderList.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[var(--text-muted)] text-center">No pending reminders</p>
            ) : reminderList.map((r: any) => {
              const days = daysDiff(r.committedDate)
              const isOverdue = days < 0
              return (
                <div key={r.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors ${isOverdue ? 'bg-[var(--danger)]/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/parties/${r.party.id}`} className="text-sm font-semibold text-[var(--text-primary)] hover:underline truncate">
                        {r.party.name}
                      </Link>
                      <DueChip days={days} />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {format(new Date(r.committedDate), 'dd MMM yyyy')} · by {r.committedBy.username}
                    </p>
                    {r.note && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 italic truncate">{r.note}</p>}
                  </div>
                  <button
                    onClick={() => markDone(r.id)}
                    className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              )
            })
          )}

          {/* Cheques Due */}
          {tab === 'cheques' && (
            chequeList.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[var(--text-muted)] text-center">No pending cheques</p>
            ) : chequeList.slice(0, 8).sort((a: any, b: any) =>
              new Date(a.withdrawDate).getTime() - new Date(b.withdrawDate).getTime()
            ).map((c: any) => {
              const days = daysDiff(c.withdrawDate)
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.payment?.party?.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {c.payment?.dailyEntry?.branch?.name ?? 'Unknown'} · {format(new Date(c.withdrawDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">৳{formatCurrency(c.payment?.amount ?? 0)}</p>
                    <DueChip days={days} />
                  </div>
                </div>
              )
            })
          )}

          {/* Pending Payments */}
          {tab === 'payments' && (
            paymentList.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[var(--text-muted)] text-center">No pending payments</p>
            ) : paymentList.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.party?.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {p.dailyEntry?.branch?.name ?? 'Unknown'} · {methodLabel[p.method] ?? p.method}
                    {' · '}{format(new Date(p.createdAt), 'dd MMM')}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-[var(--danger)] shrink-0 ml-3">৳{formatCurrency(p.amount)}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-raised)]">
          <Link href="/admin/cheques" className="text-[11px] text-[var(--accent)] hover:underline mr-4">All cheques →</Link>
          <Link href="/parties" className="text-[11px] text-[var(--accent)] hover:underline">All parties →</Link>
        </div>
      </div>
    </>
  )
}
