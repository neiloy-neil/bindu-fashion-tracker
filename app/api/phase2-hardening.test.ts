import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockEditRequestCreate,
  mockEditRequestFindUnique,
  mockEditRequestUpdate,
  mockDailyEntryFindFirst,
  mockDailyEntryFindUnique,
  mockDailyEntryUpdate,
  mockTransaction,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockEditRequestCreate: vi.fn(),
  mockEditRequestFindUnique: vi.fn(),
  mockEditRequestUpdate: vi.fn(),
  mockDailyEntryFindFirst: vi.fn(),
  mockDailyEntryFindUnique: vi.fn(),
  mockDailyEntryUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockLogAudit: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    editRequest: {
      create: mockEditRequestCreate,
      findUnique: mockEditRequestFindUnique,
      update: mockEditRequestUpdate,
    },
    dailyEntry: {
      findFirst: mockDailyEntryFindFirst,
      findUnique: mockDailyEntryFindUnique,
      update: mockDailyEntryUpdate,
    },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  logAudit: mockLogAudit,
}))

vi.mock('@/lib/schemas', async () => await import('../../lib/schemas'))

import { PATCH as patchEditRequest, POST as createEditRequest } from './edit-requests/route'
import { POST as createPayment } from './payments/route'
import { POST as createTransfer } from './transfers/route'
import { POST as createAdvanceSalary } from './advance-salaries/route'

describe('phase 2 hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (operations: unknown[]) => Promise.all(operations))
  })

  it('ignores client-supplied requester ids and uses the authenticated branch user', async () => {
    mockDailyEntryFindFirst.mockResolvedValue({ id: 12 })
    mockEditRequestCreate.mockResolvedValue({ id: 5, requestedById: 44 })

    const request = new NextRequest('http://localhost/api/edit-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'BRANCH',
        'x-user-id': '44',
        'x-user-branch-id': '3',
      },
      body: JSON.stringify({
        entryId: 12,
        requestedById: 999,
        changes: { items: [{ categoryId: 7, amount: 150 }] },
        reason: 'Cash count correction',
      }),
    })

    const response = await createEditRequest(request)

    expect(response.status).toBe(201)
    expect(mockEditRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryId: 12,
        requestedById: 44,
      }),
    })
  })

  it('rejects arbitrary edit request change payloads', async () => {
    const request = new NextRequest('http://localhost/api/edit-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'BRANCH',
        'x-user-id': '44',
        'x-user-branch-id': '3',
      },
      body: JSON.stringify({
        entryId: 12,
        changes: { branchId: 999 },
        reason: 'malicious',
      }),
    })

    const response = await createEditRequest(request)

    expect(response.status).toBe(400)
    expect(mockEditRequestCreate).not.toHaveBeenCalled()
  })

  it('only applies whitelisted edit request changes during approval', async () => {
    mockEditRequestFindUnique.mockResolvedValue({
      id: 8,
      entryId: 12,
      status: 'PENDING',
      reason: 'Fix item amount',
      changes: JSON.stringify({
        items: [{ categoryId: 7, amount: 150 }],
        notes: 'Adjusted after recount',
      }),
      entry: {
        id: 12,
        notes: 'old',
        items: [{ categoryId: 7, amount: 100 }],
      },
    })
    mockDailyEntryUpdate.mockResolvedValue({ id: 12, notes: 'Adjusted after recount', items: [{ categoryId: 7, amount: 150 }] })
    mockEditRequestUpdate.mockResolvedValue({ id: 8, status: 'APPROVED' })

    const request = new NextRequest('http://localhost/api/edit-requests', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'ADMIN',
        'x-user-id': '1',
      },
      body: JSON.stringify({ requestId: 8, status: 'APPROVED' }),
    })

    const response = await patchEditRequest(request)

    expect(response.status).toBe(200)
    expect(mockDailyEntryUpdate).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        notes: 'Adjusted after recount',
        items: {
          upsert: [
            {
              where: { entryId_categoryId: { entryId: 12, categoryId: 7 } },
              update: { amount: 150 },
              create: { categoryId: 7, amount: 150 },
            },
          ],
        },
      },
      include: { items: true },
    })
    expect(mockLogAudit).toHaveBeenCalled()
  })

  it('rejects invalid direct payment payloads before writing data', async () => {
    const request = new NextRequest('http://localhost/api/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({
        partyId: 1,
        method: 'CHEQUE',
        amount: -10,
      }),
    })

    const response = await createPayment(request)

    expect(response.status).toBe(400)
    expect(mockDailyEntryFindUnique).not.toHaveBeenCalled()
  })

  it('rejects invalid transfer payloads before touching the database', async () => {
    const request = new NextRequest('http://localhost/api/transfers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({
        dailyEntryId: 'abc',
        accountId: 2,
        amount: 0,
      }),
    })

    const response = await createTransfer(request)

    expect(response.status).toBe(400)
    expect(mockDailyEntryFindUnique).not.toHaveBeenCalled()
  })

  it('rejects invalid advance salary payloads before touching the database', async () => {
    const request = new NextRequest('http://localhost/api/advance-salaries', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({
        dailyEntryId: 10,
        employeeId: 3,
        type: 'PRODUCT',
        amount: 20,
      }),
    })

    const response = await createAdvanceSalary(request)

    expect(response.status).toBe(400)
    expect(mockDailyEntryFindUnique).not.toHaveBeenCalled()
  })
})
