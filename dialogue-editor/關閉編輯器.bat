@echo off
chcp 65001 >nul
title 關閉攤位台詞流程編輯器

echo 正在結束佔用 5173 埠的程序…
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo 完成。若編輯器黑色視窗還在，也可直接關掉它。
timeout /t 2 >nul
