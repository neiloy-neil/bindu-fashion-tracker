import re

file_path = r'd:\AI\bindu-fashion-tracker\app\api\summary\route.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update the findMany query
content = content.replace(
    '''      include: {
        items: { include: { category: true } }
      }''',
    '''      include: {
        items: { include: { category: true } },
        transfers: { include: { account: true } },
        payments: { include: { party: true, cheque: true } },
        expenseEntries: { include: { category: true } },
        advanceSalaries: { include: { employee: true } }
      }'''
)

# Replace the inner loop calculating total expenses
# Find the start of the loop
old_loop = '''    for (const item of entry.items) {
      if (item.category.name === 'Opening Balance') {
        openingBalance += item.amount
      } else if (item.category.type === 'INCOME') {
        entrySale += item.amount
        if (!isDigital(item.category.name)) physicalIn += item.amount
      } else if (item.category.type === 'EXPENSE') {
        entryExp += item.amount
        if (!isDigital(item.category.name)) physicalOut += item.amount
        
        // Expense breakdown
        const catName = item.category.name
        expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + item.amount
      }
    }'''

new_loop = '''    for (const item of entry.items) {
      if (item.category.name === 'Opening Balance') {
        openingBalance += item.amount
      } else if (item.category.type === 'INCOME') {
        entrySale += item.amount
        if (!isDigital(item.category.name)) physicalIn += item.amount
      } else if (item.category.type === 'EXPENSE') {
        entryExp += item.amount
        if (!isDigital(item.category.name)) physicalOut += item.amount
        
        const catName = item.category.name
        expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + item.amount
      }
    }

    if (entry.transfers) {
      for (const t of entry.transfers) {
        entryExp += t.amount
        physicalOut += t.amount
        expenseBreakdown['Transfers'] = (expenseBreakdown['Transfers'] || 0) + t.amount
      }
    }
    
    if (entry.payments) {
      for (const p of entry.payments) {
        if (p.method === 'CHEQUE' && p.cheque?.status !== 'APPROVED') continue
        entryExp += p.amount
        if (p.method === 'CASH') physicalOut += p.amount
        expenseBreakdown['Party Payments'] = (expenseBreakdown['Party Payments'] || 0) + p.amount
      }
    }

    if (entry.expenseEntries) {
      for (const e of entry.expenseEntries) {
        entryExp += e.amount
        physicalOut += e.amount
        const catName = e.category?.name || 'Other Expense'
        expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + e.amount
      }
    }

    if (entry.advanceSalaries) {
      for (const a of entry.advanceSalaries) {
        if (a.type === 'CASH') {
          entryExp += a.amount
          physicalOut += a.amount
          expenseBreakdown['Advance Salary'] = (expenseBreakdown['Advance Salary'] || 0) + a.amount
        }
      }
    }'''

content = content.replace(old_loop, new_loop)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app/api/summary/route.ts")
