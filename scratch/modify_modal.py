import re

file_path = "d:/AI/bindu-fashion-tracker/components/entries/EODChecklistModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Dialog background and watermark
# className="bg-card border border-border rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4"
# -> className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4 relative overflow-hidden"
content = content.replace(
    'className="bg-card border border-border rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4"',
    'className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4 relative overflow-hidden"'
)

# Insert watermark right after the dialog div
watermark = '''<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0">
          <img src="/bindu-logo.webp" alt="" className="w-64 h-64 object-contain" />
        </div>'''
content = content.replace(
    '<h3 id="checklist-title"',
    f'{watermark}\n        <div className="relative z-10">\n        <h3 id="checklist-title"'
)
# we need to close the z-10 div at the end before the last closing tags
content = content.replace(
    '</div>\n    </div>\n  )\n}',
    '</div>\n        </div>\n    </div>\n  )\n}'
)

# 2. Checkboxes
# className="w-5 h-5 rounded border-border bg-card text-primary focus:ring-primary focus:ring-offset-0"
content = content.replace(
    'className="w-5 h-5 rounded border-border bg-card text-primary focus:ring-primary focus:ring-offset-0"',
    'className="w-5 h-5 rounded border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"'
)

# 3. Label background
# className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
content = content.replace(
    'className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"',
    'className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors"'
)

# 4. Icon
# <Lock className="text-primary" /> -> <Lock className="text-[var(--accent)]" />
content = content.replace('<Lock className="text-primary" />', '<Lock className="text-[var(--accent)]" />')

# 5. Buttons
content = content.replace(
    'className="btn btn-secondary flex-1"',
    'className="btn btn-secondary flex-1 py-4"'
)
content = content.replace(
    'className="btn btn-primary flex-1"',
    'className="flex-1 py-4 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold rounded-lg shadow-lg shadow-[var(--accent-glow)] transition-all flex justify-center items-center"'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated EODChecklistModal.tsx")
