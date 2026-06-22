import re

file_path = "d:/AI/bindu-fashion-tracker/app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# BarChart
content = content.replace('fill="#10b981"', 'fill="var(--success)"')
content = content.replace('fill="#ef4444"', 'fill="var(--text-secondary)"')

# Table colors
content = content.replace("color: 'var(--accent-light)'", "color: 'var(--text-primary)'") # sales
content = content.replace("color: 'var(--danger-light)'", "color: 'var(--text-secondary)'") # expenses

# Info/warning stats
content = content.replace("color: '#60a5fa'", "color: 'var(--text-primary)'")
content = content.replace("color: '#fcd34d'", "color: 'var(--warning)'")

# badge-red for loss should just be a neutral badge or we can leave it since it indicates a loss, but maybe we should map it
# Let's leave badges for now as they use the danger/success colors which are fine for "Profit/Loss"

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updates to app/page.tsx applied successfully (pass 2).")
