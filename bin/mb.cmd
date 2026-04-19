@echo off
setlocal EnableDelayedExpansion

set "METABOT_HOME=%USERPROFILE%\metabot"
set "METABOT_ENV=%METABOT_HOME%\.env"

if exist "%METABOT_ENV%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%METABOT_ENV%") do (
        set "%%A=%%B"
    )
)

set "PORT=%API_PORT%"
if "%PORT%"=="" set "PORT=9100"

set "SECRET=%API_SECRET%"
if "%SECRET%"=="" set "SECRET=changeme"

set "METABOT_URL=%METABOT_URL%"
if "%METABOT_URL%"=="" set "METABOT_URL=http://localhost:%PORT%"

set "CMD=%~1"
shift

if "%CMD%"=="bots" goto bots
if "%CMD%"=="b" goto bots
goto usage

:bots
    curl -s -H "Authorization: Bearer %SECRET%" "%METABOT_URL%/api/bots" | python -m json.tool 2>nul || powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Invoke-RestMethod -Uri '%METABOT_URL%/api/bots' -Headers @{'Authorization'='Bearer %SECRET%'}) | ConvertTo-Json -Depth 10"
    exit /b

:usage
    echo mb - MetaBot API CLI
    echo.
    echo   mb bots                          - List all bots
    exit /b
