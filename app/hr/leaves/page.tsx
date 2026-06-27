'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, X, Clock, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/hr/leaves')
      if (res.ok) {
        setLeaves(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-slate-500">Manage employee absences and leave approvals</p>
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
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading leave requests...</td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No leave requests found.</td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{leave.employee.name}</td>
                    <td className="px-4 py-3 text-slate-600">{leave.employee.branch?.name || 'HQ'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={leave.type === 'UNPAID' ? 'destructive' : 'secondary'}>
                        {leave.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {leave.status === 'PENDING' && <Clock className="w-4 h-4 text-amber-500" />}
                        {leave.status === 'APPROVED' && <Check className="w-4 h-4 text-emerald-500" />}
                        {leave.status === 'REJECTED' && <X className="w-4 h-4 text-red-500" />}
                        <span className={`font-medium ${leave.status === 'PENDING' ? 'text-amber-600' : leave.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {leave.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => updateStatus(leave.id, 'APPROVED')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateStatus(leave.id, 'REJECTED')}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          by {leave.approvedBy?.username || 'System'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
