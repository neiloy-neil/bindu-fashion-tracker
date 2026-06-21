import re

with open('app/api/summary/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add receivedTransfers to include
include_addition = """        items: { include: { category: true } },
        transfers: { include: { account: true } },
        receivedTransfers: { include: { dailyEntry: { include: { branch: true } } } },
        payments: { include: { party: true, cheque: true } },"""
content = content.replace("        items: { include: { category: true } },\n        transfers: { include: { account: true } },\n        payments: { include: { party: true, cheque: true } },", include_addition)

# Add receivedTransfers math
math_addition = """    if (entry.transfers) {
      for (const t of entry.transfers) {
        entryExp += t.amount
        physicalOut += t.amount
        expenseBreakdown['Transfers'] = (expenseBreakdown['Transfers'] || 0) + t.amount
      }
    }
    
    if (entry.receivedTransfers) {
      for (const t of entry.receivedTransfers) {
        entrySale += t.amount
        physicalIn += t.amount
      }
    }"""
content = content.replace("""    if (entry.transfers) {
      for (const t of entry.transfers) {
        entryExp += t.amount
        physicalOut += t.amount
        expenseBreakdown['Transfers'] = (expenseBreakdown['Transfers'] || 0) + t.amount
      }
    }""", math_addition)

with open('app/api/summary/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
