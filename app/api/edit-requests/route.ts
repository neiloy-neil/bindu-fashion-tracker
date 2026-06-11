import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Admin fetches pending edit requests, OR Branch user fetches their own pending requests
export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  try {
    const whereClause: any = {}
    
    // If branch user, only show requests for their branch
    if (userRole === 'BRANCH' && userBranchId) {
      whereClause.entry = {
        branchId: parseInt(userBranchId)
      }
    }

    const requests = await prisma.editRequest.findMany({
      where: whereClause,
      include: {
        entry: {
          include: { branch: true }
        },
        requestedBy: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Branch user submits an edit request
export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (userRole !== 'BRANCH') {
    return NextResponse.json({ error: 'Only branch users can submit edit requests' }, { status: 403 })
  }

  try {
    const { entryId, requestedById, changes, reason } = await req.json()

    const newRequest = await prisma.editRequest.create({
      data: {
        entryId: parseInt(entryId),
        requestedById: parseInt(requestedById),
        changes: JSON.stringify(changes),
        reason,
        status: 'PENDING'
      }
    })

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Admin approves or rejects
export async function PATCH(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { requestId, status } = await req.json()

    if (status === 'APPROVED') {
      // Apply the changes
      const editReq = await prisma.editRequest.findUnique({ where: { id: requestId } })
      if (!editReq) throw new Error('Request not found')
      
      const changes = JSON.parse(editReq.changes)
      
      await prisma.$transaction([
        prisma.dailyEntry.update({
          where: { id: editReq.entryId },
          data: changes
        }),
        prisma.editRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' }
        })
      ])
      
    } else if (status === 'REJECTED') {
      await prisma.editRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
