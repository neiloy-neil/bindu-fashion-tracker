'use client'

import { useEffect, useState } from 'react'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

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
      <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <BrandSpinner />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="text-sm font-bold mb-4">Recent EOD Closures & Activity</div>
      {activities.length === 0 ? (
        <div className="text-[13px] text-[var(--text-muted)]">No recent activity.</div>
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
