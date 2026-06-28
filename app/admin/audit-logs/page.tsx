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



  const renderJsonViewer = (dataStr: string | null) => {
    if (!dataStr) return <span className="text-[var(--text-muted)]">-</span>
    try {
      const parsed = JSON.parse(dataStr)
      return (
        <div className="bg-[var(--bg-card)] p-2 rounded text-xs text-[var(--accent-light)] max-h-32 overflow-y-auto whitespace-pre-wrap font-mono border border-[var(--border)]">
          {JSON.stringify(parsed, null, 2)}
        </div>
      )
    } catch {
      return <span>{dataStr}</span>
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none flex items-center gap-2">
            📋 Immutable Audit Trail
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Strict log of all creations, updates, and deletions across the financial system.
          </p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6 min-h-0 flex flex-col overflow-auto">

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
                  <TableCell>
                    {log.action === 'UPDATE' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-[var(--danger)] mb-1 font-bold">Old Values</div>
                          {renderJsonViewer(log.oldValues)}
                        </div>
                        <div>
                          <div className="text-xs text-[var(--success)] mb-1 font-bold">New Values</div>
                          {renderJsonViewer(log.newValues)}
                        </div>
                      </div>
                    ) : log.action === 'CREATE' ? (
                      <div>
                        <div className="text-xs text-[var(--success)] mb-1 font-bold">Initial Snapshot</div>
                        {renderJsonViewer(log.newValues)}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-[var(--danger)] mb-1 font-bold">Final Snapshot</div>
                        {renderJsonViewer(log.oldValues)}
                      </div>
                    )}
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
