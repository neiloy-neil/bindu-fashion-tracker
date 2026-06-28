import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { storageAdmin } from '@/lib/storage'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const file = (await request.formData()).get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, WebP, GIF, and PDF files are allowed.' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 })

  const bucket = request.nextUrl.searchParams.get('bucket') || 'private_receipts'
  if (!['private_receipts', 'receipts', 'employees'].includes(bucket)) {
    return NextResponse.json({ error: 'INVALID_BUCKET' }, { status: 400 })
  }

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
  const key = `${session.user.id}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`
  
  const { error } = await storageAdmin().storage.from(bucket).upload(key, await file.arrayBuffer(), {
    contentType: file.type, upsert: false,
  })
  if (error) return NextResponse.json({ error: 'UPLOAD_FAILED', message: error.message }, { status: 500 })
  
  const { data: { publicUrl } } = storageAdmin().storage.from(bucket).getPublicUrl(key)
  
  return NextResponse.json({ key, url: publicUrl }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const key = request.nextUrl.searchParams.get('key')
  const bucket = request.nextUrl.searchParams.get('bucket') || 'receipts'

  if (!['private_receipts', 'receipts', 'employees'].includes(bucket)) {
    return NextResponse.json({ error: 'INVALID_BUCKET' }, { status: 400 })
  }

  if (!key || !key.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { error } = await storageAdmin().storage.from(bucket).remove([key])
  if (error) {
    return NextResponse.json(
      { error: 'DELETE_FAILED', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
