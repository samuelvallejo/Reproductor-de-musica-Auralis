@echo off
setlocal
cd /d "%~dp0"
where code.cmd >nul 2>nul
if errorlevel 1 (
  echo Open Visual Studio Code and select File - Open Folder, then this folder.
  pause
  exit /b 1
)
call code.cmd --new-window "%~dp0Auralis.code-workspace"
