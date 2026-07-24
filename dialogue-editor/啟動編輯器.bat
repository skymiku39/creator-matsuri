@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 攤位台詞流程編輯器

echo.
echo  ========================================
echo   攤位台詞流程編輯器
echo  ----------------------------------------
echo   開啟：瀏覽器會自動打開
echo   關閉：直接關掉這個黑色視窗即可
echo  ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js，請先安裝：https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 首次啟動，正在安裝套件…
  call npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗
    pause
    exit /b 1
  )
  echo.
)

echo 啟動中…（請保持此視窗開著）
echo.
call npm run dev

echo.
echo 程式已結束。
pause
