# 攤位台詞流程編輯器

給《創作者的文化祭》攤位對話使用的流程圖編輯器。視覺化編輯開場台詞、選項分支、內容與超連結，並以 **專案 JSON** 完整保存／還原節點與連線。

## 開啟／關閉（建議）

1. **開啟**：雙擊 `啟動編輯器.bat`  
   - 首次會自動 `npm install`  
   - 瀏覽器會自動打開編輯器  
2. **關閉**：關掉黑色命令視窗（或雙擊 `關閉編輯器.bat`）  
3. （可選）對 `啟動編輯器.bat` 按右鍵 → 傳送到 → 桌面（建立捷徑），之後從桌面開啟

> 關掉瀏覽器分頁不等於關閉程式；請關黑色視窗，服務才會停。

## 手動啟動

```bash
cd dialogue-editor
npm install
npm run dev
```

## 匯入／匯出

唯一格式為專案 JSON（`匯出 JSON`／`匯入 JSON`），內容包含：

- 攤位 meta（編號、名稱、說話者、模擬選項位置）
- 所有節點（位置、台詞、類型）
- 所有連線

瀏覽器亦會自動將目前專案存到 localStorage。

### 已知限制

- 驗證假設「單線開場 → 一個選單 → 各選項分支」
- 未連上主幹的節點、循環連線會標成錯誤
- 選項最多 A–F（對齊 RPGMV Show Choices）

## 節點對應 RPGMV

| 節點 | 遊戲事件概念 |
|------|----------------|
| 對話 | 顯示文章 |
| 選單 | 顯示選項 |
| 選項 | 單一分支入口 |
| 連結 | 開啟外部 URL（需插件或腳本） |
| 結束 | 返回選單或結束對話 |

## 打包 Release

### 1. 更新版號（寫在 `package.json` 的 `version`）

例如改成 `0.3.0`。

### 2. 產出壓縮包

```bash
cd dialogue-editor
npm test
npm run pack
```

會產生：

- `release/dialogue-editor-vX.Y.Z/`（可直接測）
- `release/dialogue-editor-vX.Y.Z-win.zip`（給別人下載）

收件者解壓後雙擊 `啟動編輯器.bat`（需已安裝 Node.js）。

### 3. 發到 GitHub Releases（可選）

先把程式碼推上 GitHub，再執行：

```bash
git push origin master
cd dialogue-editor
npm run release:gh
```

或手動：GitHub → Releases → Draft a new release → 上傳 zip，Tag 用 `v0.3.0`。

> 若要做成獨立 `.exe`（免裝 Node），需再包 Electron／Tauri，可另開需求。

## 指令

- `npm run dev` — 開發伺服器（等同啟動編輯器）
- `npm run test` — 單元測試
- `npm run build` — 正式建置
- `npm run pack` — 建置並打成 release zip
- `npm run release:gh` — 用 GitHub CLI 上傳 Release
