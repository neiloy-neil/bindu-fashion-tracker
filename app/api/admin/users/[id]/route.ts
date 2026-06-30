import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const userUpdateSchema = z.object({
  username: z.string().min(2).optional(),
  email: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'BRANCH', 'AUDITOR', 'AREA_MANAGER', 'HR_ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']).optional(),
  branchId: z.union([z.string(), z.number()]).transform(v => Number(v)).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional().nullable(),
  managedBranchIds: z.array(z.number()).optional()
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const userId = parseInt(resolvedParams.id)
  const rawBody = await req.json()
  const parsed = userUpdateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }
  const { username, email, phoneNumber, role, branchId, isActive, password, managedBranchIds } = parsed.data

  const dataToUpdate: any = {}
  if (username !== undefined) dataToUpdate.username = username
  if (email !== undefined) dataToUpdate.email = email ?? null
  if (phoneNumber !== undefined) dataToUpdate.phoneNumber = phoneNumber ?? null
  if (role !== undefined) dataToUpdate.role = role
  if (branchId !== undefined && branchId !== null) {
    if (role === 'BRANCH' || (!role && dataToUpdate.role === 'BRANCH')) dataToUpdate.branch = { connect: { id: branchId } }
    else dataToUpdate.branch = { disconnect: true }
  } else if (branchId === null) {
    dataToUpdate.branch = { disconnect: true }
  }
  
  if (managedBranchIds !== undefined) {
    if (role === 'AREA_MANAGER' || (!role && dataToUpdate.role === 'AREA_MANAGER')) {
      dataToUpdate.managedBranches = { set: managedBranchIds.map((id: number) => ({ id })) }
    } else {
      dataToUpdate.managedBranches = { set: [] }
    }
  }
  if (isActive !== undefined) dataToUpdate.isActive = isActive

  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10)
    dataToUpdate.passwordHash = await bcrypt.hash(password, salt)
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        managedBranches: { select: { id: true, name: true } },
      }
    })
    return NextResponse.json(user)
  } catch (error: any) {
    logger.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const userId = parseInt(resolvedParams.id)
  try {
    // Instead of deleting, we soft-delete (deactivate)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, username: true, isActive: true }
    })
    return NextResponse.json(user)
  } catch (error: any) {
    logger.error('Failed to delete user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
