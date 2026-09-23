// Runs the saved questions in worker/queries.sql against the live search log and prints each
// as a table. Needs Node 22 (`nvm use`) and `npx wrangler login`.
//   npm run log:stats            every question
//   npm run log:stats -- height  only questions whose title mentions "height"
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const only = process.argv[2]?.toLowerCase()
const sections = readFileSync(new URL('../worker/queries.sql', import.meta.url), 'utf8').split(/^-- name: /m).slice(1)

for (const section of sections) {
  const [title, ...lines] = section.split('\n')
  if (only && !title.toLowerCase().includes(only)) continue
  const sql = lines.filter((line) => !line.trim().startsWith('--')).join('\n').trim()
  const output = execFileSync(
    'npx',
    ['wrangler@4', 'd1', 'execute', 'naseeb-odds-searches', '--remote', '--json', '--config', 'worker/wrangler.toml', '--command', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  console.log(`\n${title.trim()}`)
  const rows = JSON.parse(output)[0]?.results ?? []
  if (rows.length === 0) console.log('  (nothing yet)')
  else console.table(rows)
}
