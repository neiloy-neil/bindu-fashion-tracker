import re

# 1. EODChecklistModal
filepath = "d:/AI/bindu-fashion-tracker/components/entries/EODChecklistModal.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4 relative overflow-hidden"',
    'className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md max-h-[90dvh] w-full animate-in slide-in-from-bottom-4 relative overflow-hidden flex flex-col"'
)
content = content.replace(
    '<div className="relative z-10">',
    '<div className="relative z-10 flex flex-col h-full">\n          <div className="p-6 pb-0 shrink-0">'
)
content = content.replace(
    '<div className="space-y-4 mb-8">',
    '</div>\n          <div className="space-y-4 p-6 overflow-y-auto flex-1 min-h-0">'
)
content = content.replace(
    '<div className="flex gap-3">',
    '</div>\n          <div className="flex gap-3 p-6 pt-0 shrink-0">'
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)


# 2. AddPartyModal
filepath = "d:/AI/bindu-fashion-tracker/components/parties/AddPartyModal.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '<div className="bg-card w-full max-w-xl rounded-xl shadow-xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">',
    '<div className="bg-card w-full max-w-xl max-h-[90dvh] flex flex-col rounded-xl shadow-xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">'
)
content = content.replace(
    '<form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">',
    '<form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">\n          <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">'
)
content = content.replace(
    '<div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">',
    '</div>\n\n          <div className="p-6 flex justify-end gap-3 border-t border-border bg-card shrink-0">'
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)


print("Modals updated")
