import re

with open('app/api/parties/[id]/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add GET method
get_method = """export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)
  
  try {
    const party = await prisma.party.findUnique({
      where: { id },
      include: { bankInfo: true }
    })
    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(party)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT"""
content = content.replace("export async function PUT", get_method)

# Update PUT method parsing
put_parsing = """    const { name, isActive, contactPerson, contactNumber, secondaryNumber, address } = await req.json()"""
content = content.replace("""    const { name, isActive } = await req.json()""", put_parsing)

# Update PUT data
put_data = """      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(secondaryNumber !== undefined && { secondaryNumber }),
        ...(address !== undefined && { address }),
      }"""
content = content.replace("""      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
      }""", put_data)

with open('app/api/parties/[id]/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
