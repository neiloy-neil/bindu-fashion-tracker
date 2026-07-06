import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/notifications — fetch unread (and recent read) notifications for current user
export async function GET(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = notifications.filter(n => !n.isRead).length
    return NextResponse.json({ notifications, unreadCount })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/notifications — delete all notifications (or specific ids)
export async function DELETE(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const ids: number[] | undefined = body.ids

    await prisma.notification.deleteMany({
      where: {
        userId,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/notifications — mark all as read (or specific ids)
export async function PATCH(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const ids: number[] | undefined = body.ids

    await prisma.notification.updateMany({
      where: {
        userId,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : { isRead: false }),
      },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
