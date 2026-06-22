import os

filepath = "d:/AI/bindu-fashion-tracker/app/admin/users/page.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add Employee type
content = content.replace(
    "type Branch = {",
    "type Employee = {\n  id: number\n  name: string\n  employeeId: string\n}\n\ntype Branch = {"
)

# Add employee to User type
content = content.replace(
    "managedBranches?: { id: number, name: string }[]",
    "managedBranches?: { id: number, name: string }[]\n  employeeId?: number | null\n  employee?: { id: number, name: string } | null"
)

# Add employees state
content = content.replace(
    "const [branches, setBranches] = useState<Branch[]>([])",
    "const [branches, setBranches] = useState<Branch[]>([])\n  const [employees, setEmployees] = useState<Employee[]>([])"
)

# Fetch employees
content = content.replace(
    "fetch('/api/branches').then(r => r.json())",
    "fetch('/api/branches').then(r => r.json()),\n      fetch('/api/hr/employees?active=true').then(r => r.json())"
)

content = content.replace(
    "if (Array.isArray(bData)) setBranches(bData)",
    "if (Array.isArray(bData)) setBranches(bData)\n      if (Array.isArray(arguments[0][2])) setEmployees(arguments[0][2])"
)

# Update form state
content = content.replace(
    "const [branchId, setBranchId] = useState('')",
    "const [branchId, setBranchId] = useState('')\n  const [employeeId, setEmployeeId] = useState('')"
)

# Update body payload
content = content.replace(
    "branchId: role === 'BRANCH' ? branchId : undefined,",
    "branchId: role === 'BRANCH' ? branchId : undefined,\n        employeeId: employeeId || undefined,"
)

# Update reset
content = content.replace(
    "setBranchId('')",
    "setBranchId('')\n      setEmployeeId('')"
)

# Update UI select
dropdown_ui = """
            {role === 'BRANCH' && (
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Linked Employee (Optional)</label>
                <select className="form-input form-select w-full" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                  <option value="">-- No Employee Linked --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                </select>
              </div>
            )}
"""

content = content.replace(
    "            {role === 'AREA_MANAGER' && (",
    dropdown_ui + "\n            {role === 'AREA_MANAGER' && ("
)

# Update table
content = content.replace(
    "<th className=\"p-3\">Assigned Branch</th>",
    "<th className=\"p-3\">Assigned Branch</th>\n                  <th className=\"p-3\">Linked Employee</th>"
)

content = content.replace(
    "u.branch?.name || '-'}\n                    </td>\n                  </tr>",
    "u.branch?.name || '-'}\n                    </td>\n                    <td className=\"p-3 text-[var(--text-muted)] text-sm\">\n                      {u.employee?.name || '-'}\n                    </td>\n                  </tr>"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
