'use client'

import { useState, useEffect } from 'react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type AuditLog = {
  id: number
  userId: number
  action: string
  entityType: string
  entityId: number
  oldValues: string | null
  newValues: string | null
  reason: string | null
  createdAt: string
  user: {
    id: number
    username: string
    role: string
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchLogs = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '50',
        })
        if (filterAction) params.set('action', filterAction)
        if (filterEntity) params.set('entityType', filterEntity)

        const res = await fetch(`/api/admin/audit-logs?${params}`)
        const data = await res.json()

        if (!cancelled && data.logs) {
          setLogs(data.logs)
          setTotalPages(Math.ceil(data.total / data.limit))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchLogs()

    return () => {
      cancelled = true
    }
  }, [page, filterAction, filterEntity])



  const SKIP_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'receiptUrl', 'receiptUrls', 'eodChecklist', 'attachmentUrl'])

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'number') {
      if (key.toLowerCase().includes('cash') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('amount')) {
        return `৳${val.toLocaleString('en-BD')}`
      }
      return String(val)
    }
    if (typeof val === 'string') {
      // ISO date
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
        return new Date(val).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })
      }
      return val
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '(empty)'
      // permissions array
      if (val[0] && typeof val[0] === 'object' && 'feature' in (val[0] as object)) {
        return (val as Array<{ feature: string; granted: boolean }>)
          .map(p => `${p.feature}: ${p.granted ? '✓' : '✗'}`)
          .join(', ')
      }
      return `${val.length} item${val.length !== 1 ? 's' : ''}`
    }
    return JSON.stringify(val)
  }

  const camelToLabel = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())

  const renderFields = (dataStr: string | null, highlightKeys?: Set<string>) => {
    if (!dataStr) return <span className="text-[var(--text-muted)] text-xs">—</span>
    try {
      const obj = JSON.parse(dataStr) as Record<string, unknown>
      const entries = Object.entries(obj).filter(([k]) => !SKIP_FIELDS.has(k))
      if (entries.length === 0) return <span className="text-[var(--text-muted)] text-xs">No data</span>
      return (
        <div className="space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className={`flex gap-1.5 text-xs rounded px-1 py-0.5 ${highlightKeys?.has(k) ? 'bg-[var(--warning)]/10' : ''}`}>
              <span className="text-[var(--text-muted)] shrink-0 min-w-[90px]">{camelToLabel(k)}:</span>
              <span className="text-[var(--text-primary)] font-medium break-all">{formatValue(k, v)}</span>
            </div>
          ))}
        </div>
      )
    } catch {
      return <span className="text-xs text-[var(--text-muted)]">{dataStr}</span>
    }
  }

  const renderDiff = (oldStr: string | null, newStr: string | null) => {
    if (!oldStr && !newStr) return <span className="text-[var(--text-muted)] text-xs">—</span>
    try {
      const oldObj = oldStr ? JSON.parse(oldStr) as Record<string, unknown> : {}
      const newObj = newStr ? JSON.parse(newStr) as Record<string, unknown> : {}
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)].filter(k => !SKIP_FIELDS.has(k)))
      const changedKeys = Array.from(allKeys).filter(k => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))

      if (changedKeys.length === 0) return <span className="text-[var(--text-muted)] text-xs italic">No field changes detected</span>

      return (
        <div className="space-y-1.5">
          {changedKeys.map(k => (
            <div key={k} className="text-xs rounded-lg border border-[var(--border)] overflow-hidden">
              <div className="px-2 py-0.5 bg-[var(--surface-raised)] text-[var(--text-muted)] font-semibold text-[10px] uppercase tracking-wide">
                {camelToLabel(k)}
              </div>
              <div className="flex divide-x divide-[var(--border)]">
                <div className="flex-1 px-2 py-1 bg-[var(--danger)]/5">
                  <span className="text-[var(--danger)] text-[10px] font-bold block mb-0.5">Before</span>
                  <span className="text-[var(--text-primary)] break-all">{formatValue(k, oldObj[k])}</span>
                </div>
                <div className="flex-1 px-2 py-1 bg-[var(--success)]/5">
                  <span className="text-[var(--success)] text-[10px] font-bold block mb-0.5">After</span>
                  <span className="text-[var(--text-primary)] break-all">{formatValue(k, newObj[k])}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    } catch {
      return <span className="text-xs text-[var(--text-muted)]">Could not parse changes</span>
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            📋 Immutable Audit Trail
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Strict log of all creations, updates, and deletions across the financial system.
          </p>
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] flex gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Action</label>
          <select 
            className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Entity</label>
          <select 
            className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            value={filterEntity}
            onChange={e => { setFilterEntity(e.target.value); setPage(1); }}
          >
            <option value="">All Entities</option>
            <option value="DailyEntry">DailyEntry</option>
            <option value="Payment">Payment</option>
            <option value="ExpenseEntry">ExpenseEntry</option>
            <option value="Transfer">Transfer</option>
            <option value="AdvanceSalary">AdvanceSalary</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <BrandSpinner />
        </div>
      ) : <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <Table>
            <TableHeader className="bg-[var(--surface-raised)] border-b border-[var(--border)]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-40">Timestamp</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-32">User</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-24">Action</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-32">Entity</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide w-48">Reason</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : logs.map((log: AuditLog) => (
                <TableRow key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors align-top">
                  <TableCell className="text-[var(--text-secondary)] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[var(--text-primary)]">{log.user.username}</div>
                    <div className="text-xs text-[var(--text-muted)]">{log.user.role}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                      log.action === 'CREATE' ? 'bg-[var(--success-subtle)]/30 text-[var(--success)]' :
                      log.action === 'UPDATE' ? 'bg-[var(--info-subtle)]/30 text-[var(--info)]' :
                      'bg-[var(--danger-subtle)]/30 text-[var(--danger)]'
                    }`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[var(--info)]">{log.entityType}</span>
                    <span className="text-[var(--text-muted)] ml-1">#{log.entityId}</span>
                  </TableCell>
                  <TableCell>
                    <span className={log.reason ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] italic'}>
                      {log.reason || 'None provided'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {log.action === 'UPDATE'
                        ? renderDiff(log.oldValues, log.newValues)
                        : log.action === 'CREATE'
                        ? renderFields(log.newValues)
                        : renderFields(log.oldValues)
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p: number) => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p: number) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      }
    </div>
    </>
  )
}
