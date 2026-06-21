import re

with open('app/entries/new/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'hasInvalidPayments = ' in line:
        continue # skip the stray lines
    new_lines.append(line)

content = ''.join(new_lines)

# Now fix the disable logic on the submit button
content = content.replace(
    'disabled={loading || (missingPreviousDay && userRole !== \'ADMIN\')}',
    'disabled={loading || (missingPreviousDay && userRole !== \'ADMIN\') || watchAll.payments?.some((p: any) => (p.method === \'BANK\' || p.method === \'CHEQUE\') && !p.attachmentUrl)}'
)

with open('app/entries/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
