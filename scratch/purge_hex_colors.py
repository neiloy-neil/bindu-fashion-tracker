import os
import re

directory = "d:/AI/bindu-fashion-tracker"

replacements = {
    r'#0a0f18': r'var(--bg-card)',
    r'#111827': r'var(--bg-card)',
    r'#050810': r'var(--bg-primary)',
    r'#0a0f1e': r'var(--bg-card)',
    r'#1e2d45': r'var(--border)',
    r'#162033': r'var(--bg-secondary)',
    r'#00d2ff': r'var(--accent)',
    r'#00a8cc': r'var(--accent-dark)',
    r'#38bdf8': r'var(--accent)',
    r'#3b82f6': r'var(--accent)',
    r'#10b981': r'var(--success)',
    r'#34d399': r'var(--success)',
    r'#ef4444': r'var(--danger)',
    r'#f87171': r'var(--danger)',
    r'#f59e0b': r'var(--warning)',
    r'#fb923c': r'var(--warning)',
    r'#8899aa': r'var(--text-secondary)',
    r'#64748b': r'var(--text-secondary)',
    r'#f0f4ff': r'var(--text-primary)',
    r'rgba\(30,45,69,0\.5\)': r'var(--border)'
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
                # Replace with word boundaries to avoid partial hex matches if any, but hex are 6 chars usually
                new_content = re.sub(old, new, new_content, flags=re.IGNORECASE)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")

print("Hex purge complete.")
