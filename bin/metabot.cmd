@echo off
setlocal EnableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
set "UNIX_DIR=%SCRIPT_DIR:\=/%"
set "UNIX_DIR=%UNIX_DIR:C:=/c%"
"C:\Program Files\Git\usr\bin\bash.exe" -l -c "%UNIX_DIR%metabot %*"
