import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetServerSession,
  mockLedgerAccountFindMany,
  mockLedgerAccountUpdate,
  mockBranchFindMany,
  mockEmployeeFindUnique,
  mockEmployeeFindFirst,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockLedgerAccountFindMany: vi.fn(),
  mockLedgerAccountUpdate: vi.fn(),
  mockBranchFindMany: vi.fn(),
  mockEmployeeFindUnique: vi.fn(),
  mockEmployeeFindFirst: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ledgerAccount: {
      findMany: mockLedgerAccountFindMany,
      update: mockLedgerAccountUpdate,
    },
    branch: {
      findMany: mockBranchFindMany,
    },
    employee: {
      findUnique: mockEmployeeFindUnique,
      findFirst: mockEmployeeFindFirst,
    },
  },
}))

import { POST as runBackfill } from './run-backfill/route'
import { GET as getEmployee } from './hr/employees/[id]/route'

describe('phase 1 hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks unauthenticated backfill requests', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await runBackfill()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('allows admins to run the ledger backfill', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'ADMIN' } })
    mockLedgerAccountFindMany.mockResolvedValue([{ id: 10, name: 'Banani', branchId: null }])
    mockBranchFindMany.mockResolvedValue([{ id: 2, name: 'Banani' }])
    mockLedgerAccountUpdate.mockResolvedValue({})

    const response = await runBackfill()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockLedgerAccountUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { branchId: 2 },
    })
    expect(body).toMatchObject({ success: true, updatedCount: 1, failedCount: 0 })
  })

  it('returns full employee details to admin roles', async () => {
    mockEmployeeFindUnique.mockResolvedValue({
      id: 7,
      employeeId: 'EMP-7',
      name: 'Amina',
      nidNumber: '1234567890',
      branch: { name: 'Banani' },
    })

    const request = new NextRequest('http://localhost/api/hr/employees/7', {
      headers: { 'x-user-role': 'ADMIN' },
    })

    const response = await getEmployee(request, { params: Promise.resolve({ id: '7' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockEmployeeFindUnique).toHaveBeenCalled()
    expect(body.nidNumber).toBe('1234567890')
  })

  it('scopes branch users to limited employee details in their own branch', async () => {
    mockEmployeeFindFirst.mockResolvedValue({
      id: 7,
      employeeId: 'EMP-7',
      name: 'Amina',
      designation: 'Sales Associate',
      branchId: 4,
      branch: { name: 'Banani' },
    })

    const request = new NextRequest('http://localhost/api/hr/employees/7', {
      headers: {
        'x-user-role': 'BRANCH',
        'x-user-branch-id': '4',
      },
    })

    const response = await getEmployee(request, { params: Promise.resolve({ id: '7' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockEmployeeFindFirst).toHaveBeenCalledWith({
      where: { id: 7, branchId: 4 },
      select: expect.objectContaining({
        id: true,
        employeeId: true,
        name: true,
        designation: true,
        branchId: true,
      }),
    })
    expect(body.nidNumber).toBeUndefined()
  })

  it('does not expose other-branch employees to branch users', async () => {
    mockEmployeeFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/hr/employees/7', {
      headers: {
        'x-user-role': 'BRANCH',
        'x-user-branch-id': '8',
      },
    })

    const response = await getEmployee(request, { params: Promise.resolve({ id: '7' }) })

    expect(response.status).toBe(404)
  })
})
