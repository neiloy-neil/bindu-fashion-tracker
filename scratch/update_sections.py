import os
import re

sections_dir = "d:/AI/bindu-fashion-tracker/components/entries"
files = [
    "IncomeSection.tsx",
    "ExpenseSection.tsx",
    "TransferSection.tsx",
    "PaymentSection.tsx",
    "AdvanceSalarySection.tsx"
]

for file_name in files:
    path = os.path.join(sections_dir, file_name)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # We want to find the input for amount. It usually looks like:
    # <input type="number" className={`${inputClass} ...`} ... placeholder="Amount"
    # Or <input type="number" className={inputClass} placeholder="Amount"
    
    # Replace `{inputClass}` with `{inputClass} text-right tabular-nums font-mono`
    # but ONLY for the amount field. We can just target `type="number"` if it's the only one.
    # Let's target: `type="number"` and then `inputClass`
    
    content = re.sub(
        r'type="number"\s*\n?\s*className=\{\`\$\{inputClass\}',
        r'type="number"\n                className={`text-right tabular-nums font-mono ${inputClass}',
        content
    )
    content = re.sub(
        r'type="number"\s*\n?\s*className=\{inputClass\}',
        r'type="number"\n                className={`text-right tabular-nums font-mono ${inputClass}`}',
        content
    )
    
    # Also update bg-card border border-border -> bg-[var(--bg-card)] border border-[var(--border)]
    content = content.replace("bg-card border border-border", "bg-[var(--bg-card)] border border-[var(--border)]")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Updated sections")
