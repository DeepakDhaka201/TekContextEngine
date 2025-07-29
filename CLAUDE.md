# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Run
```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run with Docker (development)
chmod +x scripts/dev.sh && ./scripts/dev.sh

# Run with Docker (production)
chmod +x scripts/prod.sh && ./scripts/prod.sh
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Testing
```bash
# Run all tests with coverage
npm run test:all

# Run specific test types
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests

# Run quality checks (lint + type check)
npm run test:quality

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### Code Quality
```bash
# Run linter
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit
```

### Worker Process
```bash
# Start background worker
npm run worker
```

## High-Level Architecture

### Core Design Pattern
This is a NestJS application with a modular, project-based architecture for managing GitLab repositories. The system follows a microservices pattern with separate API servers and background workers communicating through Redis queues.

### Key Architectural Components

1. **Project-Based Organization**: Codebases are organized within projects, allowing logical grouping of related repositories with shared access control.

2. **Background Job Processing**: Uses Bull/BullMQ with Redis for asynchronous processing of:
   - Repository synchronization from GitLab
   - Code analysis and indexing
   - File processing and storage
   - Embedding generation

3. **Codegraph Module**: Advanced code analysis system that combines:
   - SCIP (Source Code Index Protocol) tools for language-
   