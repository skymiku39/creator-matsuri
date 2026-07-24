# 台詞 JSON 匯出工具（給自己用）

把編輯器匯出的 **專案 JSON** 反編成：

- 純文字台詞（含分支）
- 流程圖圖片（Graphviz 排版，線盡量不重疊）

全部放進**一個資料夾**，不會散落。

## 怎麼用（最快）

1. 首次在本資料夾執行一次：`npm install`
2. 把 `xxx.json` **拖到 `匯出.bat` 上**
3. 到本工具目錄下的 `exports/<攤位_時間>/` 看結果

或命令列：

```bash
cd tools/dialogue-json-export
npm install
npm run export -- "D:\path\to\booth.json"
```

指定輸出根目錄：

```bash
node src/cli.mjs ".\booth.json" "D:\my-exports"
```

## 輸出內容

```
tools/dialogue-json-export/exports/
  01_01攤位_20260724_183000/
    台詞.txt      ← 純文字
    流程圖.png    ← 可直接貼文件
    流程圖.svg
    流程圖.dot
    來源.json
    README.txt
```

## 說明

- 流程圖用 Graphviz `dot` + `splines=true`，階層排版，降低線段交叉覆蓋
- 不需安裝系統 Graphviz（內建 WASM）
- 僅供本機個人使用，不依賴編輯器 GUI
