'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Branch } from '@/lib/types'
import { BrandSpinner } from '@/components/ui/BrandSpinner'

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => { setBranches(d); setLoading(false) })
  }, [])

  const BRANCH_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#a78bfa',
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Branches</h2>
          <p className="page-subtitle">{branches.length} active branches</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: 12 }}>
            <BrandSpinner />
            <span style={{ color: 'var(--text-secondary)' }}>Loading…</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {branches.map((branch, i) => (
              <div key={branch.id} className="card" style={{ borderTop: `3px solid ${BRANCH_COLORS[i % BRANCH_COLORS.length]}` }}>
                <div style={{
                  width: 40, height: 40,
                  background: `${BRANCH_COLORS[i % BRANCH_COLORS.length]}22`,
                  border: `1px solid ${BRANCH_COLORS[i % BRANCH_COLORS.length]}44`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                  color: BRANCH_COLORS[i % BRANCH_COLORS.length],
                  marginBottom: 12,
                }}>
                  {branch.name.charAt(0)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{branch.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1 }}>
                  {branch.code}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {branch.isActive ? (
                    <span className="badge badge-green">● Active</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>● Inactive</span>
                  )}
                  <Link href={`/?branchId=${branch.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                    Dashboard →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
