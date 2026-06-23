import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { editRequestActionSchema, editRequestSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'

// GET: Admin fetches pending edit requests, OR Branch user fetches their own pending requests
export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userId = req.headers.get('x-user-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const whereClause: Record<string, unknown> = {}
    
    if (userRole === 'BRANCH') {
      if (!userBranchId || !userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      whereClause.entry = { branchId: parseInt(userBranchId, 10) }
      whereClause.requestedById = parseInt(userId, 10)
    } else if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
  const userBranchId = req.headers.get('x-user-branch-id')
  const userId = req.headers.get('x-user-id')
  
  if (userRole !== 'BRANCH') {
    return NextResponse.json({ error: 'Only branch users can submit edit requests' }, { status: 403 })
  }
  if (!userBranchId || !userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rawBody = await req.json()
    const parsed = editRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { entryId, changes, reason } = parsed.data

    const entry = await prisma.dailyEntry.findFirst({
      where: { id: entryId, branchId: parseInt(userBranchId, 10) },
      select: { id: true },
    })
    if (!entry) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newRequest = await prisma.editRequest.create({
      data: {
        entryId,
        requestedById: parseInt(userId, 10),
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
    const parsed = editRequestActionSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { requestId, status } = parsed.data

    if (status === 'APPROVED') {
      const editReq = await prisma.editRequest.findUnique({
        where: { id: requestId },
        include: {
          entry: {
            include: { items: true }
          }
        }
      })
      if (!editReq) throw new Error('Request not found')
      if (editReq.status !== 'PENDING') {
        return NextResponse.json({ error: `Request is already ${editReq.status}` }, { status: 409 })
      }
      
      const changesResult = editRequestSchema.shape.changes.safeParse(JSON.parse(editReq.changes))
      if (!changesResult.success) {
        return NextResponse.json({ error: 'Stored request changes are invalid', details: changesResult.error.format() }, { status: 422 })
      }
      const changes = changesResult.data
      
      const updateData: {
        actualPhysicalCash?: number
        expectedNetBalance?: number
        notes?: string
        cashDifferenceNote?: string
        items?: {
          upsert: Array<{
            where: { entryId_categoryId: { entryId: number; categoryId: number } }
            update: { amount: number }
            create: { categoryId: number; amount: number }
          }>
        }
      } = {}

      if (changes.actualPhysicalCash !== undefined) updateData.actualPhysicalCash = changes.actualPhysicalCash
      if (changes.expectedNetBalance !== undefined) updateData.expectedNetBalance = changes.expectedNetBalance
      if (changes.notes !== undefined) updateData.notes = changes.notes
      if (changes.cashDifferenceNote !== undefined) updateData.cashDifferenceNote = changes.cashDifferenceNote

      if (changes.items?.length) {
        updateData.items = {
          upsert: changes.items.map(item => ({
            where: {
              entryId_categoryId: {
                entryId: editReq.entryId,
                categoryId: item.categoryId
              }
            },
            update: { amount: item.amount },
            create: {
              categoryId: item.categoryId,
              amount: item.amount
            }
          }))
        }
      }

      const [updatedEntry] = await prisma.$transaction([
        prisma.dailyEntry.update({
          where: { id: editReq.entryId },
          data: updateData,
          include: { items: true }
        }),
        prisma.editRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' }
        })
      ])
      
      const userId = parseInt(req.headers.get('x-user-id') || '0')
      if (userId) {
        await logAudit({
          userId,
          action: 'UPDATE',
          entityType: 'DailyEntry',
          entityId: editReq.entryId,
          oldValues: editReq.entry,
          newValues: updatedEntry,
          reason: `EditRequest Approved: ${editReq.reason || 'No reason provided'}`
        })
      }
      
    } else if (status === 'REJECTED') {
      const updated = await prisma.editRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })
      if (!updated) throw new Error('Request not found')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
