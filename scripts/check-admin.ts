import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' }, select: { username: true, role: true, passwordHash: true, isActive: true } })
  if (!user) { console.log('User not found'); return }
  console.log('Found:', user.username, user.role, 'active:', user.isActive)
  console.log('Hash prefix:', user.passwordHash.substring(0, 10))
  const match123 = await bcrypt.compare('admin123', user.passwordHash)
  const matchAdmin = await bcrypt.compare('admin', user.passwordHash)
  console.log('admin123 matches:', match123)
  console.log('admin matches:', matchAdmin)
}

main().finally(() => prisma.$disconnect())
