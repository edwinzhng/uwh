#!/bin/bash

# Development setup script for UWH project

echo "🚀 Setting up UWH development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL and pgAdmin
echo "🐘 Starting PostgreSQL and pgAdmin..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec uwh-postgres pg_isready -U uwh_user -d uwh_dev > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Install dependencies
echo "📦 Installing dependencies..."
cd api && bun install
cd ../frontend && bun install
cd ..

echo "🎉 Development environment is ready!"
echo ""
echo "📊 Services running:"
echo "   • PostgreSQL: localhost:5432"
echo "   • pgAdmin: http://localhost:5050 (admin@uwh.local / admin)"
echo "   • Backend: http://localhost:3101 (run 'bun run dev:backend')"
echo "   • Frontend: http://localhost:3100 (run 'bun run dev:frontend')"
echo ""
echo "🔧 To start development:"
echo "   bun run dev"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
