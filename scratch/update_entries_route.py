import re

with open('app/api/entries/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "await tx.party.update({ where: { id: payment.partyId }, data: { balance: { increment: payment.amount } } })",
    "await tx.party.update({ where: { id: payment.partyId }, data: { balance: { decrement: payment.amount } } })"
)

with open('app/api/entries/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
