/**
 * 將 release/*.zip 發佈到 GitHub Releases。
 * 用法（在 dialogue-editor 目錄）：
 *   npm run pack
 *   npm run release:gh
 * 或指定版號註解：
 *   node scripts/gh-release.mjs "本次更新說明"
 */
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`
const zipPath = resolve(root, 'release', `dialogue-editor-v${version}-win.zip`)
const notes = process.argv.slice(2).join(' ') || `攤位台詞流程編輯器 ${tag}`

if (!existsSync(zipPath)) {
  console.error(`找不到 ${zipPath}\n請先執行：npm run pack`)
  process.exit(1)
}

try {
  execSync('gh --version', { stdio: 'ignore' })
} catch {
  console.error('需要安裝 GitHub CLI：https://cli.github.com/')
  process.exit(1)
}

const repoRoot = resolve(root, '..')
execSync(
  `gh release create ${tag} "${zipPath}" --title "dialogue-editor ${tag}" --notes "${notes.replace(/"/g, '\\"')}"`,
  { stdio: 'inherit', cwd: repoRoot },
)

console.log(`\n已發佈 GitHub Release：${tag}`)
