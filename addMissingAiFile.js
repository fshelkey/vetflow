const fs = require('fs').promises;
const path = require('path');

async function addMissingAiFiles(targetDir = path.join(__dirname, 'components')) {
  async function processDir(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`Cannot read directory ${dir}:`, err);
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const base = path.basename(entry.name, '.js');
        const aiFileName = `${base}.ai.md`;
        const aiPath = path.join(dir, aiFileName);
        const content = `# ${base} AI Plan

### Purpose
Describe the purpose of \`${base}.js\`.

### Structure
- Outline key functions and data flows.
- Define inputs and outputs.
- List dependencies and side effects.

### Pseudocode
\`\`\`
// Placeholder pseudocode for ${base}
\`\`\`
`;
        try {
          await fs.writeFile(aiPath, content, { encoding: 'utf8', flag: 'wx' });
          console.log(`Created missing AI file: ${aiPath}`);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            console.error(`Error writing ${aiPath}:`, err);
          }
          // If file exists, skip
        }
      }
    }
  }

  try {
    await processDir(targetDir);
  } catch (err) {
    console.error('Error processing AI files:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  const argDir = process.argv[2];
  const dir = argDir ? path.resolve(process.cwd(), argDir) : undefined;
  addMissingAiFiles(dir);
}

module.exports = addMissingAiFiles;