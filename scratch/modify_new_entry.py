import re

file_path = "d:/AI/bindu-fashion-tracker/components/entries/NewEntryForm.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports: need TrendingUp, TrendingDown
content = content.replace("import { ChevronDown, ChevronRight } from 'lucide-react'", 
                          "import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'")

# 2. Income Header
# 📈 Inflow & Sales (or whatever it is) -> <TrendingUp className="text-[var(--accent)]" size={20} /> Income & Sales
content = re.sub(
    r"([^\x00-\x7F]|\w)*\s*(Income &|Inflow &|Income|Sales).*(?=<span)",
    r"<TrendingUp className=\"text-[var(--accent)]\" size={20} /> Income & Sales",
    content,
    flags=re.IGNORECASE
)

# 3. Expense Header
# 💸 Expenses & Dispersals
content = re.sub(
    r"([^\x00-\x7F]|\w)*\s*Expenses & Dispersals.*(?=<span)",
    r"<TrendingDown className=\"text-[var(--accent)]\" size={20} /> Expenses & Dispersals",
    content
)

# 4. Accordion backgrounds
# bg-muted/30 -> bg-[var(--bg-card)] border-b border-[var(--border)]
content = content.replace('bg-muted/30 text-left', 'bg-[var(--bg-card)] border-b border-[var(--border)] text-left')

# 5. Net Balance block
# bg-gradient-to-br from-primary/10 to-blue-500/10 p-5 sm:p-6 rounded-lg border border-primary/30
content = content.replace(
    'bg-gradient-to-br from-primary/10 to-blue-500/10 p-5 sm:p-6 rounded-lg border border-primary/30',
    'bg-[var(--bg-card)] p-5 sm:p-6 rounded-lg border border-[var(--border)] shadow-xl'
)

# Replace the giant SVG inside net balance with the bindu-logo.webp watermark
svg_regex = r'<div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">.*?</div>'
replacement_logo = '''<div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0 overflow-hidden">
            <img src="/bindu-logo.webp" alt="" className="w-64 h-64 object-contain translate-x-1/4" />
          </div>'''
content = re.sub(svg_regex, replacement_logo, content, flags=re.DOTALL)

# 6. Close Register Button
# className="btn btn-primary justify-center sm:min-w-[200px]"
content = content.replace(
    'className="btn btn-primary justify-center sm:min-w-[200px]"',
    'className="w-full sm:w-auto py-4 px-8 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold rounded-lg shadow-lg shadow-[var(--accent-glow)] transition-all flex justify-center items-center"'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated NewEntryForm.tsx")
