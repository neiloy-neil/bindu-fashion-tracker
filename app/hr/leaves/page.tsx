'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, X, Clock, Search, Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { LeaveModal } from '@/components/hr/LeaveModal'

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userBranchId, setUserBranchId] = useState<number | null>(null)

  useEffect(() => {
    fetchLeavesAndSession()
  }, [])

  const fetchLeavesAndSession = async () => {
    try {
      const [res, sessionRes] = await Promise.all([
        fetch('/api/hr/leaves'),
        fetch('/api/auth/session')
      ])
      if (res.ok) {
        setLeaves(await res.json())
      }
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        if (session?.user?.role) setUserRole(session.user.role)
        if (session?.user?.branchId) setUserBranchId(session.user.branchId)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/hr/leaves')
      if (res.ok) {
        setLeaves(await res.json())
      }
    } catch (e) {}
  }

  const updateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/hr/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Leave ${status.toLowerCase()} successfully`)
      fetchLeaves()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filteredLeaves = leaves.filter(l => statusFilter === 'all' || l.status === statusFilter)

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Leave Requests</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage employee absences and leave approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {(userRole === 'BRANCH' || userRole === 'ADMIN' || userRole === 'HR_ADMIN') && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Leave
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 min-h-0">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Requests Directory
            </h3>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border)] hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">Dates</TableHead>
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
                      <span className="text-sm text-[var(--text-muted)]">Loading leave requests...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLeaves.length === 0 ? (
                <TableRow className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                        <Filter className="w-5 h-5 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm font-medium text-[var(--text-muted)]">No leave requests found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map(leave => (
                  <TableRow key={leave.id} className="border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                    <TableCell className="font-medium text-[var(--text-primary)]">{leave.employee.name}</TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{leave.employee.branch?.name || 'HQ'}</TableCell>
                    <TableCell>
                      <Badge variant={leave.type === 'UNPAID' ? 'destructive' : 'secondary'}>
                        {leave.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {leave.status === 'PENDING' && <Clock className="w-4 h-4 text-[var(--warning)]" />}
                        {leave.status === 'APPROVED' && <Check className="w-4 h-4 text-[var(--success)]" />}
                        {leave.status === 'REJECTED' && <X className="w-4 h-4 text-[var(--danger)]" />}
                        <span className={`font-medium ${leave.status === 'PENDING' ? 'text-[var(--warning)]' : leave.status === 'APPROVED' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          {leave.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success-subtle)]" onClick={() => updateStatus(leave.id, 'APPROVED')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]" onClick={() => updateStatus(leave.id, 'REJECTED')}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">
                          by {leave.approvedBy?.username || 'System'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>

      <LeaveModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchLeaves}
        userRole={userRole}
        userBranchId={userBranchId}
      />
    </>
  )
}
