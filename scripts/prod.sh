#!/bin/bash

# Production deployment script

set -e

echo "🚀 Deploying TekAI Context Engine in production mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Check required environment variables
if [ -z "$GITLAB_TOKEN" ]; then
    echo "❌ GITLAB_TOKEN environment variable is required"
    exit 1
fi

# Build and start production services
echo "🐳 Building and starting production services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose run --rm migrate

# Run database seeding (optional)
echo "🌱 Seeding database..."
docker-compose exec app npm run db:seed

echo "✅ Production deployment completed!"
echo "📚 API Documentation: http://localhost:3000/api/docs"
echo "🔍 Health Check: http://localhost:3000/api/v1/health"
echo ""
echo "📊 Monitor logs with: docker-compose logs -f"
echo "🛑 Stop services with: docker-compose down"
