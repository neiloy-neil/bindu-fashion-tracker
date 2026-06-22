import re

file_path = "d:/AI/bindu-fashion-tracker/app/entries/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace header backgrounds that are `#0a1628` to `var(--bg-card)`
content = content.replace('#0a1628', 'var(--bg-card)')

# Replace table td styles
# <td className="total-cell" style={{ color: 'var(--accent-light)' }}>
# We want to change the className to include `tabular-nums text-right font-mono` for all numeric cells.
# Numeric cells are:
# renderCell(entry, c) -> rendered in income-cell, expense-cell
# total-cell
# net-positive, net-negative

# 1. Update renderCell definition to return a right-aligned tabular-nums span
content = content.replace(
    '''style={{ display: 'block', minWidth: 70, cursor: 'pointer' }}''',
    '''style={{ display: 'block', minWidth: 70, cursor: 'pointer' }} className="tabular-nums text-right font-mono hover:ring-2 hover:ring-[var(--accent)] hover:outline-none rounded px-1 transition-all"'''
)

# Also update the input in edit mode
content = content.replace(
    'className="cell-input"',
    'className="cell-input tabular-nums text-right font-mono focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"'
)

# Update total cells:
content = content.replace('className="total-cell"', 'className="total-cell tabular-nums text-right font-mono"')
content = content.replace("className={totals.netBalance >= 0 ? 'net-positive' : 'net-negative'}", "className={`tabular-nums text-right font-mono ${totals.netBalance >= 0 ? 'net-positive' : 'net-negative'}`}")

# Badges and buttons
content = content.replace('bg-[#1e2d45]', 'bg-[var(--border)]')
content = content.replace('text-[#8899aa]', 'text-[var(--text-secondary)]')
content = content.replace('text-[#10b981]', 'text-[var(--success)]')
content = content.replace('hover:text-[#059669]', 'hover:text-[var(--success)] opacity-80 hover:opacity-100')
content = content.replace('text-[#00d2ff]', 'text-[var(--accent)]')
content = content.replace('hover:text-[#00a8cc]', 'hover:text-[var(--accent)] opacity-80 hover:opacity-100')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated app/entries/page.tsx")
