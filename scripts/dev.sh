#!/bin/bash

# Development startup script

set -e

echo "🔧 Starting TekAI Context Engine in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Running setup first..."
    ./scripts/setup.sh
fi

# Start development services
echo "🐳 Starting development services with Docker Compose..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "📚 API Documentation: http://localhost:3000/api/docs"
echo "🔍 Health Check: http://localhost:3000/api/v1/health"
