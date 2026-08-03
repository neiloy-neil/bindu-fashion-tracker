import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['wholesale.view']) return FORBIDDEN()
  const { role } = auth
  const branchId = req.headers.get('x-user-branch-id')

  const { searchParams } = new URL(req.url)
  const filterBranchId = searchParams.get('branchId')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    // BRANCH users can only see buyers scoped to their branch or shared (null branchId)
    let whereClause: any = includeInactive ? {} : { isActive: true }

    if (role === 'BRANCH' && branchId) {
      whereClause = {
        ...whereClause,
        OR: [{ branchId: parseInt(branchId) }, { branchId: null }],
      }
    } else if (filterBranchId) {
      whereClause = {
        ...whereClause,
        OR: [{ branchId: parseInt(filterBranchId) }, { branchId: null }],
      }
    }

    const buyers = await prisma.wholesaleBuyer.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { bankInfo: true, branch: { select: { id: true, name: true } } },
    })
    return NextResponse.json(buyers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['wholesale.write']) return FORBIDDEN()

  try {
    const { name, contactPerson, contactNumber, secondaryNumber, email, address, creditLimit, branchId, openingBalance } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Buyer name is required.' }, { status: 400 })
    }

    const buyer = await prisma.wholesaleBuyer.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        contactNumber: contactNumber || null,
        secondaryNumber: secondaryNumber || null,
        email: email || null,
        address: address || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        balance: openingBalance ? parseFloat(openingBalance) : 0,
        branchId: branchId ? parseInt(branchId) : null,
      },
    })
    return NextResponse.json(buyer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
