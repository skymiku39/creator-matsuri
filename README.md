# 創作者的文化祭

攤位台詞流程編輯器（RPG Maker MV／MZ 用語句表）。

## 網頁版（GitHub Pages）

直接在瀏覽器編輯（免安裝）：

**https://skymiku39.github.io/creator-matsuri/**

資料存在瀏覽器 localStorage，換裝置請匯出 JSON。

部署只有一條路：推送 `master` 且變更到 `dialogue-editor/` 時，
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 會跑測試、建置並發佈。

- repo 設定 **Pages → Source 必須是「GitHub Actions」**
- 建置成品不進版控，不要提交 `docs/` 或 `dist/`
- 舊網址 `/docs/` 會自動導回根路徑

## 專案結構

```
dialogue-editor/            # Vite + React 流程圖編輯器（網頁版與 Electron 桌面版）
creator-matsuri-tools/      # 輔助工具（Git submodule）
.github/workflows/          # GitHub Pages 部署
《…》攤位01台詞 - 範本.xlsx    # 主辦方的語句表範本（台詞內容的原始依據）
```

輔助工具獨立倉庫：[creator-matsuri-tools](https://github.com/skymiku39/creator-matsuri-tools)（JSON 反編／流程圖匯出等）。

首次 clone 請一併拉 submodule：

```bash
git clone --recurse-submodules https://github.com/skymiku39/creator-matsuri.git
# 若已 clone：
git submodule update --init --recursive
```

## 不在倉庫裡的素材

設計原始檔與攤位專案檔不進版控，存放在維護者的 Google Drive（私人資料夾，未對外分享）：

[創作者的文化祭｜本機素材備份 2026-11-17](https://drive.google.com/drive/folders/1kEoqr3T3u8Rz3qj05BNriC3KuZoT9-CY)

| 檔案 | 說明 |
|------|------|
| `封面.png` | 活動封面圖 |
| `會場宣傳海報_日常(橫向)20260730.psd` | 會場宣傳海報原始檔 |
| `會場報名表_日常(橫向)20260730.psd` | 會場報名表原始檔 |
| `booth_01_flow.json` | 攤位01 的編輯器專案檔（可用「匯入 JSON」還原） |

## 資料怎麼流動

```
語句表範本.xlsx ──(照著填)──▶ 編輯器 ──匯出──▶ booth_XX_flow.json ──▶ creator-matsuri-tools
                              │  ▲                                    （台詞.txt＋流程圖）
                              └──┘ 匯入 JSON 可完整還原
```

- 專案 JSON 是編輯器唯一的匯入／匯出格式，也是匯出工具的輸入
- 內建範本「兔子茶會」的台詞與 xlsx 範本逐句對應

## 對話流程規則

| 節點 | 說明 |
|------|------|
| 對話 | 一句台詞（Show Text） |
| 選單 | 顯示選項（Show Choices，最多 A–F） |
| 選項 | 某一條分支的入口文字；可標記為「離開選項」 |
| 連結 | 外部 URL |
| 結束 | 分支走完後的行為：**回到選單** 或 **結束對話** |

結束節點的行為寫在 `data.endAction`：

| 值 | 行為 |
|----|------|
| `menu` | 回到選單，玩家可繼續問其他選項 |
| `finish` | 結束整段對話 |
| 未指定 | 自動：一般選項之下回到選單；離開選項（如「等一下再過來」）之下結束對話 |

「自動補全結束」會替缺少結束的分支補上節點並寫入明確的 `endAction`。
舊版 JSON 沒有這個欄位，匯入後依「未指定」規則運作。

## 開發

```bash
cd dialogue-editor
npm install
npm run dev
```

- `npm test` — 單元測試
- `npm run build` — 正式建置（請在確認完成後再執行）

## 版本

目前版本：`1.2.0`（見 `dialogue-editor/package.json`）

獨立頁面：
- `/` 編輯器（多人發言晶片、復原／重做）
- `/simulate` 對話模擬（與編輯器同步）
- `/tutorial` 教學

## 輔助工具（JSON 匯出）

編輯器匯出的 `booth_XX_flow.json` 可交給 submodule 內工具反編：

```bash
cd creator-matsuri-tools/dialogue-json-export
npm install
npm run export -- "完整路徑\booth_01_flow.json"
# 或把 JSON 拖到 匯出.bat（最省事）
```

輸出純文字台詞（含說話者／人物表、每個分支走完後的行為）與不重疊流程圖 PNG。
