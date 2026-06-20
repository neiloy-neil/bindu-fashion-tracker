import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const branchId = parseInt(resolvedParams.id)
  const { name, code, isActive } = await req.json()

  const dataToUpdate: any = {}
  if (name !== undefined) dataToUpdate.name = name
  if (code !== undefined) dataToUpdate.code = code
  if (isActive !== undefined) dataToUpdate.isActive = isActive

  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: dataToUpdate,
    })
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
