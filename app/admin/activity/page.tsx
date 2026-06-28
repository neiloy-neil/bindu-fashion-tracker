import RecentActivity from '@/components/dashboard/RecentActivity'

export default function ActivityPage() {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">Recent Activity</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Monitor End-of-Day (EOD) closures and system events</p>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="max-w-[800px]">
          <RecentActivity />
        </div>
      </div>
    </>
  )
}
