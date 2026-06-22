import os

filepath = "d:/AI/bindu-fashion-tracker/app/api/hr/salary-records/route.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """    const records = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {})
      },
      include: {
        employee: true,
        lockedBy: { select: { username: true } }
      },
      orderBy: { employee: { id: 'asc' } }
    })

    // Fetch advances to resolve branch users
    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

    const advances = await prisma.advanceSalary.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        dailyEntry: {
          select: { branchId: true }
        }
      }
    })

    // Fetch BRANCH users to map branchId -> username
    const branchUsers = await prisma.user.findMany({
      where: { role: 'BRANCH' },
      select: { username: true, branchId: true }
    })

    const branchToUserMap = new Map()
    branchUsers.forEach(u => {
      if (u.branchId) branchToUserMap.set(u.branchId, u.username)
    })

    const recordsWithAdvances = records.map(r => {
      const empAdvances = advances
        .filter(a => a.employeeId === r.employeeId)
        .map(a => ({
          amount: a.amount,
          date: a.createdAt,
          user: a.dailyEntry?.branchId ? branchToUserMap.get(a.dailyEntry.branchId) || 'Unknown' : 'Unknown'
        }))
      return { ...r, advances: empAdvances }
    })

    return NextResponse.json(recordsWithAdvances)"""

content = content.replace("""    const records = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {})
      },
      include: {
        employee: true,
        lockedBy: { select: { username: true } }
      },
      orderBy: { employee: { id: 'asc' } }
    })
    return NextResponse.json(records)""", replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
