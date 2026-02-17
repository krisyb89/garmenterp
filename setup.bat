@echo off
REM 🚀 Garment ERP - Local Development Setup Script (Windows)
REM This script automates the initial setup

echo ==================================
echo 🚀 Garment ERP Local Setup
echo ==================================
echo.

REM Step 1: Check Node.js
echo 📦 Step 1: Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node --version
    echo ✅ Node.js is installed
) else (
    echo ❌ Node.js is not installed!
    echo    Please download and install from: https://nodejs.org
    pause
    exit /b 1
)
echo.

REM Step 2: Check .env file
echo 🔐 Step 2: Checking environment variables...
if exist ".env" (
    echo ✅ .env file exists
) else (
    echo ❌ .env file not found!
    echo    Creating .env file from .env.example...
    copy .env.example .env
    echo ⚠️  Please edit .env and add your DATABASE_URL and JWT_SECRET
    pause
    exit /b 1
)
echo.

REM Step 3: Install dependencies
echo 📚 Step 3: Installing dependencies...
echo    This may take 1-2 minutes...
call npm install
if %ERRORLEVEL% EQU 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Step 4: Generate Prisma client
echo 🗄️  Step 4: Generating Prisma client...
call npx prisma generate
if %ERRORLEVEL% EQU 0 (
    echo ✅ Prisma client generated
) else (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Step 5: Run migrations
echo 🔄 Step 5: Running database migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% EQU 0 (
    echo ✅ Database migrations completed
) else (
    echo ❌ Failed to run migrations
    echo    Please check your DATABASE_URL in .env
    pause
    exit /b 1
)
echo.

REM Success!
echo ==================================
echo ✅ Setup Complete!
echo ==================================
echo.
echo 🎉 You're ready to start developing!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo Then open your browser to:
echo   http://localhost:3000
echo.
echo 📖 For more info, see LOCAL_SETUP.md
echo.
pause
