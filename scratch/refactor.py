import re

with open('app/reports/daily/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'const exportAsPdf = async \(\) => \{.*?\n  \}',
    '''const exportAsPdf = async () => {
    if (!entryData) return
    const branchName = branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'Branch'
    const { exportReportAsPdf } = await import('@/lib/exportPdf')
    await exportReportAsPdf(entryData, branchName, selectedDate)
  }''',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'(<div \n              ref=\{reportRef\} \n              className=\"bg-\[#0f172a\] p-8 rounded-xl border border-\[#1e2d45\] shadow-xl text-white\"\n            >).*?(</div>\n          </div>\n        \) : null\})',
    r'\1\n              <DailyReportTemplate entryData={entryData} />\n            </div>\n          </div>\n        ) : null}',
    content,
    flags=re.DOTALL
)

content = content.replace("import { Download } from 'lucide-react'", "import { Download } from 'lucide-react'\nimport DailyReportTemplate from '@/components/reports/DailyReportTemplate'")

content = re.sub(r'const incomeItems = entryData\?\.items\?\.filter.*?\n', '', content)
content = re.sub(r'const expenseEntries = entryData\?\.expenseEntries \|\| \[\]\n', '', content)
content = re.sub(r'const transfers = entryData\?\.transfers \|\| \[\]\n', '', content)
content = re.sub(r'const payments = entryData\?\.payments \|\| \[\]\n', '', content)
content = re.sub(r'const advanceSalaries = entryData\?\.advanceSalaries \|\| \[\]\n', '', content)

with open('app/reports/daily/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
