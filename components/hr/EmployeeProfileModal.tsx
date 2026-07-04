'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Phone, Calendar, Droplets, CreditCard, MapPin, UserCircle, Briefcase,
  Banknote, ExternalLink, Pencil, CheckCircle2, XCircle, AlertCircle, ArrowRight,
} from 'lucide-react'

const formatTaka = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(amount)

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700',
]

function avatarColor(id: number) { return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length] }
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function Field({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon size={14} className="mt-0.5 text-muted-foreground shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words text-foreground">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase border-b border-border pb-1">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  )
}

interface Props {
  employee: {
    id: number
    name: string
    employeeId?: string | null
    designation?: string | null
    branch?: { name: string } | null
    isActive: boolean
    oldIdCard?: string | null
    basicSalary: number
    conveyance: number
    yearlyLeaveAllowance: number
    joiningDate?: string | null
    dateOfBirth?: string | null
    bloodGroup?: string | null
    mobileNumber?: string | null
    nidNumber?: string | null
    address?: string | null
    emergencyContact?: string | null
    photoUrl?: string | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

type AttSummary = { presentDays: number; absentDays: number; lateDays: number; leaveDays: number }
type Transfer = { id: number; fromBranch: { name: string }; toBranch: { name: string }; transferDate: string; reason?: string | null }

export function EmployeeProfileModal({ employee, open, onOpenChange, onEdit }: Props) {
  const [attSummary, setAttSummary] = useState<AttSummary | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [attLoading, setAttLoading] = useState(false)

  useEffect(() => {
    if (!open || !employee) { setAttSummary(null); setTransfers([]); return }
    setAttLoading(true)
    const month = format(new Date(), 'yyyy-MM')
    fetch(`/api/hr/attendance/employee/${employee.id}?month=${month}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setAttSummary(data.summary)
          setTransfers(data.transfers || [])
        }
      })
      .catch(() => {})
      .finally(() => setAttLoading(false))
  }, [open, employee?.id])

  if (!employee) return null

  const branchName = employee.branch?.name ?? '—'
  const currentMonth = format(new Date(), 'MMMM')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">Employee Profile</DialogTitle>
        </DialogHeader>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${avatarColor(employee.id)}`}>
            {getInitials(employee.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground truncate">{employee.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">{employee.employeeId}</Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0">{branchName}</Badge>
              <Badge variant={employee.isActive ? 'default' : 'secondary'}
                className={`text-xs px-1.5 py-0 ${employee.isActive ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] border-[var(--status-success-text)]' : 'bg-[var(--status-draft-bg)] text-[var(--status-draft-text)] hover:bg-[var(--status-draft-bg)] border-[var(--status-draft-text)]'}`}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-5 pt-1">
          {/* Attendance summary for this month */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase border-b border-border pb-1">
              Attendance — {currentMonth}
            </p>
            {attLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : attSummary ? (
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-green-50 border border-green-100 p-2 text-center">
                  <CheckCircle2 size={14} className="text-green-600 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-green-700 tabular-nums">{attSummary.presentDays}</p>
                  <p className="text-[10px] text-green-600">Present</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-2 text-center">
                  <XCircle size={14} className="text-red-500 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-red-600 tabular-nums">{attSummary.absentDays}</p>
                  <p className="text-[10px] text-red-500">Absent</p>
                </div>
                <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2 text-center">
                  <AlertCircle size={14} className="text-yellow-600 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-yellow-600 tabular-nums">{attSummary.lateDays}</p>
                  <p className="text-[10px] text-yellow-600">Late</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 text-center">
                  <Calendar size={14} className="text-blue-500 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-blue-600 tabular-nums">{attSummary.leaveDays}</p>
                  <p className="text-[10px] text-blue-500">Leave</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1">No attendance data this month</p>
            )}
          </div>

          <Section title="Role & Tenure">
            <Field label="Designation" value={employee.designation} icon={Briefcase} />
            <Field label="Branch" value={branchName} icon={UserCircle} />
            <Field label="Joining Date" value={employee.joiningDate} icon={Calendar} />
            {employee.oldIdCard && <Field label="Old ID Card" value={employee.oldIdCard} icon={CreditCard} />}
          </Section>

          <Section title="Compensation">
            <div className="flex items-start gap-2.5">
              <Banknote size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Basic Salary</p>
                <p className="text-sm font-medium text-foreground">{formatTaka(employee.basicSalary)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Banknote size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Conveyance</p>
                <p className="text-sm font-medium text-foreground">{formatTaka(employee.conveyance)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Yearly Leave</p>
                <p className="text-sm font-medium text-foreground">{employee.yearlyLeaveAllowance} days</p>
              </div>
            </div>
          </Section>

          <Section title="Personal">
            <Field label="Date of Birth" value={employee.dateOfBirth} icon={Calendar} />
            <Field label="Blood Group" value={employee.bloodGroup} icon={Droplets} />
            <Field label="Mobile Number" value={employee.mobileNumber} icon={Phone} />
            <Field label="NID Number" value={employee.nidNumber} icon={CreditCard} />
          </Section>

          {(employee.address || employee.emergencyContact) && (
            <Section title="Contact">
              {employee.address && (
                <div className="col-span-2 flex items-start gap-2.5">
                  <MapPin size={14} className="mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium text-foreground">{employee.address}</p>
                  </div>
                </div>
              )}
              <Field label="Emergency Contact" value={employee.emergencyContact} icon={Phone} />
            </Section>
          )}

          {/* Transfer history */}
          {transfers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase border-b border-border pb-1">Transfer History</p>
              <div className="space-y-1.5">
                {transfers.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs bg-[var(--surface-raised)] rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">{t.fromBranch.name}</span>
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{t.toBranch.name}</span>
                    <span className="ml-auto text-muted-foreground shrink-0">
                      {format(new Date(t.transferDate), 'dd MMM yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {employee.photoUrl && (
            <Section title="Documents">
              <div className="col-span-2">
                <a href={employee.photoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-orange)] hover:underline">
                  <ExternalLink size={13} /> View Passport Photo
                </a>
              </div>
            </Section>
          )}
        </div>

        {onEdit && (
          <div className="pt-4 border-t border-border flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit() }} className="gap-1.5">
              <Pencil size={14} /> Edit Employee
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
