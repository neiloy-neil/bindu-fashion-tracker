import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const parties = await prisma.party.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bankInfo: true }
    })
    return NextResponse.json(parties)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { name, isActive, contactPerson, contactNumber, secondaryNumber, email, address, openingDueAmount, openingDueDate, hasPaymentMethod, methodType, methodLabel, methodAccountNo, methodRoutingNo, methodBranchName } = await req.json()
    
    // The user requested that everything is strictly required
    if (!name || !contactPerson || !contactNumber || !secondaryNumber || !address) {
      return NextResponse.json({ error: 'All fields (Name, Contact Person, Contact Number, Secondary Number, Address) are required.' }, { status: 400 })
    }

    if (hasPaymentMethod && (!methodType || !methodAccountNo)) {
      return NextResponse.json({ error: 'Payment method type and account number are required.' }, { status: 400 })
    }

    const existing = await prisma.party.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Party with this name already exists' }, { status: 409 })
    }

    const initialBalance = openingDueAmount ? parseFloat(openingDueAmount) : 0
    
    // Create the party and the initial due within a transaction
    const party = await prisma.$transaction(async (tx) => {
      const newParty = await tx.party.create({
        data: {
          name,
          contactPerson,
          contactNumber,
          secondaryNumber,
          email,
          address,
          isActive: isActive !== undefined ? isActive : true,
          balance: initialBalance,
        }
      })
      
      if (initialBalance > 0 && openingDueDate) {
        // Create an opening due purchase record
        const dateObj = new Date(openingDueDate)
        await tx.purchase.create({
          data: {
            partyId: newParty.id,
            date: new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())),
            amount: initialBalance,
            isOpeningDue: true,
            note: 'Opening Due',
          }
        })
      }

      if (hasPaymentMethod) {
        await tx.partyBankInfo.create({
          data: {
            partyId: newParty.id,
            type: methodType,
            label: methodLabel || undefined,
            bankName: methodType === 'BANK' ? (methodLabel || '') : null,
            accountNo: methodAccountNo,
            accountName: contactPerson, // default to contact person
            routingNo: methodRoutingNo || null,
            branchName: methodBranchName || null,
            isDefault: true
          }
        })
      }
      
      return newParty
    })

    return NextResponse.json(party, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
