import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockDailyEntryFindFirst } = vi.hoisted(() => ({
  mockDailyEntryFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyEntry: {
      findFirst: mockDailyEntryFindFirst,
    },
  },
}))

vi.mock('@/lib/new-entry', async () => await import('../../lib/new-entry'))

import { GET as getBranchLastBalance } from './branches/[id]/last-balance/route'

describe('phase 4 hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests for branch last balance', async () => {
    const request = new NextRequest('http://localhost/api/branches/5/last-balance?date=2026-06-27')

    const response = await getBranchLastBalance(request, { params: Promise.resolve({ id: '5' }) })

    expect(response.status).toBe(401)
    expect(mockDailyEntryFindFirst).not.toHaveBeenCalled()
  })

  it('prevents branch users from querying another branch balance', async () => {
    const request = new NextRequest('http://localhost/api/branches/5/last-balance?date=2026-06-27', {
      headers: {
        'x-user-role': 'BRANCH',
        'x-user-branch-id': '9',
      },
    })

    const response = await getBranchLastBalance(request, { params: Promise.resolve({ id: '5' }) })

    expect(response.status).toBe(403)
    expect(mockDailyEntryFindFirst).not.toHaveBeenCalled()
  })
})
