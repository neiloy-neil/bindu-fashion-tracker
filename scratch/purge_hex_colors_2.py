import os
import re

directory = "d:/AI/bindu-fashion-tracker"

replacements = {
    r'#131b2c': r'var(--bg-card)',
    r'#0a1628': r'var(--bg-secondary)',
    r'#0f172a': r'var(--bg-card)',
    r'#1a2436': r'var(--bg-card-hover)',
    r'#2a3b59': r'var(--border-hover)',
    r'#a78bfa': r'var(--accent)'
}

for root, _, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content, flags=re.IGNORECASE)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")

print("Hex purge 2 complete.")
