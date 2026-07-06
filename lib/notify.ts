import { prisma } from '@/lib/prisma'

type NotifyUsersArgs = {
  userIds: number[]
  type: string
  title: string
  body: string
  metadata?: Record<string, unknown>
}

export async function notifyUsers({ userIds, type, title, body, metadata }: NotifyUsersArgs) {
  if (userIds.length === 0) return
  await prisma.notification.createMany({
    data: userIds.map(userId => ({ userId, type, title, body, metadata: metadata ?? null })),
  })
}

export async function notifyByRole(
  roles: string[],
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  })
  await notifyUsers({ userIds: users.map(u => u.id), type, title, body, metadata })
}

export async function notifyBranchUsers(
  branchId: number,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const users = await prisma.user.findMany({
    where: { role: 'BRANCH', branchId, isActive: true },
    select: { id: true },
  })
  await notifyUsers({ userIds: users.map(u => u.id), type, title, body, metadata })
}
