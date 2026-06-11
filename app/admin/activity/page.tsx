import RecentActivity from '@/components/dashboard/RecentActivity'

export default function ActivityPage() {
  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Recent Activity</h2>
        <p className="page-subtitle">Monitor End-of-Day (EOD) closures and system events</p>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: '800px' }}>
          <RecentActivity />
        </div>
      </div>
    </>
  )
}
