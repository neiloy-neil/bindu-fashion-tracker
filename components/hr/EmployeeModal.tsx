'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

type EditableEmployee = {
  id: number
  employeeId?: string | null
  name?: string | null
  branchId?: number | null
  designation?: string | null
  basicSalary?: number | null
  conveyance?: number | null
  yearlyLeaveAllowance?: number | null
  mobileNumber?: string | null
  dateOfBirth?: string | null
  joiningDate?: string | null
  address?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  nidNumber?: string | null
  oldIdCard?: string | null
  isActive?: boolean | null
  photoUrl?: string | null
}

type EmployeeFormData = {
  employeeId: string
  name: string
  branchId: string
  designation: string
  basicSalary: number | string
  conveyance: number | string
  yearlyLeaveAllowance: number | string
  mobileNumber: string
  dateOfBirth: string
  joiningDate: string
  address: string
  emergencyContact: string
  bloodGroup: string
  nidNumber: string
  oldIdCard: string
  isActive: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: EditableEmployee | null
  branches: { id: number; name: string }[]
  onSuccess: () => void
}

function createInitialFormData(employee: EditableEmployee | null): EmployeeFormData {
  return {
    employeeId: employee?.employeeId || '',
    name: employee?.name || '',
    branchId: employee?.branchId ? String(employee.branchId) : '',
    designation: employee?.designation || '',
    basicSalary: employee?.basicSalary || 0,
    conveyance: employee?.conveyance || 1500,
    yearlyLeaveAllowance: employee?.yearlyLeaveAllowance || 12,
    mobileNumber: employee?.mobileNumber || '',
    dateOfBirth: employee?.dateOfBirth || '',
    joiningDate: employee?.joiningDate || '',
    address: employee?.address || '',
    emergencyContact: employee?.emergencyContact || '',
    bloodGroup: employee?.bloodGroup || '',
    nidNumber: employee?.nidNumber || '',
    oldIdCard: employee?.oldIdCard || '',
    isActive: employee?.isActive ?? true,
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function EmployeeModalForm({
  employee,
  branches,
  onOpenChange,
  onSuccess,
}: Omit<Props, 'open'>) {
  const [tab, setTab] = useState<'basic' | 'hr' | 'transfer'>('basic')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<EmployeeFormData>(() => createInitialFormData(employee))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  
  const [transferBranchId, setTransferBranchId] = useState<string>('')
  const [transferReason, setTransferReason] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

  const handleChange = <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.employeeId) {
      toast.error('Name and Employee ID are required')
      return
    }

    setSaving(true)
    try {
      let photoUrl = employee?.photoUrl || null
      
      const payload = {
        ...formData,
        basicSalary: Number(formData.basicSalary),
        conveyance: Number(formData.conveyance),
        yearlyLeaveAllowance: Number(formData.yearlyLeaveAllowance),
      }

      let res
      if (employee) {
        res = await fetch(`/api/hr/employees/${employee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save employee')
      }

      const savedEmp = await res.json()

      // Handle photo upload
      if (photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)

        const uploadRes = await fetch('/api/upload?bucket=employees', {
          method: 'POST',
          body: formData
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(`Photo upload failed: ${err.message || err.error}`)
        }

        const { url } = await uploadRes.json()
        photoUrl = url

        // update employee with photo url
        await fetch(`/api/hr/employees/${savedEmp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl })
        })
      }

      toast.success(employee ? 'Employee updated' : 'Employee created')
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save employee'))
    } finally {
      setSaving(false)
    }
  }

  const handleTransfer = async () => {
    if (!employee) return
    if (!transferBranchId) {
      toast.error('Please select a destination branch')
      return
    }

    setTransferring(true)
    try {
      const res = await fetch(`/api/hr/employees/${employee.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toBranchId: transferBranchId,
          reason: transferReason
        })
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to transfer employee')
      }

      toast.success('Employee transferred successfully')
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to transfer employee'))
    } finally {
      setTransferring(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
      </DialogHeader>

      <div className="flex gap-2 border-b border-border mb-4">
        <button
          className={`pb-2 px-1 text-sm font-medium ${tab === 'basic' ? 'border-b-2 border-[var(--brand-orange)] text-[var(--brand-orange)]' : 'text-muted-foreground'}`}
          onClick={() => setTab('basic')}
        >
          Basic Info
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium ${tab === 'hr' ? 'border-b-2 border-[var(--brand-orange)] text-[var(--brand-orange)]' : 'text-muted-foreground'}`}
          onClick={() => setTab('hr')}
        >
          HR Details
        </button>
        {employee && (
          <button
            className={`pb-2 px-1 text-sm font-medium ${tab === 'transfer' ? 'border-b-2 border-[var(--brand-orange)] text-[var(--brand-orange)]' : 'text-muted-foreground'}`}
            onClick={() => setTab('transfer')}
          >
            Transfer
          </button>
        )}
      </div>

      <div className="space-y-4">
        {tab === 'basic' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employee ID *</Label>
              <Input value={formData.employeeId} onChange={e => handleChange('employeeId', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={formData.branchId} onValueChange={v => handleChange('branchId', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input value={formData.designation} onChange={e => handleChange('designation', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Basic Salary (৳)</Label>
              <Input type="number" value={formData.basicSalary} onChange={e => handleChange('basicSalary', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Conveyance (৳)</Label>
              <Input type="number" value={formData.conveyance} onChange={e => handleChange('conveyance', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Yearly Leave Allowance</Label>
              <Input type="number" value={formData.yearlyLeaveAllowance} onChange={e => handleChange('yearlyLeaveAllowance', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(v) => handleChange('isActive', !!v)} />
              <Label htmlFor="isActive" className="cursor-pointer">Active Employee</Label>
            </div>
          </div>
        )}

        {tab === 'hr' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>NID Number</Label>
              <Input value={formData.nidNumber} onChange={e => handleChange('nidNumber', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Input value={formData.bloodGroup} onChange={e => handleChange('bloodGroup', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dateOfBirth} onChange={e => handleChange('dateOfBirth', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input type="date" value={formData.joiningDate} onChange={e => handleChange('joiningDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input value={formData.mobileNumber} onChange={e => handleChange('mobileNumber', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input value={formData.emergencyContact} onChange={e => handleChange('emergencyContact', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => handleChange('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Old ID Card Number</Label>
              <Input value={formData.oldIdCard} onChange={e => handleChange('oldIdCard', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Photo Upload</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        )}

        {tab === 'transfer' && employee && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded p-4 text-sm">
              Transferring this employee will update their current branch and create a historical transfer record.
            </div>
            <div className="space-y-1.5">
              <Label>Destination Branch *</Label>
              <Select value={transferBranchId} onValueChange={setTransferBranchId}>
                <SelectTrigger><SelectValue placeholder="Select Destination Branch" /></SelectTrigger>
                <SelectContent>
                  {branches.filter(b => b.id !== employee.branchId).map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Transfer</Label>
              <Input value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder="Optional note about this transfer" />
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || transferring}>Cancel</Button>
        {tab === 'transfer' ? (
          <Button onClick={handleTransfer} disabled={transferring} className="bg-[var(--brand-orange)] hover:bg-orange-600 text-white">
            {transferring ? 'Transferring...' : 'Transfer Employee'}
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="bg-[var(--brand-orange)] hover:bg-orange-600 text-white">
            {saving ? 'Saving...' : 'Save Employee'}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  )
}

export function EmployeeModal({ open, onOpenChange, employee, branches, onSuccess }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <EmployeeModalForm
          key={`${employee?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
          employee={employee}
          branches={branches}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  )
}
