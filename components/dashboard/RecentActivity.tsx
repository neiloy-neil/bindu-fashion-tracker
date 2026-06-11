'use client'

import { useEffect, useState } from 'react'

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
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>Recent EOD Closures & Activity</div>
      {activities.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent activity.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activities.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8, paddingRight: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: a.type === 'ENTRY_SUBMITTED' ? '#10b981' : '#f59e0b'
              }} />
              <div style={{ flex: 1, color: 'var(--text-primary)' }}>{a.message}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                {new Date(a.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
