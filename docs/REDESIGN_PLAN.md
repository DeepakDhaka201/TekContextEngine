# TekAI Context Engine 2.0 - Redesign Plan

## Overview

This document outlines the comprehensive redesign of TekAI Context Engine to support:
- Multi-project architecture with inter-project dependencies
- GitLab integration with manual/auto/webhook sync
- Project-level documentation buckets
- Parallel chunking and indexing activities
- Focus on Java Spring Boot and TypeScript projects

## Core Architecture Changes

### 1. Entity Model Redesign

#### Projects with Dependencies
- Projects can depend on each other (compile, runtime, test dependencies)
- Each project contains multiple codebases and documentation buckets
- Projects have configurable metadata for processing

#### Documentation Buckets
- Project-level containers for different documentation types
- Types: API docs, user flows, security guidelines, architecture docs
- Stored on disk with configurable processing rules

#### Sync Task Entity
- Central entity driving the entire sync process
- Tracks file changes (added, modified, deleted)
- Spawns parallel chunk and index tasks
- Supports incremental sync with git commit tracking

### 2. GitLab Module Enhancement

#### Key Features
- Clone repositories to disk storage
- Incremental sync with commit history tracking
- File operations: get, archive, delete
- Webhook support for auto-sync
- Branch management

#### Storage Structure
```
/storage/
├── projects/
│   ├── {project-id}/
│   │   ├── codebases/
│   │   │   ├── {codebase-id}/
│   │   │   │   ├── .git/
│   │   │   │   ├── src/
│   │   │   │   └── .sync/
│   │   │   │       ├── last-commit
│   │   │   │       └── file-hashes.json
│   │   └── docs/
│   │       ├── api-docs/
│   │       ├── user-flows/
│   │       └── security-guidelines/
```

### 3. Parallel Processing Architecture

#### Activity 1: Chunking Pipeline
- **Code Files**: Tree-sitter based semantic chunking
- **Doc Files**: Configurable fixed-size chunking
- Store chunks in vector database with metadata
- Cleanup for deleted files

#### Activity 2: Symbol Indexing Pipeline
- SCIP-based symbol extraction
- BadgerDB for graph storage with backward relations
- Support for Java Spring Boot and TypeScript
- Tree-sitter for structural analysis

### 4. Thread Pool Implementation

#### Worker Pools
- **File Processing Pool**: For scanning and hashing
- **Chunking Pool**: For vector chunk generation
- **Indexing Pool**: For SCIP and tree-sitter processing
- **Embedding Pool**: For vector embedding generation

## Implementation Phases

### Phase 1: Database Schema Update
1. Create new Prisma schema with redesigned entities
2. Write migration scripts
3. Update seed data

### Phase 2: GitLab Module Rewrite
1. Implement git clone with sparse checkout
2. Add incremental sync logic
3. Implement webhook handlers
4. Add file operation APIs

### Phase 3: Sync Task Implementation
1. Create SyncTask service
2. Implement file change detection
3. Add progress tracking
4. Implement task orchestration

### Phase 4: Parallel Processing
1. Implement worker pool service
2. Create chunking processors
3. Create indexing processors
4. Add BadgerDB integration

### Phase 5: API Updates
1. Update DTOs for new entities
2. Create new endpoints
3. Update existing endpoints
4. Add webhook endpoints

## Key Services to Implement

### 1. ProjectDependencyService
- Manage project dependencies
- Resolve dependency graphs
- Handle circular dependencies

### 2. DocsBucketService
- Manage documentation storage
- Process different doc types
- Handle doc chunking

### 3. SyncTaskService
- Orchestrate sync operations
- Track progress
- Handle failures and retries

### 4. ChunkingService
- Tree-sitter integration for code
- Fixed-size chunking for docs
- Metadata extraction

### 5. SymbolIndexingService
- SCIP tool integration
- BadgerDB operations
- Symbol relationship management

### 6. WorkerPoolService
- Manage thread pools
- Task distribution
- Resource management

## Configuration Updates

### Environment Variables
```env
# Worker Pool Configuration
WORKER_POOL_FILE_PROCESSING_SIZE=10
WORKER_POOL_CHUNKING_SIZE=8
WORKER_POOL_INDEXING_SIZE=6
WORKER_POOL_EMBEDDING_SIZE=4

# Chunking Configuration
CHUNK_SIZE_CODE_TOKENS=1000
CHUNK_SIZE_DOC_CHARS=2000
CHUNK_OVERLAP_TOKENS=200

# SCIP Configuration
SCIP_JAVA_PATH=/usr/local/bin/scip-java
SCIP_TYPESCRIPT_PATH=/usr/local/bin/scip-typescript
SCIP_TIMEOUT_SECONDS=1800

# BadgerDB Configuration
BADGER_DB_PATH=/storage/badger
BADGER_VALUE_LOG_SIZE=1GB
BADGER_COMPRESSION=zstd
```

## Migration Strategy

1. **Backup Current Data**
2. **Run Schema Migration**
3. **Update Services Incrementally**
4. **Test Each Phase**
5. **Deploy with Feature Flags**

## Performance Considerations

- Use streaming for large file operations
- Implement connection pooling
- Use batch operations for database
- Implement caching strategically
- Monitor memory usage in worker pools

## Security Considerations

- Validate all file paths
- Implement rate limiting
- Use secure git operations
- Sanitize user inputs
- Implement access controls