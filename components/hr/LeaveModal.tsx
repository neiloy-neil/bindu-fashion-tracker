'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userRole?: string | null
  userBranchId?: number | null
}

export function LeaveModal({ open, onOpenChange, onSuccess, userRole, userBranchId }: Props) {
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: ''
  })

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        try {
          const url = userRole === 'BRANCH' && userBranchId 
            ? `/api/hr/employees?active=true&branchId=${userBranchId}`
            : '/api/hr/employees?active=true'
            
          const res = await fetch(url)
          if (res.ok) {
            setEmployees(await res.json())
          }
        } catch (err) {}
      }
      fetchEmployees()
    }
  }, [open, userRole, userBranchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: Number(formData.employeeId),
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason || undefined
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add leave')
      }

      toast.success('Leave added successfully')
      onSuccess()
      onOpenChange(false)
      setFormData({
        employeeId: '',
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: ''
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={formData.employeeId} onValueChange={v => setFormData(p => ({ ...p, employeeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={String(emp.id)}>{emp.name} ({emp.branch?.name || 'HQ'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leave Type *</Label>
            <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASUAL">Casual</SelectItem>
                <SelectItem value="SICK">Sick</SelectItem>
                <SelectItem value="ANNUAL">Annual</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="MARRIAGE">Marriage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" required value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" required value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (Optional)</Label>
            <Input value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Leave'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
