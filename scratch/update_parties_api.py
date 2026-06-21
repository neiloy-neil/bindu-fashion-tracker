import re

with open('app/api/parties/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace findMany include
find_addition = """    const parties = await prisma.party.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bankInfo: true }
    })"""
content = content.replace("""    const parties = await prisma.party.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    })""", find_addition)

# Replace POST parsing
post_addition = """    const { name, isActive, contactPerson, contactNumber, secondaryNumber, address } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const existing = await prisma.party.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Party with this name already exists' }, { status: 409 })
    }

    const party = await prisma.party.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        contactNumber: contactNumber || null,
        secondaryNumber: secondaryNumber || null,
        address: address || null,
        isActive: isActive !== undefined ? isActive : true,
      }
    })"""
content = content.replace("""    const { name, isActive } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const existing = await prisma.party.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Party with this name already exists' }, { status: 409 })
    }

    const party = await prisma.party.create({
      data: {
        name,
        isActive: isActive !== undefined ? isActive : true,
      }
    })""", post_addition)

with open('app/api/parties/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
