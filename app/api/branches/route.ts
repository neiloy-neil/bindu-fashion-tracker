import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  const where = userRole === 'BRANCH' && userBranchId ? { id: parseInt(userBranchId) } : {}

  const branches = await prisma.branch.findMany({
    where,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(branches)
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, code, isActive } = await req.json()

  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
  }

  try {
    const existing = await prisma.branch.findFirst({
      where: { OR: [{ name }, { code }] }
    })
    if (existing) {
      return NextResponse.json({ error: 'Branch name or code already exists' }, { status: 409 })
    }

    const branch = await prisma.branch.create({
      data: { name, code, isActive: isActive !== undefined ? isActive : true }
    })
    return NextResponse.json(branch, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
