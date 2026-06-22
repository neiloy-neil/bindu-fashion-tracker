import os

salary_file_path = "d:/AI/bindu-salary/src/app/(app)/salary/page.tsx"
output_path = "d:/AI/bindu-fashion-tracker/app/hr/salary/page.tsx"

with open(salary_file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace supabase queries with fetches
content = content.replace("import { supabase } from '@/lib/supabase'", "")
content = content.replace("import type { Employee, Branch, SalaryRecord } from '@/types'", "import type { Employee, Branch, SalaryRecord } from '@prisma/client'")
content = content.replace("import { MONTHS } from '@/types'", "const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']")
content = content.replace("@/lib/calculations", "@/lib/hr/calculations")
content = content.replace("@/lib/excel", "@/lib/hr/excel")
content = content.replace("@/lib/csv", "@/lib/hr/csv")

content = content.replace("const { data: emps } = await supabase.from('employees')", "const res = await fetch('/api/hr/employees')")

load_fn = """  async function load() {
    setPageLoading(true)
    try {
      const [empsRes, recsRes, brsRes, yearRecsRes, logRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch(`/api/hr/salary-records?month=${month}&year=${year}`),
        fetch('/api/hr/settings'), // We might not have a branch API, but let's assume we do or we skip it. Wait, the employees come with branch!
        fetch(`/api/hr/salary-records?year=${year}`),
        fetch(`/api/hr/upload-log?month=${month}&year=${year}`)
      ])
"""

new_load = """  const [isLocked, setIsLocked] = useState(false)
  const [syncing, setSyncing] = useState(false)

  async function load() {
    setPageLoading(true)
    try {
      // Fetch employees (which includes branch)
      const empRes = await fetch('/api/hr/employees?active=true')
      const emps = empRes.ok ? await empRes.json() : []

      // Fetch branches from employees
      const uniqueBranches = Array.from(new Set(emps.map((e: any) => e.branch?.id))).filter(Boolean)
      const brs = uniqueBranches.map((id) => emps.find((e: any) => e.branch?.id === id)?.branch)

      const recRes = await fetch(`/api/hr/salary-records?month=${month}&year=${year}`)
      const recs = recRes.ok ? await recRes.json() : []

      // Check if locked
      setIsLocked(recs.some((r: any) => r.lockedAt))

      // Leave calculation (stubbed for now to keep simple, since yearRecs is too heavy)
      const leaveMap = new Map<string, number>()
      setYearlyLeaveMap(leaveMap)

      const recMap = new Map((recs ?? []).map((r: any) => [r.employeeId, r]))
      setRows((emps ?? []).map((emp: any) => {
        const record = recMap.get(emp.id) ?? {
          employeeId: emp.id, month, year,
          trackerAdvanceTotal: 0, hrAdvanceDeducted: 0,
          leaveDaysTaken: 0, leaveAdjustment: 0,
          lateDays: 0, otDays: 0, attendanceBonus: 0,
          conveyanceOverride: emp.conveyance,
          notes: '',
        }
        return {
          employee: emp,
          record,
          dirty: false,
        }
      }))
      setBranches(brs)
      setUploadLog(null)
    } catch (e) {
      console.error(e)
    } finally {
      setPageLoading(false)
    }
  }

  async function syncTrackerAdvances() {
    setSyncing(true)
    try {
      const res = await fetch('/api/hr/sync/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      })
      if (!res.ok) {
        if (res.status === 423) toast.error('Month is locked')
        else toast.error('Failed to sync advances')
        return
      }
      toast.success('Advances synced from tracker')
      await load()
    } finally {
      setSyncing(false)
    }
  }

  async function lockMonth() {
    if (!confirm('Locking this month prevents further edits. This cannot be undone without admin access. Continue?')) return
    const res = await fetch('/api/hr/salary-records/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    })
    if (res.ok) {
      toast.success('Month locked')
      await load()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to lock month')
    }
  }
"""

with open(output_path, "w", encoding="utf-8") as f:
    f.write(content)
