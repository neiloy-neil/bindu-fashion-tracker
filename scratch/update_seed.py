import re

filepath = "d:/AI/bindu-fashion-tracker/seed.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Update Branches
old_branches = """const BRANCHES = [
  { name: 'Aziz 1',       code: 'AZIZ1' },
  { name: 'Aziz-2',       code: 'AZIZ2' },
  { name: "Cox's Bazar-1", code: 'COX1' },
  { name: "Cox's Bazar-2", code: 'COX2' },
  { name: "Cox's Bazar-3", code: 'COX3' },
  { name: 'Basurhat',     code: 'BASURHAT' },
  { name: 'Dorgahgate',   code: 'DORGAHGATE' },
  { name: 'Lamabazar',    code: 'LAMABAZAR' },
  { name: 'Barishal',     code: 'BARISHAL' },
  { name: 'Teknaf',       code: 'TEKNAF' },
  { name: 'Jashore',      code: 'JASHORE' },
]"""

new_branches = """const BRANCHES = [
  { name: 'Aziz 1',       code: 'AZIZ1' },
  { name: 'Aziz-2',       code: 'AZIZ2' },
  { name: "Cox's Bazar-1", code: 'COX1' },
  { name: "Cox's Bazar-2", code: 'COX2' },
  { name: "Cox's Bazar-3", code: 'COX3' },
  { name: 'Basurhat',     code: 'BASURHAT' },
  { name: 'Dorgahgate',   code: 'DORGAHGATE' },
  { name: 'Lamabazar',    code: 'LAMABAZAR' },
  { name: 'Barishal',     code: 'BARISHAL' },
  { name: 'Teknaf',       code: 'TEKNAF' },
  { name: 'Jashore',      code: 'JASHORE' },
  { name: 'Sylhet',       code: 'SYLHET' },
  { name: 'Office',       code: 'OFFICE' },
]"""

content = content.replace(old_branches, new_branches)

# Add hr_admin user
admin_code = """  // Admin User
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN'
      }
    })
    console.log(`✅ Admin user seeded! Username: admin | Password: ${adminPasswordPlain} (Change this immediately!)`)
  } else {
    console.log(`✅ Admin user already exists.`)
  }"""

hr_admin_code = """  // HR Admin User
  const hrAdminPasswordPlain = 'ChangeMe123!'
  const hrAdminPasswordHash = await bcrypt.hash(hrAdminPasswordPlain, 10)
  const existingHrAdmin = await prisma.user.findUnique({ where: { username: 'hr_admin' } })
  if (!existingHrAdmin) {
    await prisma.user.create({
      data: {
        username: 'hr_admin',
        passwordHash: hrAdminPasswordHash,
        role: 'HR_ADMIN'
      }
    })
    console.log(`✅ HR Admin user seeded! Username: hr_admin | Password: ${hrAdminPasswordPlain}`)
  } else {
    console.log(`✅ HR Admin user already exists.`)
  }"""

content = content.replace(admin_code, admin_code + "\n\n" + hr_admin_code)

# Update SystemSettings
old_settings = """  // Seed SystemSettings
  const existingSettings = await prisma.systemSettings.findFirst()
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        companyName: 'Bindu Premium',
        generatedBy: ''
      }
    })
    console.log('✅ SystemSettings seeded.')
  } else {
    console.log('✅ SystemSettings already exists.')
  }"""

new_settings = """  // Seed SystemSettings
  const existingSettings = await prisma.systemSettings.findFirst()
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        companyName: 'Bindu Premium',
        generatedBy: 'Nahid'
      }
    })
    console.log('✅ SystemSettings seeded.')
  } else {
    await prisma.systemSettings.update({
      where: { id: existingSettings.id },
      data: {
        companyName: 'Bindu Premium',
        generatedBy: 'Nahid'
      }
    })
    console.log('✅ SystemSettings updated.')
  }"""

content = content.replace(old_settings, new_settings)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Seed updated")
