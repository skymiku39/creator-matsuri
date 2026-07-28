# 創作者的文化祭

攤位台詞流程編輯器（RPG Maker MV／MZ 用語句表）。

## 專案結構

```
dialogue-editor/            # Vite + React 流程圖編輯器
creator-matsuri-tools/      # 輔助工具（Git submodule）
《…》攤位01台詞 - 範本.xlsx    # 語句表範本
```

輔助工具獨立倉庫：[creator-matsuri-tools](https://github.com/skymiku39/creator-matsuri-tools)（JSON 反編／流程圖匯出等）。

首次 clone 請一併拉 submodule：

```bash
git clone --recurse-submodules https://github.com/skymiku39/creator-matsuri.git
# 若已 clone：
git submodule update --init --recursive
```

## 開發

```bash
cd dialogue-editor
npm install
npm run dev
```

## 版本

目前版本：`1.1.0`（見 `dialogue-editor/package.json`）

獨立頁面：
- `/` 編輯器（多人發言晶片、復原／重做）
- `/simulate` 對話模擬（與編輯器同步）
- `/tutorial` 教學

## 輔助工具（JSON 匯出）

編輯器匯出的 `booth_XX_flow.json` 可交給 submodule 內工具反編：

```bash
cd creator-matsuri-tools/dialogue-json-export
npm install
npm run export -- "路徑\booth_01_flow.json"
# 或把 JSON 拖到 匯出.bat
```

輸出純文字台詞（含說話者／人物表）與不重疊流程圖 PNG。

- `npm test` — 單元測試
- `npm run build` — 正式建置（請在確認完成後再執行）
