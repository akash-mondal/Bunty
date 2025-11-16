#!/bin/bash

echo "🔍 Verifying Bunty ZKP Platform Setup..."
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
node --version

# Check npm version
echo "✓ Checking npm version..."
npm --version

# Check if workspaces are installed
echo ""
echo "✓ Checking workspace installations..."
if [ -d "backend/node_modules" ]; then
  echo "  ✓ Backend dependencies installed"
else
  echo "  ✗ Backend dependencies missing"
fi

if [ -d "frontend/node_modules" ]; then
  echo "  ✓ Frontend dependencies installed"
else
  echo "  ✗ Frontend dependencies missing"
fi

# Check TypeScript compilation
echo ""
echo "✓ Checking TypeScript compilation..."
npm run type-check --workspace=backend > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Backend TypeScript OK"
else
  echo "  ✗ Backend TypeScript errors"
fi

npm run type-check --workspace=frontend > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Frontend TypeScript OK"
else
  echo "  ✗ Frontend TypeScript errors"
fi

# Check Docker Compose configuration
echo ""
echo "✓ Checking Docker Compose configuration..."
if command -v docker-compose &> /dev/null; then
  docker-compose config --quiet
  if [ $? -eq 0 ]; then
    echo "  ✓ Docker Compose configuration valid"
  else
    echo "  ✗ Docker Compose configuration invalid"
  fi
else
  echo "  ⚠ Docker Compose not installed (optional for verification)"
fi

# Check environment file
echo ""
echo "✓ Checking environment configuration..."
if [ -f ".env" ]; then
  echo "  ✓ .env file exists"
else
  echo "  ⚠ .env file not found (copy from .env.example)"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure API keys"
echo "2. Start Docker services: docker-compose up -d"
echo "3. Start development servers: npm run dev"
echo ""
