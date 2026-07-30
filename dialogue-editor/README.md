# 攤位台詞流程編輯器

給《創作者的文化祭》攤位對話使用的流程圖編輯器。

## 網頁版（推薦）

直接開啟：**https://skymiku39.github.io/creator-matsuri/**

免安裝，資料存在瀏覽器；請定期「匯出 JSON」備份。

## 給一般使用者（免寫程式／桌面版）

1. 到 GitHub Releases 下載 **`DialogueEditor-*-Portable.exe`**
2. **雙擊**開啟
3. **關掉視窗**即結束

不需安裝 Node.js。建議用「匯出 JSON」自行備份專案。

## 開發者：本機開啟

- 瀏覽器版：雙擊 `啟動編輯器.bat`
- 桌面視窗版：`npm run dev:app`

## 打包給別人用

```bash
cd dialogue-editor
npm test
npm run pack
```

產出：`D:/skymiku/dialogue-editor-release/DialogueEditor-<版號>-Portable.exe`
（輸出目錄避開中文路徑，避免 Windows 打包權限錯誤）

發佈到 GitHub：

```bash
git push origin master
npm run release:gh
```

請先在 `package.json` 更新 `version`。

## 匯入／匯出

唯一格式為專案 JSON（`匯出 JSON`／`匯入 JSON`）。  
瀏覽器／桌面版也會自動把目前專案存到本機。

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 瀏覽器開發伺服器 |
| `npm run dev:app` | Electron 視窗開發 |
| `npm run test` | 單元測試 |
| `npm run build` | 建置網頁資源 |
| `npm run pack` | 產出 Windows 免安裝 exe |
| `npm run release:gh` | 上傳 GitHub Release |
