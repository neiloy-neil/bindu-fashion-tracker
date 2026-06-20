import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Excel import is temporarily disabled due to dynamic categories migration.' }, { status: 501 })
}
