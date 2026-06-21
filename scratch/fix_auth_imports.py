import re

files_to_fix = [
    'app/api/transfers/[id]/acknowledge/route.ts',
    'app/api/transfers/pending-count/route.ts',
    'app/transfers/incoming/page.tsx'
]

for file in files_to_fix:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            content = content.replace("import { authOptions } from '@/lib/auth'", "import { authOptions } from '@/app/api/auth/[...nextauth]/route'")
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file}")
    except Exception as e:
        print(f"Error fixing {file}: {e}")
