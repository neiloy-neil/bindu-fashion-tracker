import re

file_path = "d:/AI/bindu-fashion-tracker/app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Recharts COLORS array to use brand tokens (via hex or variables)
# We need to use CSS variables evaluated by Recharts, or hex codes matching the brand.
# Recharts accepts standard hex codes.
# Brand: orange #F4881F, navy #2A356E, green #2F9E6B, red #ED4024
# Extended: #FA9A3E, #4A537A, #10b981
content = re.sub(
    r"const COLORS = \['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'\]",
    "const COLORS = ['#F4881F', '#2A356E', '#2F9E6B', '#FA9A3E', '#4A537A', '#11162B', '#E8E2D5']",
    content
)

# 2. Update DateFilter Branch selector inline styles
content = content.replace(
    "style={{ width: 140, borderColor: '#00d2ff', color: '#00d2ff', fontWeight: 'bold' }}",
    "style={{ width: 140, borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 'bold' }}"
)

# 3. Update Stat Cards
# Total Sales
content = content.replace('<div className="stat-value green">', '<div className="stat-value success">')
# Total Expenses: remove danger/red from standard expense
content = content.replace('<div className="stat-card danger">', '<div className="stat-card">')
content = content.replace('<div className="stat-value red">', '<div className="stat-value">')

# Net Balance
# Add swoosh behind Net Balance
# Wait, Net Balance is rendered conditionally:
net_balance_regex = r'<div className=\{`stat-card \$\{data\.netBalance >= 0 \? \'\' : \'danger\'\}`\}>\s*<div className="stat-label">Net Balance</div>\s*<div className=\{`stat-value \$\{data\.netBalance >= 0 \? \'green\' : \'red\'\}`\}>\s*৳\{formatCurrency\(Math\.abs\(data\.netBalance\)\)\}\s*</div>\s*<div className="stat-change">\{data\.netBalance >= 0 \? \'Profit\' : \'Loss\'\}</div>\s*</div>'

net_balance_replacement = """<div className={`stat-card ${data.netBalance >= 0 ? '' : 'danger'}`} style={{ overflow: 'hidden', position: 'relative' }}>
                <svg className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C16.84 22 20.86 18.55 21.8 14H19.74C18.84 17.43 15.7 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C14.7 4 17.08 5.34 18.5 7.4L15 7.4V9.4H22V2.4H20V5.13C18.17 2.58 15.26 1 12 2V2Z" fill="var(--brand-orange)"/>
                </svg>
                <div className="stat-label" style={{ position: 'relative', zIndex: 10 }}>Net Balance</div>
                <div className={`stat-value font-display ${data.netBalance >= 0 ? 'success' : 'red'}`} style={{ position: 'relative', zIndex: 10, fontSize: '36px' }}>
                  ৳{formatCurrency(Math.abs(data.netBalance))}
                </div>
                <div className="stat-change" style={{ position: 'relative', zIndex: 10 }}>{data.netBalance >= 0 ? 'Profit' : 'Loss'}</div>
              </div>"""

content = re.sub(net_balance_regex, net_balance_replacement, content)

# 4. Chart Lines Colors
content = content.replace('stroke="#10b981"', 'stroke="var(--success)"') # Sales
content = content.replace('stroke="#ef4444"', 'stroke="var(--text-secondary)"') # Expenses

# 5. Anomaly callout
content = content.replace(
    "background: 'rgba(239, 68, 68, 0.1)', color: '#f87171'",
    "background: 'var(--danger-glow)', color: 'var(--danger-light)'"
)

# 6. Branch table
content = content.replace('color: b.netBalance >= 0 ? \'var(--accent-light)\' : \'var(--danger-light)\'', 'color: b.netBalance >= 0 ? \'var(--success)\' : \'var(--text-primary)\'')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updates to app/page.tsx applied successfully.")
