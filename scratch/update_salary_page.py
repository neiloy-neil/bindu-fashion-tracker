import os

filepath = "d:/AI/bindu-fashion-tracker/app/hr/salary/page.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """                      <td className="px-3 py-2 text-right text-gray-700 text-sm whitespace-nowrap font-medium">{formatTaka(row.employee.basicSalary)}</td>
                      
                      <td 
                        className="px-2 py-2 text-center text-gray-500 font-medium cursor-help"
                        title={((rec as any).advances || []).map((a: any) => `Given by ${a.user} on ${new Date(a.date).toLocaleDateString()}`).join('\\n') || undefined}
                      >
                        {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                      </td>"""

content = content.replace("""                      <td className="px-3 py-2 text-right text-gray-700 text-sm whitespace-nowrap font-medium">{formatTaka(row.employee.basicSalary)}</td>
                      
                      <td className="px-2 py-2 text-center text-gray-500 font-medium">
                        {formatTaka(rec.trackerAdvanceTotal ?? 0)}
                      </td>""", replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
