@echo off
echo ===================================================
echo Starting Local Development Server...
echo This is required because Firebase Authentication
echo does not work when opening files directly (file://).
echo ===================================================

WHERE npx >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js/npx is not installed. Trying Python...
    python --version >nul 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        echo Python is not installed.
        echo Please install Node.js OR Python, OR use the 'Live Server' extension in VS Code.
        pause
        exit /b
    )
    echo Found Python. Starting server on port 8000...
    start http://localhost:8000/login.html
    python -m http.server 8000
) ELSE (
    echo Found Node.js. Starting http-server...
    call npx -y http-server . -a localhost -o login.html -c-1
)
pause
