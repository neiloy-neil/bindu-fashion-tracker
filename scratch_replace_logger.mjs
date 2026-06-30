import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const apiDir = path.join(process.cwd(), 'app/api')

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file))
    } else if (file.endsWith('.ts')) { 
      results.push(file)
    }
  })
  return results
}

const files = walk(apiDir)

let updatedCount = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  if (content.includes('console.error(')) {
    // 1. Ensure logger is imported
    if (!content.includes("import { logger }")) {
      // find last import
      const lines = content.split('\n')
      let lastImportIdx = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIdx = i
        }
      }
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, "import { logger } from '@/lib/logger'")
        content = lines.join('\n')
      } else {
        content = "import { logger } from '@/lib/logger'\n" + content
      }
    }
    
    // 2. Replace console.error
    content = content.replace(/console\.error\(/g, 'logger.error(')
    fs.writeFileSync(file, content, 'utf-8')
    updatedCount++
    console.log(`Updated ${file}`)
  }
}

console.log(`Finished replacing console.error in ${updatedCount} files.`)
