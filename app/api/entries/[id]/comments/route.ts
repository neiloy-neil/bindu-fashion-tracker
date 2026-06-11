import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = parseInt(params.id)
  
  try {
    const comments = await prisma.comment.findMany({
      where: { entryId },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(comments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = parseInt(params.id)
  const { message } = await req.json()

  try {
    const comment = await prisma.comment.create({
      data: {
        entryId,
        userId: parseInt(token.id as string),
        message,
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    })
    return NextResponse.json(comment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
