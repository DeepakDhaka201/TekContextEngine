# Codegraph Module

The Codegraph module provides advanced code analysis and indexing capabilities for TekAIContextEngine2. It combines multiple technologies to create a comprehensive understanding of codebases through semantic analysis, structural parsing, and vector embeddings.

## Overview

The Codegraph module integrates three main technologies:

1. **SCIP (SCIP Code Intelligence Protocol)** - Provides semantic analysis and symbol relationships
2. **Tree-sitter** - Offers fast, incremental parsing for code structure analysis
3. **Vector Embeddings** - Enables semantic search and similarity matching

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SCIP Tools    │    │   Tree-sitter   │    │   Embeddings    │
│                 │    │                 │    │                 │
│ • TypeScript    │    │ • AST Parsing   │    │ • Text Chunks   │
│ • Python        │    │ • Symbol Ext.   │    │ • Vector Gen.   │
│ • Go, Java      │    │ • Structure     │    │ • Similarity    │
│ • Rust, etc.    │    │   Analysis      │    │   Search        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  BadgerDB       │
                    │  Storage        │
                    │                 │
                    │ • Key-Value     │
                    │ • Fast Access   │
                    │ • Persistence   │
                    └─────────────────┘
```

## Features

### 1. Multi-Language Support

- **TypeScript/JavaScript**: Full semantic analysis with SCIP
- **Python**: Symbol extraction and relationship mapping
- **Go**: Module and package analysis
- **Java**: Class hierarchy and dependency tracking
- **Rust**: Crate and module structure
- **C/C++**: Header and source file relationships

### 2. Indexing Capabilities

- **Incremental Processing**: Only processes changed files
- **Concurrent Execution**: Parallel processing for better performance
- **Error Recovery**: Graceful handling of parsing errors
- **Progress Tracking**: Real-time status updates via WebSocket

### 3. Storage and Retrieval

- **BadgerDB Integration**: High-performance key-value storage
- **Structured Data**: Organized storage with prefixed keys
- **Fast Queries**: Optimized for symbol lookup and search
- **Data Persistence**: Reliable storage across restarts

### 4. API Endpoints

#### Indexing Operations
- `POST /codegraph/:codebaseId/index` - Create indexing job
- `GET /codegraph/:codebaseId/jobs` - List indexing jobs
- `GET /codegraph/jobs/:jobId` - Get job details
- `DELETE /codegraph/jobs/:jobId` - Cancel job

#### Configuration
- `GET /codegraph/:codebaseId/config` - Get configuration
- `POST /codegraph/:codebaseId/config` - Update configuration

#### Search and Query
- `GET /codegraph/:codebaseId/search` - Search code semantically
- `GET /codegraph/:codebaseId/symbols/:symbol` - Get symbol info

#### Monitoring
- `GET /codegraph/metrics` - Get performance metrics
- `GET /codegraph/tools/status` - Check SCIP tools status

## Configuration

### Environment Variables

```bash
# General Settings
CODEGRAPH_ENABLED=true
BADGER_DB_PATH=./data/badger
BADGER_CACHE_SIZE=1000

# SCIP Configuration
SCIP_ENABLED=true
SCIP_TIMEOUT_SECONDS=1800
SCIP_TOOLS_PATH=/usr/local/bin

# Tree-sitter Settings
TREE_SITTER_ENABLED=true
TREE_SITTER_TIMEOUT_SECONDS=300
TREE_SITTER_MAX_CONCURRENCY=10

# Embedding Configuration
EMBEDDING_ENABLED=true
EMBEDDING_CHUNK_SIZE=1000
EMBEDDING_CHUNK_OVERLAP=200
EMBEDDING_MAX_TOKENS=8192

# Indexing Settings
INDEX_MAX_CONCURRENCY=10
INDEX_BATCH_SIZE=100
INDEX_AUTO_TRIGGER=true
```

### Per-Codebase Configuration

Each codebase can have custom configuration:

```typescript
interface CodegraphConfig {
  scipEnabled: boolean;
  treeSitterEnabled: boolean;
  embeddingEnabled: boolean;
  maxConcurrency: number;
  scipTimeout: number;
  parseTimeout: number;
  chunkSize: number;
  chunkOverlap: number;
  maxTokens: number;
  badgerDbPath?: string;
  scipToolsPath?: Record<string, string>;
  languageConfig?: Record<string, any>;
}
```

## Usage Examples

### 1. Creating an Indexing Job

```typescript
// Create a full codegraph indexing job
const response = await fetch('/api/v1/codegraph/codebase-id/index', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    taskType: 'CODEGRAPH',
    priority: 5,
    options: {
      enableEmbedding: true,
      enableScip: true,
      enableTreeSitter: true,
      forceReindex: false,
    },
  }),
});

const job = await response.json();
console.log('Job created:', job.id);
```

### 2. Monitoring Progress

```typescript
// Get job status
const jobResponse = await fetch(`/api/v1/codegraph/jobs/${job.id}`, {
  headers: { 'Authorization': 'Bearer <token>' },
});

const jobStatus = await jobResponse.json();
console.log(`Progress: ${jobStatus.processedFiles}/${jobStatus.totalFiles}`);
```

### 3. Searching Code

```typescript
// Semantic search
const searchResponse = await fetch(
  `/api/v1/codegraph/codebase-id/search?query=authentication function&type=semantic&limit=10`,
  {
    headers: { 'Authorization': 'Bearer <token>' },
  }
);

const results = await searchResponse.json();
console.log('Found:', results.results.length, 'matches');
```

### 4. Getting Symbol Information

```typescript
// Get symbol details
const symbolResponse = await fetch(
  `/api/v1/codegraph/codebase-id/symbols/authenticate?includeRelated=true`,
  {
    headers: { 'Authorization': 'Bearer <token>' },
  }
);

const symbolInfo = await symbolResponse.json();
console.log('Symbol:', symbolInfo.symbol);
console.log('Definitions:', symbolInfo.definitions.length);
console.log('References:', symbolInfo.references.length);
```

## Installation and Setup

### 1. SCIP Tools Installation

Install SCIP tools for the languages you want to analyze:

```bash
# TypeScript/JavaScript
npm install -g @sourcegraph/scip-typescript

# Python
pip install scip-python

# Go
go install github.com/sourcegraph/scip-go@latest

# Java (download from releases)
wget https://github.com/sourcegraph/scip-java/releases/latest/download/scip-java
chmod +x scip-java
sudo mv scip-java /usr/local/bin/

# Rust
cargo install scip-rust
```

### 2. Database Migration

Run the database migration to add codegraph tables:

```bash
npm run db:migrate
```

### 3. Configuration

Update your `.env` file with codegraph settings:

```bash
# Copy from .env.example
cp .env.example .env

# Edit configuration
nano .env
```

### 4. Verification

Check that everything is working:

```bash
# Start the application
npm run start:dev

# Check SCIP tools status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/codegraph/tools/status

# Check health
curl http://localhost:3000/api/v1/health/codegraph
```

## Performance Considerations

### 1. Concurrency Settings

- **Tree-sitter**: CPU-bound, limit to CPU cores
- **SCIP**: I/O-bound, can handle higher concurrency
- **Embeddings**: Memory-bound, consider available RAM

### 2. Storage Requirements

- **BadgerDB**: ~10-50MB per 1000 files
- **Embeddings**: ~1KB per chunk (varies by model)
- **SCIP Data**: ~5-20MB per project

### 3. Processing Time

Typical processing times per file:
- **Tree-sitter**: 1-10ms
- **SCIP**: 100-1000ms (includes build time)
- **Embeddings**: 50-200ms per chunk

## Troubleshooting

### Common Issues

1. **SCIP Tools Not Found**
   - Check `SCIP_TOOLS_PATH` configuration
   - Verify tools are installed and executable
   - Use `/codegraph/tools/status` endpoint to diagnose

2. **BadgerDB Errors**
   - Check disk space and permissions
   - Verify `BADGER_DB_PATH` is writable
   - Consider clearing cache if corrupted

3. **High Memory Usage**
   - Reduce `TREE_SITTER_MAX_CONCURRENCY`
   - Lower `EMBEDDING_CHUNK_SIZE`
   - Increase `BADGER_CACHE_SIZE` if needed

4. **Slow Indexing**
   - Check SCIP tool performance
   - Verify network connectivity for dependencies
   - Monitor system resources

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run start:dev
```

### Health Checks

Monitor codegraph health:

```bash
# Overall health
curl http://localhost:3000/api/v1/health/codegraph

# Detailed metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/codegraph/metrics
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the codegraph module.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
