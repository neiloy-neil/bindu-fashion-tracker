import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  try {
    const whereClause: any = {}
    
    // If branch user, only show requests for their branch
    if (userRole === 'BRANCH' && userBranchId) {
      whereClause.branchId = parseInt(userBranchId)
    }

    const requests = await prisma.branchRequest.findMany({
      where: whereClause,
      include: {
        branch: true,
        requestedBy: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('[BranchRequest GET Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  
  if (userRole !== 'BRANCH') {
    return NextResponse.json({ error: 'Only branch users can submit branch requests' }, { status: 403 })
  }

  try {
    const { requestedById, type, description, priority = 'MEDIUM' } = await req.json()

    if (!userBranchId) throw new Error('Branch ID missing')

    const newRequest = await prisma.branchRequest.create({
      data: {
        branchId: parseInt(userBranchId),
        requestedById: parseInt(requestedById),
        type,
        description,
        priority,
        status: 'PENDING'
      }
    })

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error: any) {
    console.error('[BranchRequest POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { requestId, status, adminComment, priority } = await req.json()

    const updated = await prisma.branchRequest.update({
      where: { id: requestId },
      data: { status, adminComment, priority }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
