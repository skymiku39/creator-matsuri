import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const stamp = `dialogue-editor-v${version}`
const outDir = resolve(root, 'release', stamp)
const zipPath = resolve(root, 'release', `${stamp}-win.zip`)
const distDir = resolve(root, 'dist')

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(distDir, resolve(outDir, 'dist'), { recursive: true })

writeFileSync(
  resolve(outDir, '啟動編輯器.bat'),
  `@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 攤位台詞流程編輯器 v${version}

echo.
echo  ========================================
echo   攤位台詞流程編輯器 v${version}
echo  ----------------------------------------
echo   開啟：瀏覽器稍後會自動打開
echo   關閉：關掉這個黑色視窗即可
echo  ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 需要先安裝 Node.js：https://nodejs.org/
  pause
  exit /b 1
)

start "" http://localhost:4173
npx --yes serve -s dist -l 4173
`,
  'utf8',
)

writeFileSync(
  resolve(outDir, '關閉編輯器.bat'),
  `@echo off
chcp 65001 >nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4173" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo 已嘗試關閉 4173 埠服務。
timeout /t 2 >nul
`,
  'utf8',
)

writeFileSync(
  resolve(outDir, '使用說明.txt'),
  `攤位台詞流程編輯器 v${version}

【需求】
- 已安裝 Node.js（https://nodejs.org/ LTS）

【開啟】
1. 雙擊「啟動編輯器.bat」
2. 瀏覽器開啟 http://localhost:4173

【關閉】
- 關掉黑色命令視窗，或雙擊「關閉編輯器.bat」

【資料】
- 編輯內容會存在瀏覽器 localStorage
- 請用「匯出 JSON」自行備份專案檔
`,
  'utf8',
)

rmSync(zipPath, { force: true })
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${outDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
  { stdio: 'inherit' },
)

console.log(`\n已產出：\n  資料夾 ${outDir}\n  壓縮檔 ${zipPath}\n`)
