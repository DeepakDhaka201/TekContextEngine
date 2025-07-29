# Codegraph API Reference

This document provides detailed information about the Codegraph API endpoints.

## Base URL

All endpoints are prefixed with `/api/v1/codegraph`

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Indexing Operations

#### Create Index Job

Creates a new indexing job for a codebase.

```http
POST /codegraph/:codebaseId/index
```

**Parameters:**
- `codebaseId` (path, required): Unique identifier of the codebase

**Request Body:**
```json
{
  "taskType": "CODEGRAPH",
  "priority": 5,
  "metadata": {
    "description": "Full reindex after major changes"
  },
  "options": {
    "enableEmbedding": true,
    "enableScip": true,
    "enableTreeSitter": true,
    "forceReindex": false
  }
}
```

**Response:**
```json
{
  "id": "clx123456789",
  "taskType": "CODEGRAPH",
  "status": "PENDING",
  "totalFiles": 0,
  "processedFiles": 0,
  "failedFiles": 0,
  "ignoredFiles": 0,
  "startTime": null,
  "endTime": null,
  "durationMs": null,
  "errorMessage": null,
  "metadata": {
    "description": "Full reindex after major changes"
  },
  "codebaseName": "my-project",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Get Index Jobs

Retrieves all index jobs for a codebase.

```http
GET /codegraph/:codebaseId/jobs
```

**Response:**
```json
[
  {
    "id": "clx123456789",
    "taskType": "CODEGRAPH",
    "status": "SUCCESS",
    "totalFiles": 150,
    "processedFiles": 145,
    "failedFiles": 2,
    "ignoredFiles": 3,
    "startTime": "2024-01-15T10:30:00Z",
    "endTime": "2024-01-15T10:45:00Z",
    "durationMs": 900000,
    "errorMessage": null,
    "metadata": {},
    "codebaseName": "my-project",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:45:00Z"
  }
]
```

#### Get Specific Job

Retrieves details of a specific index job.

```http
GET /codegraph/jobs/:jobId
```

**Parameters:**
- `jobId` (path, required): Unique identifier of the job

#### Cancel Job

Cancels a running or pending index job.

```http
DELETE /codegraph/jobs/:jobId
```

**Response:** `204 No Content`

### Configuration Management

#### Get Configuration

Retrieves the codegraph configuration for a codebase.

```http
GET /codegraph/:codebaseId/config
```

**Response:**
```json
{
  "scipEnabled": true,
  "treeSitterEnabled": true,
  "embeddingEnabled": true,
  "maxConcurrency": 10,
  "scipTimeout": 1800,
  "parseTimeout": 300,
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "maxTokens": 8192,
  "badgerDbPath": null,
  "scipToolsPath": null,
  "languageConfig": null
}
```

#### Update Configuration

Updates the codegraph configuration for a codebase.

```http
POST /codegraph/:codebaseId/config
```

**Request Body:**
```json
{
  "scipEnabled": false,
  "treeSitterEnabled": true,
  "embeddingEnabled": true,
  "maxConcurrency": 5,
  "scipTimeout": 900,
  "parseTimeout": 180,
  "chunkSize": 800,
  "chunkOverlap": 150,
  "maxTokens": 4096
}
```

### Search and Query

#### Search Code

Performs semantic or symbol-based search across the codebase.

```http
GET /codegraph/:codebaseId/search
```

**Query Parameters:**
- `query` (required): Search query text
- `type` (optional): Search type (`semantic`, `symbol`, `definition`, `reference`)
- `limit` (optional): Number of results to return (1-100, default: 10)
- `filePath` (optional): Restrict search to specific file
- `language` (optional): Filter by programming language
- `symbolType` (optional): Filter by symbol type

**Example:**
```http
GET /codegraph/codebase123/search?query=authentication%20function&type=semantic&limit=5
```

**Response:**
```json
{
  "query": "authentication function",
  "type": "semantic",
  "results": [
    {
      "filePath": "src/auth/auth.service.ts",
      "startLine": 25,
      "endLine": 45,
      "content": "async authenticate(credentials: LoginCredentials): Promise<AuthResult>",
      "score": 0.95,
      "symbolType": "method",
      "language": "typescript"
    }
  ],
  "total": 1
}
```

#### Get Symbol Information

Retrieves detailed information about a specific symbol.

```http
GET /codegraph/:codebaseId/symbols/:symbol
```

**Query Parameters:**
- `symbolType` (optional): Type of symbol to search for
- `filePath` (optional): File path where symbol is located
- `includeRelated` (optional): Include related symbols (default: true)

**Response:**
```json
{
  "symbol": "authenticate",
  "symbolType": "function",
  "filePath": "src/auth/auth.service.ts",
  "definitions": [
    {
      "filePath": "src/auth/auth.service.ts",
      "startLine": 25,
      "endLine": 45,
      "content": "async authenticate(credentials: LoginCredentials): Promise<AuthResult>"
    }
  ],
  "references": [
    {
      "filePath": "src/controllers/auth.controller.ts",
      "startLine": 15,
      "endLine": 15,
      "content": "const result = await this.authService.authenticate(req.body);"
    }
  ],
  "relationships": [
    {
      "type": "calls",
      "target": "validateCredentials",
      "filePath": "src/auth/validators.ts"
    }
  ]
}
```

### Monitoring and Metrics

#### Get Metrics

Retrieves comprehensive codegraph metrics and statistics.

```http
GET /codegraph/metrics
```

**Response:**
```json
{
  "indexing": {
    "totalJobs": 25,
    "successfulJobs": 23,
    "failedJobs": 1,
    "runningJobs": 1,
    "averageDuration": 450000,
    "successRate": 92.0,
    "jobsByType": {
      "EMBEDDING": 10,
      "CODEGRAPH": 8,
      "SCIP": 4,
      "TREE_SITTER": 3
    },
    "jobsByStatus": {
      "PENDING": 0,
      "RUNNING": 1,
      "SUCCESS": 23,
      "FAILED": 1,
      "CANCELLED": 0,
      "PARTIAL_SUCCESS": 0
    }
  },
  "storage": {
    "totalKeys": 15420,
    "diskUsage": 52428800,
    "cacheSize": 1000,
    "embeddingCount": 8750,
    "averageEmbeddingsPerFile": 5.8
  },
  "performance": {
    "averageFilesPerMinute": 12.5,
    "averageTokensPerSecond": 2500,
    "peakConcurrency": 8,
    "errorRate": 2.1
  },
  "languages": {
    "distribution": {
      "typescript": 850,
      "javascript": 320,
      "python": 180,
      "go": 95
    },
    "indexedFiles": {
      "typescript": 845,
      "javascript": 318,
      "python": 175,
      "go": 92
    },
    "successRates": {
      "typescript": 99.4,
      "javascript": 99.4,
      "python": 97.2,
      "go": 96.8
    }
  }
}
```

#### Get Performance Metrics

Retrieves indexing performance metrics over time.

```http
GET /codegraph/metrics/performance
```

**Query Parameters:**
- `hours` (optional): Hours to look back (default: 24)

**Response:**
```json
[
  {
    "period": "2024-01-15T10:00:00.000Z",
    "totalFiles": 150,
    "processedFiles": 145,
    "failedFiles": 5,
    "averageDuration": 450000,
    "throughput": 12.5,
    "errorRate": 3.3
  },
  {
    "period": "2024-01-15T11:00:00.000Z",
    "totalFiles": 200,
    "processedFiles": 198,
    "failedFiles": 2,
    "averageDuration": 380000,
    "throughput": 15.2,
    "errorRate": 1.0
  }
]
```

### SCIP Tools Management

#### Get Tools Status

Retrieves the status of installed SCIP tools.

```http
GET /codegraph/tools/status
```

**Response:**
```json
{
  "toolsPath": "/usr/local/bin",
  "tools": {
    "scip-typescript": {
      "name": "scip-typescript",
      "path": "/usr/local/bin/scip-typescript",
      "version": "0.3.15",
      "available": true,
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "scip-python": {
      "name": "scip-python",
      "path": "/usr/local/bin/scip-python",
      "version": "0.2.8",
      "available": true,
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "scip-go": {
      "name": "scip-go",
      "path": "/usr/local/bin/scip-go",
      "version": "unknown",
      "available": false,
      "lastChecked": "2024-01-15T10:30:00Z"
    }
  },
  "totalAvailable": 2,
  "totalSupported": 3,
  "lastChecked": "2024-01-15T10:30:00Z"
}
```

#### Install Tools

Initiates installation of SCIP tools (if installation script is configured).

```http
POST /codegraph/tools/install
```

**Response:**
```json
{
  "success": true,
  "message": "Installation completed. 3 tools available.",
  "details": [
    "STDOUT: Installing scip-typescript...",
    "STDOUT: Installing scip-python...",
    "Installation completed. 3/3 tools available."
  ]
}
```

#### Get Installation Instructions

Retrieves manual installation instructions for SCIP tools.

```http
GET /codegraph/tools/instructions
```

**Response:**
```json
{
  "scip-typescript": "\n        npm install -g @sourcegraph/scip-typescript\n        # or\n        yarn global add @sourcegraph/scip-typescript\n      ",
  "scip-python": "\n        pip install scip-python\n        # or\n        pipx install scip-python\n      ",
  "scip-go": "\n        go install github.com/sourcegraph/scip-go@latest\n      "
}
```

#### Validate Configuration

Validates the current SCIP tools configuration.

```http
POST /codegraph/tools/validate
```

**Response:**
```json
{
  "valid": false,
  "issues": [
    "No SCIP tools are available"
  ],
  "recommendations": [
    "Install at least one SCIP tool to enable semantic analysis",
    "Increase SCIP timeout for large repositories"
  ]
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Codebase with ID codebase123 not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## Rate Limiting

API endpoints are subject to rate limiting:
- **Indexing operations**: 10 requests per minute per user
- **Search operations**: 100 requests per minute per user
- **Configuration**: 20 requests per minute per user
- **Monitoring**: 60 requests per minute per user

## WebSocket Events

Real-time updates are available via WebSocket connection to `/ws`:

### Index Progress
```json
{
  "event": "indexProgress",
  "data": {
    "jobId": "clx123456789",
    "codebaseId": "codebase123",
    "status": "RUNNING",
    "totalFiles": 150,
    "processedFiles": 75,
    "message": "Processing TypeScript files..."
  }
}
```

### Index Complete
```json
{
  "event": "indexComplete",
  "data": {
    "jobId": "clx123456789",
    "codebaseId": "codebase123",
    "status": "SUCCESS",
    "message": "Indexing completed successfully"
  }
}
```

### Index Error
```json
{
  "event": "indexError",
  "data": {
    "jobId": "clx123456789",
    "codebaseId": "codebase123",
    "status": "FAILED",
    "error": "SCIP tool not found for TypeScript"
  }
}
```
