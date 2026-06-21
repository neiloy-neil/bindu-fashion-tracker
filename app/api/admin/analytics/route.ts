import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('startDate')
    const endStr = searchParams.get('endDate')

    if (!startStr || !endStr) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
    }

    const startDate = new Date(startStr)
    const endDate = new Date(endStr)
    
    // Add 1 day to end date to make it inclusive up to midnight
    const nextDay = new Date(endDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Fetch entries
    const entries = await prisma.dailyEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lt: nextDay
        }
      },
      include: {
        branch: true,
        items: { include: { category: true } },
        transfers: true,
        payments: { include: { cheque: true } },
        expenseEntries: { include: { category: true } },
        advanceSalaries: true
      },
      orderBy: { date: 'asc' }
    })

    let totalRevenue = 0
    let totalExpenses = 0

    const trendMap = new Map<string, { date: string, revenue: number, expenses: number }>()
    const branchMap = new Map<string, { name: string, sales: number }>()
    const categoryMap = new Map<string, number>()

    // For "Cash In Hand", we want the sum of actualPhysicalCash for the LATEST entry per branch in this range
    const latestCashPerBranch = new Map<number, number>()

    for (const entry of entries) {
      const dateStr = entry.date.toISOString().split('T')[0]
      if (!trendMap.has(dateStr)) trendMap.set(dateStr, { date: dateStr, revenue: 0, expenses: 0 })
      
      const branchName = entry.branch.name
      if (!branchMap.has(branchName)) branchMap.set(branchName, { name: branchName, sales: 0 })

      latestCashPerBranch.set(entry.branchId, Number(entry.actualPhysicalCash) || 0)

      let dayRevenue = 0
      let dayExpense = 0

      for (const item of entry.items) {
        if (item.category.type === 'INCOME' && item.category.name !== 'Opening Balance') {
          dayRevenue += Number(item.amount)
        } else if (item.category.type === 'EXPENSE') {
          dayExpense += Number(item.amount)
          categoryMap.set(item.category.name, (categoryMap.get(item.category.name) || 0) + Number(item.amount))
        }
      }

      for (const t of entry.transfers) {
        dayExpense += Number(t.amount)
        categoryMap.set('Bank Transfer', (categoryMap.get('Bank Transfer') || 0) + Number(t.amount))
      }

      for (const p of entry.payments) {
        if (p.method === 'CHEQUE' && p.cheque?.status !== 'APPROVED') continue;
        dayExpense += Number(p.amount)
        categoryMap.set('Party Payment', (categoryMap.get('Party Payment') || 0) + Number(p.amount))
      }

      for (const e of entry.expenseEntries) {
        dayExpense += Number(e.amount)
        const cName = e.category?.name || 'Other Expense'
        categoryMap.set(cName, (categoryMap.get(cName) || 0) + Number(e.amount))
      }

      for (const a of entry.advanceSalaries) {
        if (a.type === 'CASH') {
          dayExpense += Number(a.amount)
          categoryMap.set('Advance Salary', (categoryMap.get('Advance Salary') || 0) + Number(a.amount))
        }
      }

      totalRevenue += dayRevenue
      totalExpenses += dayExpense

      trendMap.get(dateStr)!.revenue += dayRevenue
      trendMap.get(dateStr)!.expenses += dayExpense
      branchMap.get(branchName)!.sales += dayRevenue
    }

    let cashInHand = 0
    latestCashPerBranch.forEach(amount => cashInHand += amount)

    const trendData = Array.from(trendMap.values())
    const branchData = Array.from(branchMap.values())
    const expenseData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 expenses

    return NextResponse.json({
      kpi: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        cashInHand
      },
      trendData,
      branchData,
      expenseData
    })
  } catch (error: any) {
    console.error('Analytics Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
