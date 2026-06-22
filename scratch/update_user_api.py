import os

schema_path = "d:/AI/bindu-fashion-tracker/lib/schemas.ts"
with open(schema_path, "r", encoding="utf-8") as f:
    schema_content = f.read()

schema_content = schema_content.replace(
    "managedBranchIds: z.array(z.number()).optional()",
    "managedBranchIds: z.array(z.number()).optional(),\n  employeeId: z.union([z.string(), z.number()]).optional().nullable()"
)

with open(schema_path, "w", encoding="utf-8") as f:
    f.write(schema_content)

route_path = "d:/AI/bindu-fashion-tracker/app/api/admin/users/route.ts"
with open(route_path, "r", encoding="utf-8") as f:
    route_content = f.read()

route_content = route_content.replace(
    "branch: { select: { id: true, name: true, code: true } },",
    "branch: { select: { id: true, name: true, code: true } },\n        employeeId: true,\n        employee: { select: { id: true, name: true } },"
)

route_content = route_content.replace(
    "managedBranchIds } = parsed.data",
    "managedBranchIds, employeeId } = parsed.data"
)

route_content = route_content.replace(
    "...(managedBranchIds && role === 'AREA_MANAGER' ? { managedBranches: { connect: managedBranchIds.map((id: number) => ({ id })) } } : {}),",
    "...(managedBranchIds && role === 'AREA_MANAGER' ? { managedBranches: { connect: managedBranchIds.map((id: number) => ({ id })) } } : {}),\n        ...(employeeId ? { employee: { connect: { id: parseInt(String(employeeId)) } } } : {}),"
)

route_content = route_content.replace(
    "branchId: true,",
    "branchId: true,\n        employeeId: true,"
)

with open(route_path, "w", encoding="utf-8") as f:
    f.write(route_content)
