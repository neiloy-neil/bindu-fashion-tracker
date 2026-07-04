'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Check, RefreshCw, Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EmployeeSheetRow } from '@/lib/hr/excel'

type RowStatus = 'new' | 'update' | 'error'

type PreviewRow = EmployeeSheetRow & {
  _status: RowStatus
  _errors: string[]
}

interface Props {
  rows: EmployeeSheetRow[]
  existingEmployeeIds: Set<string>
  branches: { id: number; name: string }[]
  onConfirm: (rows: EmployeeSheetRow[]) => Promise<void>
  onCancel: () => void
}

function annotateRows(rows: EmployeeSheetRow[], existingIds: Set<string>): PreviewRow[] {
  return rows.map(row => {
    const errors: string[] = []
    if (!row.employeeId) errors.push('Missing Employee ID')
    if (!row.name) errors.push('Missing Name')
    if (!row.designation) errors.push('Missing Designation')
    if (!row.branch) errors.push('Missing Branch')
    if (row.basicSalary <= 0) errors.push('Invalid Salary')

    const status: RowStatus = errors.length > 0
      ? 'error'
      : existingIds.has(row.employeeId)
        ? 'update'
        : 'new'

    return { ...row, _status: status, _errors: errors }
  })
}

export function ImportPreviewModal({ rows, existingEmployeeIds, branches, onConfirm, onCancel }: Props) {
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setPreview(annotateRows(rows, existingEmployeeIds))
  }, [rows, existingEmployeeIds])

  const newCount = preview.filter(r => r._status === 'new').length
  const updateCount = preview.filter(r => r._status === 'update').length
  const errorCount = preview.filter(r => r._status === 'error').length
  const validRows = preview.filter(r => r._status !== 'error')

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }
    setImporting(true)
    try {
      await onConfirm(validRows)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-4xl max-h-[85vh] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Import Preview</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{rows.length} rows detected from file</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[var(--success-subtle)] text-[var(--success)] text-xs font-semibold">{newCount} new</span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--info-subtle)] text-[var(--info)] text-xs font-semibold">{updateCount} update</span>
            {errorCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--danger-subtle)] text-[var(--danger)] text-xs font-semibold flex items-center gap-1">
                <AlertCircle size={10} /> {errorCount} error
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] z-10">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                <th className="text-left py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">ID</th>
                <th className="text-left py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Name</th>
                <th className="text-left py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Designation</th>
                <th className="text-left py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Branch</th>
                <th className="text-right py-3 pr-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Basic</th>
                <th className="text-right py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Leave / Conv.</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[var(--border)]/50 ${row._status === 'error' ? 'bg-[var(--danger-subtle)]/30' : ''}`}
                >
                  <td className="py-2 pr-3">
                    {row._status === 'new' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--success-subtle)] text-[var(--success)] text-[11px] font-semibold">New</span>
                    )}
                    {row._status === 'update' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--info-subtle)] text-[var(--info)] text-[11px] font-semibold">Update</span>
                    )}
                    {row._status === 'error' && (
                      <span className="text-[11px] text-[var(--danger)]" title={row._errors.join(', ')}>
                        ⚠ {row._errors[0]}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-[var(--text-muted)]">{row.employeeId || '—'}</td>
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{row.name || '—'}</td>
                  <td className="py-2 pr-3 text-xs text-[var(--text-secondary)]">{row.designation || '—'}</td>
                  <td className="py-2 pr-3 text-xs text-[var(--text-secondary)]">{row.branch || '—'}</td>
                  <td className="py-2 pr-3 text-right font-medium text-[var(--text-primary)]">
                    ৳{row.basicSalary.toLocaleString('en-BD')}
                  </td>
                  <td className="py-2 text-right text-xs text-[var(--text-muted)]">
                    {row.yearlyLeaveAllowance}d / ৳{row.conveyance.toLocaleString('en-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <Button variant="outline" onClick={onCancel} disabled={importing}>
            <Upload size={14} className="mr-2" /> Change File
          </Button>
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <p className="text-xs text-[var(--text-muted)]">{errorCount} rows will be skipped</p>
            )}
            <Button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="gap-2"
            >
              {importing
                ? <><RefreshCw size={14} className="animate-spin" /> Importing…</>
                : <><Check size={14} /> Import {validRows.length} employees</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
