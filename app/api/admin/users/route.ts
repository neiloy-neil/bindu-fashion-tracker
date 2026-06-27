import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { userSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        branchId: true,
        employeeId: true,
        branch: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, name: true } },
        managedBranches: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const rawBody = await req.json()
  const parsed = userSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }
  const { username, email, password, role, branchId, isActive, managedBranchIds, employeeId } = parsed.data

  try {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        role,
        ...(branchId && role === 'BRANCH' ? { branch: { connect: { id: parseInt(String(branchId)) } } } : {}),
        ...(managedBranchIds && role === 'AREA_MANAGER' ? { managedBranches: { connect: managedBranchIds.map((id: number) => ({ id })) } } : {}),
        ...(employeeId ? { employee: { connect: { id: parseInt(String(employeeId)) } } } : {}),
        isActive: isActive !== undefined ? isActive : true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        employeeId: true,
        createdAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
