import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetServerSession,
  mockTransferFindUnique,
  mockTransferFindUniqueOrThrow,
  mockTransferUpdateMany,
  mockDailyEntryUpsert,
  mockTransaction,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockTransferFindUnique: vi.fn(),
  mockTransferFindUniqueOrThrow: vi.fn(),
  mockTransferUpdateMany: vi.fn(),
  mockDailyEntryUpsert: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

vi.mock('@/lib/new-entry', async () => await import('../../lib/new-entry'))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transfer: {
      findUnique: mockTransferFindUnique,
    },
    $transaction: mockTransaction,
  },
}))

import { PATCH as acknowledgeTransfer } from './transfers/[id]/acknowledge/route'

describe('phase 3 hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      transfer: {
        updateMany: mockTransferUpdateMany,
        findUnique: mockTransferFindUnique,
        findUniqueOrThrow: mockTransferFindUniqueOrThrow,
      },
      dailyEntry: {
        upsert: mockDailyEntryUpsert,
      },
    }))
  })

  it('returns 409 when a reject action loses the pending-state claim race', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1', role: 'ADMIN', branchId: null } })
    mockTransferFindUnique
      .mockResolvedValueOnce({ id: 8, status: 'PENDING', account: { type: 'BRANCH', branchId: 2 } })
      .mockResolvedValueOnce({ id: 8, status: 'ACKNOWLEDGED' })
    mockTransferUpdateMany.mockResolvedValue({ count: 0 })

    const request = new NextRequest('http://localhost/api/transfers/8/acknowledge', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'REJECT', rejectionReason: 'Duplicate' }),
    })

    const response = await acknowledgeTransfer(request, { params: Promise.resolve({ id: '8' }) })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Transfer is already ACKNOWLEDGED' })
  })

  it('uses an upserted receiving entry and guarded update when acknowledging', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1', role: 'ADMIN', branchId: null } })
    mockTransferFindUnique.mockResolvedValue({ id: 8, status: 'PENDING', account: { type: 'BRANCH', branchId: 2 } })
    mockDailyEntryUpsert.mockResolvedValue({ id: 22 })
    mockTransferUpdateMany.mockResolvedValue({ count: 1 })
    mockTransferFindUniqueOrThrow.mockResolvedValue({ id: 8, status: 'ACKNOWLEDGED', receivingEntryId: 22 })

    const request = new NextRequest('http://localhost/api/transfers/8/acknowledge', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'ACKNOWLEDGE' }),
    })

    const response = await acknowledgeTransfer(request, { params: Promise.resolve({ id: '8' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockDailyEntryUpsert).toHaveBeenCalled()
    expect(mockTransferUpdateMany).toHaveBeenCalledWith({
      where: { id: 8, status: 'PENDING' },
      data: expect.objectContaining({
        status: 'ACKNOWLEDGED',
        receivingEntryId: 22,
      }),
    })
    expect(body).toMatchObject({ id: 8, status: 'ACKNOWLEDGED', receivingEntryId: 22 })
  })
})
