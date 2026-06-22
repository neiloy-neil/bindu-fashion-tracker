'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { EmployeeModal } from '@/components/hr/EmployeeModal'
import { EmployeeProfileModal } from '@/components/hr/EmployeeProfileModal'
import { Button } from '@/components/ui/button'
import { Plus, User, Pencil, Trash2, Upload, Download } from 'lucide-react'
import { downloadEmployeeTemplate, parseEmployeeSheet } from '@/lib/hr/excel'

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empRes, branchRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch('/api/branches')
      ])
      
      if (!empRes.ok || !branchRes.ok) throw new Error('Failed to fetch data')
      
      const emps = await empRes.json()
      const brs = await branchRes.json()
      setEmployees(emps)
      setBranches(brs)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleExport = () => {
    downloadEmployeeTemplate(filteredEmployees, branches)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { rows, errors } = await parseEmployeeSheet(file)
      if (errors.length > 0) {
        toast.error(errors[0])
        return
      }

      // Upload parsed rows one by one (or batch if API supports, we will do one by one here for simplicity)
      toast.loading(`Importing ${rows.length} employees...`, { id: 'import' })
      
      let imported = 0
      for (const row of rows) {
        // find branch id
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
      fetchData()
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`, { id: 'import' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-display text-[var(--brand-blue)]">Employees</h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} className="mr-2" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button onClick={() => { setEditingEmployee(null); setIsModalOpen(true) }} className="bg-[var(--brand-orange)] hover:bg-orange-600">
            <Plus size={14} className="mr-2" /> Add Employee
          </Button>
        </div>
      </div>

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

      <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-[var(--nested-bg)] uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name & Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Basic Salary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No employees found.</td></tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-[var(--nested-bg)] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.designation || '—'}</div>
                    </td>
                    <td className="px-4 py-3">{emp.branch?.name || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{emp.basicSalary.toLocaleString()} ৳</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${emp.isActive ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' : 'bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]'}`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-[var(--brand-orange)]" onClick={() => { setViewingEmployee(emp); setIsProfileOpen(true) }}>
                        <User size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-[var(--brand-orange)]" onClick={() => { setEditingEmployee(emp); setIsModalOpen(true) }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--brand-red)] hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(emp)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        employee={editingEmployee}
        branches={branches}
        onSuccess={fetchData}
      />

      <EmployeeProfileModal 
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        employee={viewingEmployee}
        onEdit={() => { setIsProfileOpen(false); setEditingEmployee(viewingEmployee); setIsModalOpen(true) }}
      />
    </div>
  )
}
