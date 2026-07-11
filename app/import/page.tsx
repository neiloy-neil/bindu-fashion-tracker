'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Download, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportPreviewModal } from '@/components/hr/ImportPreviewModal'
import { ImportPartyModal } from '@/components/parties/ImportPartyModal'
import { downloadEmployeeTemplate, parseEmployeeSheet } from '@/lib/hr/excel'
import type { EmployeeSheetRow } from '@/lib/hr/excel'

export default function ImportPage() {
  const empFileRef = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<EmployeeSheetRow[] | null>(null)
  const [isPartyImportOpen, setIsPartyImportOpen] = useState(false)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    fetch('/api/branches').then(r => r.ok ? r.json() : []).then(setBranches).catch(() => {})
  }, [])

  const handleEmployeeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (empFileRef.current) empFileRef.current.value = ''
    try {
      const { rows, errors } = await parseEmployeeSheet(file)
      if (errors.length > 0) {
        errors.forEach(e => toast.error(e))
        return
      }
      setPreviewRows(rows)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to parse file')
    }
  }

  const handleConfirmImport = async (validRows: EmployeeSheetRow[]) => {
    toast.loading(`Importing ${validRows.length} employees…`, { id: 'emp-import' })
    let imported = 0
    try {
      for (const row of validRows) {
        await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.name,
            employeeId: row.employeeId,
            designation: row.designation,
            department: row.department,
            phone: row.phone,
            joiningDate: row.joiningDate,
            salary: row.salary,
            branchId: row.branchId,
          }),
        })
        imported++
      }
      toast.success(`Imported ${imported} employees`, { id: 'emp-import' })
      setPreviewRows(null)
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`, { id: 'emp-import' })
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Import Data</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Bulk upload employees and parties from Excel sheets</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">
        {/* Employee Import */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Users size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Employees</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Upload an Excel sheet to bulk-create or update employee records.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => downloadEmployeeTemplate([])}>
                  <Download size={14} className="mr-1.5" /> Download Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => empFileRef.current?.click()}>
                  <Upload size={14} className="mr-1.5" /> Import Excel
                </Button>
                <input
                  type="file"
                  ref={empFileRef}
                  className="hidden"
                  accept=".xlsx"
                  onChange={handleEmployeeFile}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Party Import */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Parties</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Upload an Excel sheet to bulk-create supplier and customer party records.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/parties/import/template" download>
                    <Download size={14} className="mr-1.5" /> Download Template
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsPartyImportOpen(true)}>
                  <Upload size={14} className="mr-1.5" /> Import Excel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewRows && (
        <ImportPreviewModal
          rows={previewRows}
          existingEmployeeIds={new Set()}
          branches={branches}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewRows(null)}
        />
      )}

      <ImportPartyModal
        isOpen={isPartyImportOpen}
        onClose={() => setIsPartyImportOpen(false)}
        onSuccess={() => {}}
      />
    </>
  )
}
