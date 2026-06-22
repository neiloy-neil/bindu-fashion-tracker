import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Update AdvanceSalary
content = re.sub(
    r'(model AdvanceSalary \{.*?note\s+String\?\n)(.*?)(createdAt\s+DateTime\s+@default\(now\(\)\))',
    r'\1  trackerSynced      Boolean  @default(true)\n  \3',
    content,
    flags=re.DOTALL
)

# Update SalaryRecord
content = re.sub(
    r'(model SalaryRecord \{.*?year\s+Int\n)(\s+advanceDeducted\s+Float\s+@default\(0\)\n)',
    r'\1  trackerAdvanceTotal Float    @default(0)\n  hrAdvanceDeducted  Float     @default(0)\n',
    content,
    flags=re.DOTALL
)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
