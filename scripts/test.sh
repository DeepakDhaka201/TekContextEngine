#!/bin/bash

# Test runner script for TekAI Context Engine

set -e

echo "🧪 TekAI Context Engine Test Runner"

# Function to run database setup for tests
setup_test_db() {
    echo "📊 Setting up test database..."
    
    # Check if test database exists, create if not
    PGPASSWORD=postgres psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw tekaicontextengine2_test || {
        echo "Creating test database..."
        PGPASSWORD=postgres createdb -h localhost -U postgres tekaicontextengine2_test
    }
    
    # Run migrations on test database
    echo "Running test database migrations..."
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tekaicontextengine2_test?schema=public" npx prisma migrate deploy
    
    echo "✅ Test database ready"
}

# Function to clean up test database
cleanup_test_db() {
    echo "🧹 Cleaning up test database..."
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tekaicontextengine2_test?schema=public" npx prisma migrate reset --force --skip-seed
}

# Function to run unit tests
run_unit_tests() {
    echo "🔬 Running unit tests..."
    npm run test -- --testPathPattern="test/unit" --coverage
}

# Function to run integration tests
run_integration_tests() {
    echo "🔗 Running integration tests..."
    setup_test_db
    npm run test -- --testPathPattern="test/integration" --runInBand
    cleanup_test_db
}

# Function to run e2e tests
run_e2e_tests() {
    echo "🌐 Running e2e tests..."
    setup_test_db
    npm run test:e2e
    cleanup_test_db
}

# Function to run all tests
run_all_tests() {
    echo "🚀 Running all tests..."
    setup_test_db
    npm run test:cov
    cleanup_test_db
}

# Function to run tests with watch mode
run_watch_tests() {
    echo "👀 Running tests in watch mode..."
    npm run test:watch
}

# Function to generate test coverage report
generate_coverage() {
    echo "📈 Generating coverage report..."
    npm run test:cov
    echo "Coverage report generated in ./coverage directory"
}

# Function to run linting
run_lint() {
    echo "🔍 Running linter..."
    npm run lint
}

# Function to run type checking
run_type_check() {
    echo "📝 Running type check..."
    npx tsc --noEmit
}

# Function to run all quality checks
run_quality_checks() {
    echo "✨ Running quality checks..."
    run_lint
    run_type_check
    echo "✅ Quality checks passed"
}

# Main script logic
case "${1:-all}" in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "e2e")
        run_e2e_tests
        ;;
    "watch")
        run_watch_tests
        ;;
    "coverage")
        generate_coverage
        ;;
    "lint")
        run_lint
        ;;
    "type-check")
        run_type_check
        ;;
    "quality")
        run_quality_checks
        ;;
    "setup-db")
        setup_test_db
        ;;
    "cleanup-db")
        cleanup_test_db
        ;;
    "all")
        run_quality_checks
        run_all_tests
        ;;
    *)
        echo "Usage: $0 {unit|integration|e2e|watch|coverage|lint|type-check|quality|setup-db|cleanup-db|all}"
        echo ""
        echo "Commands:"
        echo "  unit         - Run unit tests"
        echo "  integration  - Run integration tests"
        echo "  e2e          - Run end-to-end tests"
        echo "  watch        - Run tests in watch mode"
        echo "  coverage     - Generate coverage report"
        echo "  lint         - Run linter"
        echo "  type-check   - Run TypeScript type checking"
        echo "  quality      - Run all quality checks (lint + type-check)"
        echo "  setup-db     - Setup test database"
        echo "  cleanup-db   - Clean up test database"
        echo "  all          - Run quality checks and all tests"
        exit 1
        ;;
esac

echo "✅ Test run completed successfully!"
