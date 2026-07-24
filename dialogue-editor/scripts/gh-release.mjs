/**
 * 將 release 目錄中的 Portable exe 發佈到 GitHub Releases。
 * 用法：
 *   npm run pack
 *   npm run release:gh
 *   npm run release:gh -- "更新說明文字"
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`
const releaseDir = resolve('D:/skymiku/dialogue-editor-release')
const notesArg = process.argv.slice(2).join(' ')
const notes =
  notesArg ||
  `攤位台詞流程編輯器 ${tag}

【給一般使用者】
1. 下載 DialogueEditor-${version}-Portable.exe
2. 雙擊開啟即可（免安裝、不需 Node.js）
3. 關掉視窗即結束程式
4. 請用「匯出 JSON」備份專案`

if (!existsSync(releaseDir)) {
  console.error('找不到 release/，請先執行：npm run pack')
  process.exit(1)
}

const artifacts = readdirSync(releaseDir).filter(
  (f) => f.endsWith('.exe') && f.includes(version),
)
if (artifacts.length === 0) {
  console.error(`release/ 內沒有含 ${version} 的 .exe，請先執行：npm run pack`)
  process.exit(1)
}

try {
  execSync('gh --version', { stdio: 'ignore' })
} catch {
  console.error('需要安裝 GitHub CLI：https://cli.github.com/')
  process.exit(1)
}

const repoRoot = resolve(root, '..')
const files = artifacts.map((f) => `"${resolve(releaseDir, f)}"`).join(' ')
const notesEscaped = notes.replace(/"/g, '\\"')

execSync(
  `gh release create ${tag} ${files} --title "攤位台詞流程編輯器 ${tag}" --notes "${notesEscaped}"`,
  { stdio: 'inherit', cwd: repoRoot },
)

console.log(`\n已發佈 GitHub Release：${tag}`)
for (const f of artifacts) console.log(`  - ${f}`)
