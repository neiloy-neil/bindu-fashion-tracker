import os

filepath = "d:/AI/bindu-fashion-tracker/app/hr/slips/page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the heuristic block for determining BRANCH role
target_block = """      // If we only got 1 slip and no other employees, it's likely a BRANCH user
      const isBranch = emps.length <= 1 && slips.length <= 1 && !empsRes.ok // This is a heuristic. Actually we can check response of empsRes, if forbidden it's branch.
      if (empsRes.status === 403) {
        setRole('BRANCH')
      } else {
        setRole('ADMIN')
      }"""

replacement_block = """      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      
      if (session?.user?.role === 'BRANCH') {
        setRole('BRANCH')
        if (!session.user.employeeId) {
          // This allows us to render the unlinked message
          setCalcsByBranch(new Map())
          setLoading(false)
          return
        }
      } else {
        setRole('ADMIN')
      }"""

content = content.replace(target_block, replacement_block)

# Add the unlinked message block
unlinked_ui = """  if (role === 'BRANCH') {
    const allSlips = Array.from(calcsByBranch.values()).flat()
    
    if (allSlips.length === 0) {
      return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-sm">Your account is not yet linked to an employee profile. Contact your admin to set this up.</p>
          </div>
        </div>
      )
    }

    // Show only their own slip
    const slip = allSlips[0]"""

content = content.replace(
    "  if (role === 'BRANCH') {\n    // Show only their own slip\n    const slip = Array.from(calcsByBranch.values()).flat()[0]",
    unlinked_ui
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
