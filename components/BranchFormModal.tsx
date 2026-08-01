'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const emptyForm = {
  name: '',
  code: '',
  type: 'RETAIL',
  address: '',
  contactPerson: '',
  phoneNumber: '',
  isActive: true,
  openingBalance: '',
  shiftStartTime: '09:00',
  shiftEndTime: '21:00',
  gracePeriodMins: '15',
  pettyCashTarget: '0',
  offDays: [] as number[],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch?: any | null  // null = create mode
  onSaved: () => void
}

export function BranchFormModal({ open, onOpenChange, branch, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEdit = !!branch

  useEffect(() => {
    if (open) {
      if (branch) {
        setForm({
          name: branch.name ?? '',
          code: branch.code ?? '',
          type: branch.type ?? 'RETAIL',
          address: branch.address ?? '',
          contactPerson: branch.contactPerson ?? '',
          phoneNumber: branch.phoneNumber ?? '',
          isActive: branch.isActive ?? true,
          openingBalance: branch.openingBalance != null ? String(branch.openingBalance) : '',
          shiftStartTime: branch.shiftStartTime || '09:00',
          shiftEndTime: branch.shiftEndTime || '21:00',
          gracePeriodMins: String(branch.gracePeriodMins ?? 15),
          pettyCashTarget: String(branch.pettyCashTarget ?? 0),
          offDays: branch.offDays ?? [],
        })
      } else {
        setForm(emptyForm)
      }
    }
  }, [open, branch])

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const toggleOffDay = (day: number) => {
    setForm(f => ({
      ...f,
      offDays: f.offDays.includes(day) ? f.offDays.filter(d => d !== day) : [...f.offDays, day],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Branch name is required'); return }
    const code = form.code.trim() || form.name.substring(0, 3).toUpperCase()
    setSaving(true)
    try {
      const url = isEdit ? `/api/branches/${branch.id}` : '/api/branches'
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      toast.success(`Branch ${isEdit ? 'updated' : 'added'}`)
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Name */}
          <div className="col-span-2 space-y-1.5">
            <Label>Branch Name *</Label>
            <Input
              value={form.name}
              onChange={e => {
                set('name', e.target.value)
                if (!isEdit && !form.code) set('code', e.target.value.substring(0, 3).toUpperCase())
              }}
              placeholder="e.g. Uttara Branch"
            />
          </div>

          {/* Code + Type */}
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. UTT"
              maxLength={10}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="FACTORY">Factory</option>
              <option value="HEAD_OFFICE">Head Office</option>
            </select>
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <Label>Contact Person</Label>
            <Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Manager name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="01XXXXXXXXX" />
          </div>

          {/* Address */}
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
          </div>

          {/* Opening Balance + Petty Cash */}
          <div className="space-y-1.5">
            <Label>Opening Balance (৳)</Label>
            <Input type="number" min="0" step="0.01" value={form.openingBalance}
              onChange={e => set('openingBalance', e.target.value)} placeholder="0" />
            <p className="text-xs text-[var(--text-muted)]">Starting cash on first entry.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Petty Cash Target (৳)</Label>
            <Input type="number" min="0" value={form.pettyCashTarget}
              onChange={e => set('pettyCashTarget', e.target.value)} placeholder="0" />
            <p className="text-xs text-[var(--text-muted)]">Set 0 to disable petty cash tracking.</p>
          </div>

          {/* Shift timing */}
          <div className="col-span-2">
            <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Clock size={14} className="text-[var(--accent)]" /> Shift Timing
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Opening</Label>
                  <Input type="time" value={form.shiftStartTime} onChange={e => set('shiftStartTime', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Closing</Label>
                  <Input type="time" value={form.shiftEndTime} onChange={e => set('shiftEndTime', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Grace (min)</Label>
                  <Input type="number" min="0" max="60" value={form.gracePeriodMins}
                    onChange={e => set('gracePeriodMins', e.target.value)} placeholder="15" />
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Check-ins after opening + grace are marked <strong>LATE</strong>.
              </p>
            </div>
          </div>

          {/* Weekly Off Days */}
          <div className="col-span-2 space-y-2">
            <Label>Weekly Off Days</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, i) => {
                const isOff = form.offDays.includes(i)
                return (
                  <button key={i} type="button" onClick={() => toggleOffDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isOff ? 'bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/30' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-strong)]'}`}>
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Selected days = branch is closed that day every week.</p>
          </div>

          {/* Active toggle */}
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Active</p>
              <p className="text-xs text-[var(--text-muted)]">Inactive branches are hidden from daily entry</p>
            </div>
            <button type="button" role="switch" aria-checked={form.isActive}
              onClick={() => set('isActive', !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Branch'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
