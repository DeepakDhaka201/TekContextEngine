# Architecture Guide

This document provides a comprehensive overview of the TekAI Context Engine 2.0 architecture.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Patterns](#design-patterns)
- [Scalability Considerations](#scalability-considerations)

## Overview

TekAI Context Engine 2.0 is a microservices-based application designed to automatically fetch, process, and manage codebases from GitLab repositories. The system is built with scalability, reliability, and maintainability in mind.

### Key Features

- **Project-based organization** of codebases
- **Automatic GitLab integration** for repository fetching
- **Real-time synchronization** with background job processing
- **WebSocket support** for live updates
- **Comprehensive monitoring** and health checks
- **JWT-based authentication** and authorization
- **Configurable storage backends** (local, S3, GCS)

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │   Web Client    │
│    (nginx)      │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Server    │    │   App Server    │    │   WebSocket     │
│   (NestJS)      │    │   (NestJS)      │    │   Gateway       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Worker 1      │    │   Worker 2      │    │   Scheduler     │
│   (Background   │    │   (Background   │    │   (Cron Jobs)   │
│    Jobs)        │    │    Jobs)        │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   File Storage  │
│   (Database)    │    │  (Cache/Queue)  │    │   (Local/S3)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. API Layer

**Location**: `src/modules/*/controllers`

- **REST Controllers**: Handle HTTP requests and responses
- **WebSocket Gateways**: Manage real-time connections
- **Authentication Guards**: Protect endpoints with JWT
- **Validation Pipes**: Validate request data

### 2. Business Logic Layer

**Location**: `src/modules/*/services`

- **Project Service**: Manage projects and memberships
- **Codebase Service**: Handle repository operations
- **Sync Service**: Coordinate synchronization jobs
- **Auth Service**: Handle authentication and authorization

### 3. Data Access Layer

**Location**: `src/shared/database`

- **Prisma ORM**: Database abstraction and migrations
- **Repository Pattern**: Data access abstraction
- **Connection Pooling**: Efficient database connections

### 4. Background Processing

**Location**: `src/modules/sync`

- **Bull/BullMQ**: Job queue management
- **Sync Processor**: Handle sync job execution
- **Scheduler Service**: Manage recurring tasks
- **Worker Processes**: Execute background jobs

### 5. External Integrations

**Location**: `src/modules/gitlab`

- **GitLab Service**: Repository API integration
- **File Scanner**: Analyze repository structure
- **Content Fetcher**: Download file contents

### 6. Storage Layer

**Location**: `src/shared/storage`

- **Storage Service**: Abstract storage operations
- **Cache Service**: Redis-based caching
- **File Management**: Handle file operations

### 7. Monitoring & Observability

**Location**: `src/shared/monitoring`

- **Health Checks**: System health monitoring
- **Metrics Collection**: Performance metrics
- **Alerting**: Automated alert system
- **Logging**: Structured logging with Winston

## Data Flow

### 1. Project Creation Flow

```
User Request → Auth Guard → Project Controller → Project Service → Database
                                                      ↓
                                              Create Project Member
                                                      ↓
                                              Return Project Data
```

### 2. Codebase Sync Flow

```
Sync Request → Codebase Controller → Sync Service → Job Queue
                                                        ↓
Worker Process → Sync Processor → GitLab Service → File Scanner
                      ↓                                  ↓
              Update Progress ←─────────────────── Scan Repository
                      ↓                                  ↓
              WebSocket Update ←─────────────────── Process Files
                      ↓                                  ↓
              Store Files ←──────────────────────── Storage Service
                      ↓
              Update Database
```

### 3. Real-time Updates Flow

```
Background Job → Sync Processor → WebSocket Service → Connected Clients
                      ↓                    ↓
              Progress Update    Emit to Rooms (project/codebase)
                      ↓                    ↓
              Database Update    Client Receives Update
```

## Technology Stack

### Backend Framework
- **NestJS**: Modular Node.js framework
- **TypeScript**: Type-safe JavaScript
- **Express**: HTTP server foundation

### Database & ORM
- **PostgreSQL**: Primary database
- **Prisma**: Database ORM and migrations
- **Redis**: Caching and job queues

### Authentication & Security
- **JWT**: Token-based authentication
- **Passport**: Authentication middleware
- **bcryptjs**: Password hashing

### Background Processing
- **Bull/BullMQ**: Job queue system
- **Node-cron**: Scheduled tasks
- **Worker threads**: Parallel processing

### External APIs
- **GitBeaker**: GitLab API client
- **Axios**: HTTP client

### Monitoring & Logging
- **Winston**: Structured logging
- **Terminus**: Health checks
- **Custom metrics**: Performance monitoring

### Development & Testing
- **Jest**: Testing framework
- **Supertest**: API testing
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Design Patterns

### 1. Module Pattern
Each feature is organized as a self-contained module with:
- Controllers (API endpoints)
- Services (business logic)
- DTOs (data transfer objects)
- Guards (authorization)

### 2. Repository Pattern
Data access is abstracted through Prisma ORM, providing:
- Database independence
- Query optimization
- Transaction management

### 3. Observer Pattern
Real-time updates use the observer pattern:
- WebSocket connections as observers
- Sync jobs as subjects
- Event emission for state changes

### 4. Strategy Pattern
Storage backends use the strategy pattern:
- Common storage interface
- Pluggable implementations (local, S3, GCS)
- Runtime configuration

### 5. Factory Pattern
Configuration services use the factory pattern:
- Environment-based configuration
- Validation and defaults
- Type-safe configuration objects

## Scalability Considerations

### Horizontal Scaling

1. **Stateless Application Servers**
   - No server-side sessions
   - JWT tokens for authentication
   - Load balancer distribution

2. **Background Worker Scaling**
   - Multiple worker processes
   - Job queue distribution
   - Auto-scaling based on queue length

3. **Database Scaling**
   - Read replicas for queries
   - Connection pooling
   - Query optimization

### Vertical Scaling

1. **Resource Optimization**
   - Memory-efficient processing
   - CPU-intensive task optimization
   - I/O operation batching

2. **Caching Strategy**
   - Redis for frequently accessed data
   - Application-level caching
   - CDN for static assets

### Performance Optimization

1. **Database Optimization**
   - Proper indexing strategy
   - Query optimization
   - Connection pooling

2. **File Processing**
   - Streaming for large files
   - Parallel processing
   - Incremental updates

3. **API Performance**
   - Response compression
   - Pagination for large datasets
   - Rate limiting

### Monitoring & Alerting

1. **System Metrics**
   - CPU, memory, disk usage
   - Database performance
   - Queue statistics

2. **Application Metrics**
   - Request/response times
   - Error rates
   - Business metrics

3. **Alerting Rules**
   - Resource thresholds
   - Error rate spikes
   - Queue backlog alerts

## Security Architecture

### Authentication Flow
1. User provides credentials
2. Server validates against database
3. JWT token issued with user claims
4. Token validated on each request
5. User context available in controllers

### Authorization Levels
- **Public**: Health checks, documentation
- **Authenticated**: Basic API access
- **Project Member**: Project-specific operations
- **Project Admin**: Project management
- **System Admin**: System-wide operations

### Data Protection
- Password hashing with bcrypt
- JWT token encryption
- Environment variable secrets
- Database connection encryption
- API rate limiting

This architecture provides a solid foundation for a scalable, maintainable, and secure context engine system.
