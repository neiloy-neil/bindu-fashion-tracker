import os

filepath = "d:/AI/bindu-fashion-tracker/app/api/auth/[...nextauth]/route.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Update authorize callback
content = content.replace(
    "managedBranchIds: user.managedBranches?.map(b => b.id) || [],",
    "managedBranchIds: user.managedBranches?.map(b => b.id) || [],\n          employeeId: user.employeeId,"
)

# Update jwt callback
content = content.replace(
    "token.managedBranchIds = (user as any).managedBranchIds;",
    "token.managedBranchIds = (user as any).managedBranchIds;\n        token.employeeId = (user as any).employeeId;"
)

# Update session callback
content = content.replace(
    "managedBranchIds: token.managedBranchIds,",
    "managedBranchIds: token.managedBranchIds,\n          employeeId: token.employeeId,"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
