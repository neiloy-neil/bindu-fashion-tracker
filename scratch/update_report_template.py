import re

file_path = "d:/AI/bindu-fashion-tracker/components/reports/DailyReportTemplate.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Logo and Fraunces title
# <h1 className="text-2xl font-bold text-white mb-2">Bindu Fashion - Daily Report</h1>
content = content.replace(
    '<h1 className="text-2xl font-bold text-white mb-2">Bindu Fashion - Daily Report</h1>',
    '<img src="/bindu-logo.webp" alt="Bindu Premium" className="h-16 mx-auto mb-4 object-contain" />\n        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: \'var(--font-display)\', color: \'var(--accent)\' }}>Bindu Premium - Daily Report</h1>'
)

# 2. Main wrapper bg and text
# className="bg-[#0f172a] p-8 rounded-xl border border-[#1e2d45] shadow-xl text-white"
content = content.replace(
    'className="bg-[#0f172a] p-8 rounded-xl border border-[#1e2d45] shadow-xl text-white"',
    'className="bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border)] shadow-xl text-foreground"'
)

# 3. Headers and borders
content = content.replace('border-[#1e2d45]', 'border-[var(--border)]')
content = content.replace('bg-[#162033]', 'bg-[var(--bg-primary)]')
content = content.replace('bg-[#0a0f1e]', 'bg-[var(--bg-card)]')

# 4. Text colors
content = content.replace('text-[#8899aa]', 'text-[var(--text-secondary)]')
content = content.replace('text-white', 'text-foreground')

# 5. Section headers colors -> use text-[var(--accent)] or text-[var(--success)] etc., but actually let's use text-[var(--accent)] for all or keep them if they represent categories. The plan says "clear hierarchy".
# <h3 className="text-[#34d399] ...
content = re.sub(r'text-\[#[0-9a-fA-F]{6}\]\s+font-semibold\s+uppercase\s+tracking-wider', r'text-[var(--accent)] font-semibold uppercase tracking-wider font-bold', content)
content = re.sub(r'text-\[#[0-9a-fA-F]{6}\]\s+font-semibold\s+text-xs\s+uppercase', r'text-[var(--accent)] font-semibold text-xs uppercase', content)

# 6. Tabular nums for amounts
# className="px-4 py-3 text-right font-bold text-[#34d399]">
content = re.sub(
    r'className="px-4 py-3 text-right font-bold text-\[#[0-9a-fA-F]{6}\]"',
    r'className="px-4 py-3 text-right font-bold tabular-nums font-mono text-[var(--accent)]"',
    content
)

# 7. Check status badges
content = content.replace('bg-[#10b981]/20 text-[#10b981]', 'bg-[var(--success)]/20 text-[var(--success)]')
content = content.replace('bg-[#ef4444]/20 text-[#ef4444]', 'bg-[var(--danger)]/20 text-[var(--danger)]')
content = content.replace('bg-[#f59e0b]/20 text-[#f59e0b]', 'bg-[var(--accent)]/20 text-[var(--accent)]')
content = content.replace('text-[#00d2ff]', 'text-[var(--accent)]')

# 8. Time slots
content = content.replace('text-[#3b82f6]', 'text-[var(--accent)]')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated DailyReportTemplate.tsx")
