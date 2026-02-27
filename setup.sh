#!/bin/bash

# 🚀 Garment ERP - Local Development Setup Script
# This script automates the initial setup

echo "=================================="
echo "🚀 Garment ERP Local Setup"
echo "=================================="
echo ""

# Step 1: Check Node.js
echo "📦 Step 1: Checking Node.js..."
if command -v node &> /dev/null
then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION is installed"
else
    echo "❌ Node.js is not installed!"
    echo "   Please download and install from: https://nodejs.org"
    exit 1
fi
echo ""

# Step 2: Check .env file
echo "🔐 Step 2: Checking environment variables..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file not found!"
    echo "   Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your DATABASE_URL and JWT_SECRET"
    exit 1
fi
echo ""

# Step 3: Install dependencies
echo "📚 Step 3: Installing dependencies..."
echo "   This may take 1-2 minutes..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Step 4: Generate Prisma client
echo "🗄️  Step 4: Generating Prisma client..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo ""

# Step 5: Run migrations
echo "🔄 Step 5: Running database migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed"
else
    echo "❌ Failed to run migrations"
    echo "   Please check your DATABASE_URL in .env"
    exit 1
fi
echo ""

# Success!
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "🎉 You're ready to start developing!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000"
echo ""
echo "📖 For more info, see LOCAL_SETUP.md"
echo ""
