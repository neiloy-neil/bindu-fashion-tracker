import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { branchRequestSchema } from '@/lib/schemas'
import { logger } from '@/lib/logger'
import { notifyByRole, notifyUsers } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
        requestedBy: { select: { id: true, username: true } },
        assignedTo: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    logger.error('branch_requests.fetch_failed', error, {
      userRole,
      branchId: userBranchId ? parseInt(userBranchId) : null,
    })
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
    const rawBody = await req.json()
    const parsed = branchRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { requestedById, type, description, priority = 'MEDIUM', attachmentUrl, assignedToId } = parsed.data

    if (!userBranchId) throw new Error('Branch ID missing')

    const newRequest = await prisma.branchRequest.create({
      data: {
        branchId: parseInt(userBranchId as string),
        requestedById: parseInt(String(requestedById)),
        type,
        description,
        priority,
        attachmentUrl,
        assignedToId: assignedToId ? parseInt(String(assignedToId)) : null,
        status: 'PENDING'
      }
    })

    logger.info('branch_request.created', {
      requestId: newRequest.id,
      branchId: newRequest.branchId,
      requestedById: newRequest.requestedById,
      type: newRequest.type,
      priority: newRequest.priority,
    })

    // Notify admins in-app (fire-and-forget)
    void (async () => {
      try {
        const branch = await prisma.branch.findUnique({ where: { id: newRequest.branchId } })
        const branchName = branch?.name ?? `Branch ${newRequest.branchId}`
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
          select: { id: true },
        })
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            type: 'BRANCH_REQUEST',
            title: `Support request: ${branchName}`,
            body: `[${newRequest.type}] ${newRequest.description.slice(0, 120)}`,
            metadata: { requestId: newRequest.id, branchId: newRequest.branchId },
          })),
        })
      } catch {}
    })()

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error: any) {
    logger.error('branch_request.create_failed', error, {
      branchId: userBranchId ? parseInt(userBranchId) : null,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { requestId, status, adminComment, priority, assignedToId } = await req.json()

    const updated = await prisma.branchRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminComment,
        priority,
        assignedToId: assignedToId ? parseInt(String(assignedToId)) : undefined
      }
    })

    logger.info('branch_request.updated', {
      requestId: updated.id,
      status: updated.status,
      priority: updated.priority,
    })

    if (status && updated.requestedById) {
      void notifyUsers({
        userIds: [updated.requestedById],
        type: 'BRANCH_REQUEST_UPDATE',
        title: `Support request ${status.toLowerCase()}`,
        body: adminComment
          ? `Your request has been updated to ${status.toLowerCase()}. Note: ${adminComment}`
          : `Your support request has been updated to ${status.toLowerCase()}.`,
        metadata: { requestId: updated.id },
      }).catch(() => {})
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    logger.error('branch_request.update_failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
