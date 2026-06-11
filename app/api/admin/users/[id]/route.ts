import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token || token.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const userId = parseInt(resolvedParams.id)
  const { role, branchId, isActive, password, managedBranchIds } = await req.json()

  const dataToUpdate: any = {}
  if (role !== undefined) dataToUpdate.role = role
  if (branchId !== undefined) {
    if (branchId && (role === 'BRANCH' || (!role && dataToUpdate.role === 'BRANCH'))) dataToUpdate.branch = { connect: { id: parseInt(branchId) } }
    else dataToUpdate.branch = { disconnect: true }
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
        role: true,
        isActive: true,
        branchId: true,
      }
    })
    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token || token.role !== 'ADMIN') {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
