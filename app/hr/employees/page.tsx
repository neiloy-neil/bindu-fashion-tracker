'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { EmployeeModal } from '@/components/hr/EmployeeModal'
import { EmployeeProfileModal } from '@/components/hr/EmployeeProfileModal'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, User, Pencil, Trash2, Upload, Download, ArrowRightLeft } from 'lucide-react'
import { downloadEmployeeTemplate, parseEmployeeSheet } from '@/lib/hr/excel'
import type { EmployeeSheetRow } from '@/lib/hr/excel'
import { ImportPreviewModal } from '@/components/hr/ImportPreviewModal'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'ADMIN' | 'HR_ADMIN' | 'AUDITOR' | 'BRANCH' | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortValue, setSortValue] = useState('name_asc')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferringEmployee, setTransferringEmployee] = useState<any | null>(null)
  const [transferTargetBranch, setTransferTargetBranch] = useState<string>('')
  const [transferReason, setTransferReason] = useState<string>('')
  const [isTransferring, setIsTransferring] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Import preview state
  const [previewRows, setPreviewRows] = useState<EmployeeSheetRow[] | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      try {
        const [empRes, branchRes, sessionRes] = await Promise.all([
          fetch('/api/hr/employees'),
          fetch('/api/branches'),
          fetch('/api/auth/session')
        ])
        
        if (!empRes.ok || !branchRes.ok) throw new Error('Failed to fetch data')
        
        const emps = await empRes.json()
        const brs = await branchRes.json()
        const session = sessionRes.ok ? await sessionRes.json() : null

        if (!cancelled) {
          setEmployees(emps)
          setBranches(brs)
          if (session?.user?.role) {
            setUserRole(session.user.role)
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [reloadNonce])

  // Derived state
  const activeCount = employees.filter(e => e.isActive).length
  const inactiveCount = employees.length - activeCount

  const filteredEmployees = useMemo(() => {
    let filtered = employees

    if (statusFilter === 'active') filtered = filtered.filter(e => e.isActive)
    else if (statusFilter === 'inactive') filtered = filtered.filter(e => !e.isActive)

    if (branchFilter !== 'all') {
      filtered = filtered.filter(e => String(e.branchId) === branchFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(q) || 
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.mobileNumber && e.mobileNumber.includes(q))
      )
    }

    filtered.sort((a, b) => {
      if (sortValue === 'name_asc') return a.name.localeCompare(b.name)
      if (sortValue === 'name_desc') return b.name.localeCompare(a.name)
      if (sortValue === 'salary_desc') return b.basicSalary - a.basicSalary
      if (sortValue === 'salary_asc') return a.basicSalary - b.basicSalary
      return 0
    })

    return filtered
  }, [employees, search, branchFilter, statusFilter, sortValue])

  const handleDelete = async (emp: any) => {
    if (!confirm(`Are you sure you want to deactivate ${emp.name}?`)) return
    
    try {
      const res = await fetch(`/api/hr/employees/${emp.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to deactivate')
      }
      toast.success('Employee deactivated')
      setReloadNonce((value) => value + 1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleTransfer = async () => {
    if (!transferringEmployee || !transferTargetBranch) return
    setIsTransferring(true)
    try {
      const res = await fetch(`/api/hr/employees/${transferringEmployee.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toBranchId: parseInt(transferTargetBranch), reason: transferReason })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to transfer')
      }
      toast.success('Employee transferred successfully')
      setIsTransferOpen(false)
      setReloadNonce((value) => value + 1)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsTransferring(false)
    }
  }

  const handleExport = () => {
    void downloadEmployeeTemplate(filteredEmployees, branches)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    try {
      const { rows, errors } = await parseEmployeeSheet(file)
      if (errors.length > 0) {
        toast.error(errors[0])
        return
      }
      setPreviewRows(rows)
    } catch (err: any) {
      toast.error(`Failed to read file: ${err.message}`)
    }
  }

  const handleConfirmImport = async (validRows: EmployeeSheetRow[]) => {
    toast.loading(`Importing ${validRows.length} employees...`, { id: 'import' })
    let imported = 0
    try {
      for (const row of validRows) {
        const branchMatch = branches.find(b => b.name.toLowerCase() === row.branch.toLowerCase())
        const payload = {
          employeeId: row.employeeId,
          name: row.name,
          branchId: branchMatch?.id ? String(branchMatch.id) : null,
          designation: row.designation,
          basicSalary: row.basicSalary,
          conveyance: row.conveyance,
          yearlyLeaveAllowance: row.yearlyLeaveAllowance,
          mobileNumber: row.mobileNumber,
          dateOfBirth: row.dateOfBirth,
          joiningDate: row.joiningDate,
          address: row.address,
          emergencyContact: row.emergencyContact,
          bloodGroup: row.bloodGroup,
          nidNumber: row.nidNumber,
          oldIdCard: row.oldIdCard,
          photoUrl: row.photoUrl,
          isActive: true
        }
        await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        imported++
      }
      toast.success(`Imported ${imported} employees`, { id: 'import' })
      setPreviewRows(null)
      setReloadNonce((value) => value + 1)
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`, { id: 'import' })
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Employees</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{filteredEmployees.length} total employees</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} className="mr-2" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button onClick={() => { setEditingEmployee(null); setIsModalOpen(true) }}>
            <Plus size={14} className="mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 min-h-0">

      <SearchFilter 
        search={search}
        onSearchChange={setSearch}
        branches={branches}
        branchFilter={branchFilter}
        onBranchChange={setBranchFilter}
        showBranchFilter={true}
        statusOptions={[
          { label: 'All', value: 'all', count: employees.length },
          { label: 'Active', value: 'active', count: activeCount },
          { label: 'Inactive', value: 'inactive', count: inactiveCount },
        ]}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortOptions={[
          { label: 'Name (A-Z)', value: 'name_asc' },
          { label: 'Name (Z-A)', value: 'name_desc' },
          { label: 'Salary (High to Low)', value: 'salary_desc' },
          { label: 'Salary (Low to High)', value: 'salary_asc' },
        ]}
        sortValue={sortValue}
        onSortChange={setSortValue}
        resultCount={filteredEmployees.length}
        resultLabel="employees"
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Employee Directory
          </h3>
        </div>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">ID</TableHead>
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Name & Role</TableHead>
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
              {userRole !== 'BRANCH' && (
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Basic Salary</TableHead>
              )}
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center h-64 gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                    <span className="text-sm text-[var(--text-muted)]">Loading…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">No employees found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map(emp => (
                <TableRow key={emp.id} className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                  <TableCell className="font-mono text-xs text-[var(--text-primary)]">{emp.employeeId}</TableCell>
                  <TableCell>
                    <Link
                      href={`/hr/employees/${emp.id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline transition-colors"
                    >
                      {emp.name}
                    </Link>
                    <div className="text-xs text-[var(--text-muted)]">{emp.designation || '—'}</div>
                  </TableCell>
                  <TableCell className="text-[var(--text-primary)]">{emp.branch?.name || '—'}</TableCell>
                  {userRole !== 'BRANCH' && (
                    <TableCell className="text-right font-medium text-[var(--text-primary)]">
                      ৳{emp.basicSalary.toLocaleString()}
                    </TableCell>
                  )}
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${emp.isActive ? 'bg-[var(--success-subtle)] text-[var(--success)]' : 'bg-[var(--danger-subtle)] text-[var(--danger)]'}`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info-subtle)]" onClick={() => { setViewingEmployee(emp); setIsProfileOpen(true) }}>
                      <User size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]" onClick={() => { 
                      setTransferringEmployee(emp); 
                      setTransferTargetBranch('');
                      setTransferReason('');
                      setIsTransferOpen(true);
                    }}>
                      <ArrowRightLeft size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]" onClick={() => { setEditingEmployee(emp); setIsModalOpen(true) }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]" onClick={() => handleDelete(emp)}>
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <EmployeeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        employee={editingEmployee}
        branches={branches}
        onSuccess={() => setReloadNonce(n => n + 1)}
        userRole={userRole}
      />

      <EmployeeProfileModal 
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        employee={viewingEmployee}
        onEdit={() => { setIsProfileOpen(false); setEditingEmployee(viewingEmployee); setIsModalOpen(true) }}
      />

      {previewRows && (
        <ImportPreviewModal
          rows={previewRows}
          existingEmployeeIds={new Set(employees.map((e: any) => e.employeeId).filter(Boolean))}
          branches={branches}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewRows(null)}
        />
      )}

      {isTransferOpen && transferringEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Transfer Employee</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{transferringEmployee.name}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm bg-muted/30 p-3 rounded-md mb-2">
                <span className="text-muted-foreground">Current Branch</span>
                <span className="font-medium">{transferringEmployee.branch?.name || 'Unassigned'}</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Destination Branch</label>
                <select 
                  className="w-full text-sm bg-background border border-border rounded-md p-2"
                  value={transferTargetBranch}
                  onChange={e => setTransferTargetBranch(e.target.value)}
                >
                  <option value="" disabled>Select a branch</option>
                  {branches.filter(b => b.id !== transferringEmployee.branchId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason (Optional)</label>
                <textarea 
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Reason for transfer..."
                  className="w-full text-sm bg-background border border-border rounded-md p-2 min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleTransfer} disabled={isTransferring || !transferTargetBranch}>
                  {isTransferring ? 'Transferring...' : 'Transfer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
