@echo off
title Gemini Web2API Server (Port 8081)
cd /d "%~dp0gemini-web2api"
echo ========================================================
echo   Starting Gemini Web2API Server on http://localhost:8081
echo ========================================================
python gemini_web2api.py
pause
