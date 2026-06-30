import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)
  
  try {
    const { name, type, isActive, branchId } = await req.json()
    
    if (name) {
      const existing = await prisma.ledgerAccount.findFirst({ where: { name, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ error: 'Account with this name already exists' }, { status: 409 })
      }
    }

    const account = await prisma.ledgerAccount.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(branchId !== undefined && { branchId: branchId ? parseInt(branchId) : null }),
      }
    })
    return NextResponse.json(account)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  try {
    const transfersCount = await prisma.transfer.count({ where: { accountId: id } })
    if (transfersCount > 0) {
      return NextResponse.json({ error: 'Cannot delete account because it is referenced in transfers. Please deactivate it instead.' }, { status: 409 })
    }

    const account = await prisma.ledgerAccount.delete({ where: { id } })
    return NextResponse.json(account)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
