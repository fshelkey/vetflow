const fs = require('fs').promises
const path = require('path')

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

;(async () => {
  const argv = process.argv.slice(2)
  const args = { dest: 'assets/ai', template: 'templates/template.ai' }
  const recognizedFlags = new Set(['--config', '-c', '--dest', '-d', '--template', '-t', '--help', '-h'])
  let warnedMissingTemplate = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      console.log('Usage: addMissingAiFile.js --config <path> [--dest <dir>] [--template <file>]')
      process.exit(0)
    }
    if (a === '--config' || a === '-c') {
      const val = argv[i + 1]
      if (!val || val.startsWith('-')) {
        console.error(`Error: Missing value for ${a}`)
        process.exit(1)
      }
      args.config = val
      i++
    } else if (a === '--dest' || a === '-d') {
      const val = argv[i + 1]
      if (!val || val.startsWith('-')) {
        console.error(`Error: Missing value for ${a}`)
        process.exit(1)
      }
      args.dest = val
      i++
    } else if (a === '--template' || a === '-t') {
      const val = argv[i + 1]
      if (!val || val.startsWith('-')) {
        console.error(`Error: Missing value for ${a}`)
        process.exit(1)
      }
      args.template = val
      i++
    } else if (a.startsWith('-')) {
      console.error(`Error: Unrecognized flag ${a}`)
      process.exit(1)
    } else {
      console.error(`Error: Unexpected argument ${a}`)
      process.exit(1)
    }
  }

  if (!args.config) {
    console.error('Error: --config <path> is required')
    process.exit(1)
  }

  try {
    const configPath = path.resolve(process.cwd(), args.config)
    const destDir = path.resolve(process.cwd(), args.dest)
    const templatePath = path.resolve(process.cwd(), args.template)
    const raw = await fs.readFile(configPath, 'utf8')
    let list
    try {
      list = JSON.parse(raw)
    } catch {
      console.error('Error: Configuration file is not valid JSON')
      process.exit(1)
    }
    if (!Array.isArray(list) || !list.every(item => typeof item === 'string')) {
      console.error('Error: Config JSON must be an array of strings')
      process.exit(1)
    }
    await fs.mkdir(destDir, { recursive: true })
    const created = []
    for (const name of list) {
      const target = path.join(destDir, name)
      if (!(await fileExists(target))) {
        if (await fileExists(templatePath)) {
          await fs.copyFile(templatePath, target)
        } else {
          if (!warnedMissingTemplate) {
            console.warn(`Warning: Template file not found at ${templatePath}. Creating empty files.`)
            warnedMissingTemplate = true
          }
          await fs.writeFile(target, '', 'utf8')
        }
        created.push(name)
      }
    }
    console.log(`Added ${created.length} missing AI file(s).`)
    created.forEach(file => console.log(`  ? ${file}`))
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
})()