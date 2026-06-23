'use client'

import { useEffect, useState } from 'react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📋 Immutable Audit Trail
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            Strict log of all creations, updates, and deletions across the financial system.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border)] mb-6 flex gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Action</label>
          <select 
            className="form-input form-select bg-[var(--bg-card)] text-sm py-1.5"
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
            className="form-input form-select bg-[var(--bg-card)] text-sm py-1.5"
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
      ) : (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--border)]/50 border-b border-[var(--border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th className="p-3 w-40">Timestamp</th>
                <th className="p-3 w-32">User</th>
                <th className="p-3 w-24">Action</th>
                <th className="p-3 w-32">Entity</th>
                <th className="p-3 w-48">Reason</th>
                <th className="p-3">Changes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    No audit logs found.
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--border)]/30 align-top text-sm">
                  <td className="p-3 text-[var(--text-secondary)] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{log.user.username}</div>
                    <div className="text-xs text-[var(--text-muted)]">{log.user.role}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      log.action === 'CREATE' ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                      log.action === 'UPDATE' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' :
                      'bg-[var(--danger)]/20 text-[var(--danger)]'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-[var(--accent-light)]">{log.entityType}</span>
                    <span className="text-[var(--text-muted)] ml-1">#{log.entityId}</span>
                  </td>
                  <td className="p-3">
                    <span className={log.reason ? 'text-white' : 'text-[var(--text-muted)] italic'}>
                      {log.reason || 'None provided'}
                    </span>
                  </td>
                  <td className="p-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button 
                className="btn btn-secondary py-1 px-3" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button 
                className="btn btn-secondary py-1 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
