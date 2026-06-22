import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_advance_salary = False
in_salary_record = False

for line in lines:
    if line.startswith('model AdvanceSalary {'):
        in_advance_salary = True
    elif line.startswith('}'):
        in_advance_salary = False
        in_salary_record = False
        
    if line.startswith('model SalaryRecord {'):
        in_salary_record = True

    if in_advance_salary and 'createdAt' in line and '@default(now())' in line:
        new_lines.append('  trackerSynced      Boolean  @default(true)\n')
        
    if in_salary_record and 'advanceDeducted' in line and 'Float' in line:
        new_lines.append('  trackerAdvanceTotal Float    @default(0)\n')
        new_lines.append('  hrAdvanceDeducted  Float     @default(0)\n')
        continue

    new_lines.append(line)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
