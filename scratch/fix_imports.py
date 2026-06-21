import os

path = r'd:\AI\bindu-fashion-tracker\app\api\edit-requests\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

lines = [l for l in lines if not l.startswith('import ')]

imports = [
    "import { NextRequest, NextResponse } from 'next/server'\n",
    "import { prisma } from '@/lib/prisma'\n",
    "import { editRequestSchema } from '@/lib/schemas'\n",
    "import { logAudit } from '@/lib/audit'\n"
]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(imports + lines)
