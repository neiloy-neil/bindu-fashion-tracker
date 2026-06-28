'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type Activity = {
  id: string
  type: string
  branchName: string
  date: string
  message: string
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recent-activity')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setActivities(d)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Recent EOD Closures & Activity</div>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)]">No recent activity.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 text-[13px] border-b border-[var(--border)] pb-2 pr-2 last:border-0 last:pb-0">
              <div 
                className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'ENTRY_SUBMITTED' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
              />
              <div className="flex-1 text-[var(--text-primary)]">{a.message}</div>
              <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                {new Date(a.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
