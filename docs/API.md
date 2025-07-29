# API Documentation

TekAI Context Engine 2.0 provides a comprehensive REST API for managing projects, codebases, and synchronization jobs.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

The API uses JWT Bearer token authentication.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER"
    }
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Projects API

### List Projects

```http
GET /projects?page=1&limit=20&status=ACTIVE
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-id",
      "name": "My Project",
      "description": "Project description",
      "slug": "my-project",
      "status": "ACTIVE",
      "codebaseCount": 3,
      "members": [
        {
          "userId": "user-id",
          "userName": "User Name",
          "role": "OWNER"
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "slug": "new-project",
  "settings": {}
}
```

### Get Project

```http
GET /projects/{id}
Authorization: Bearer <token>
```

### Update Project

```http
PATCH /projects/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

### Delete Project

```http
DELETE /projects/{id}
Authorization: Bearer <token>
```

## Codebases API

### List Codebases

```http
GET /codebases?projectId=project-id&status=ACTIVE
Authorization: Bearer <token>
```

### Create Codebase

```http
POST /codebases/projects/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Repository",
  "description": "Repository description",
  "gitlabUrl": "https://gitlab.com/user/repo",
  "branch": "main",
  "language": "TypeScript",
  "settings": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "codebase-id",
    "name": "My Repository",
    "gitlabUrl": "https://gitlab.com/user/repo",
    "branch": "main",
    "status": "PENDING",
    "totalFiles": 0,
    "totalLines": 0,
    "projectId": "project-id",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get Codebase

```http
GET /codebases/{id}
Authorization: Bearer <token>
```

### Trigger Sync

```http
POST /codebases/{id}/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "INCREMENTAL_SYNC"
}
```

### Get Codebase Statistics

```http
GET /codebases/{id}/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 150,
    "totalSize": 2048576,
    "languages": [
      {
        "language": "TypeScript",
        "fileCount": 120,
        "totalSize": 1800000
      },
      {
        "language": "JavaScript",
        "fileCount": 30,
        "totalSize": 248576
      }
    ],
    "lastSyncAt": "2024-01-01T12:00:00Z",
    "syncJobsCount": 5
  }
}
```

## Sync API

### List Sync Jobs

```http
GET /sync/jobs?codebaseId=codebase-id&status=RUNNING
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "job-id",
      "type": "INCREMENTAL_SYNC",
      "status": "RUNNING",
      "progress": 75,
      "message": "Processing files...",
      "codebaseId": "codebase-id",
      "codebaseName": "My Repository",
      "startedAt": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Create Sync Job

```http
POST /sync/jobs/{codebaseId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "FULL_RESYNC",
  "priority": 5,
  "metadata": {
    "reason": "manual_trigger"
  }
}
```

### Get Sync Job

```http
GET /sync/jobs/{id}
Authorization: Bearer <token>
```

### Cancel Sync Job

```http
DELETE /sync/jobs/{id}
Authorization: Bearer <token>
```

### Trigger Project Sync

```http
POST /sync/trigger/project/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "INCREMENTAL_SYNC"
}
```

## Health API

### Basic Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    }
  }
}
```

### Detailed Health Information

```http
GET /health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "version": "2.0.0",
  "environment": "production",
  "healthScore": 95,
  "issues": [],
  "services": {
    "database": {
      "status": "healthy",
      "counts": {
        "users": 10,
        "projects": 5,
        "codebases": 15,
        "files": 1500
      }
    },
    "cache": {
      "status": "healthy",
      "connectedClients": 2,
      "usedMemory": 1048576,
      "totalKeys": 100
    },
    "storage": {
      "status": "healthy",
      "totalSize": 104857600,
      "fileCount": 1500,
      "codebaseCount": 15
    }
  }
}
```

### System Metrics

```http
GET /health/metrics
```

### System Alerts

```http
GET /health/alerts
```

## WebSocket API

The application provides real-time updates via WebSocket connections.

### Connection

```javascript
const socket = io('http://localhost:3000/sync');

socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

### Subscribe to Updates

```javascript
// Join project room for updates
socket.emit('join:project', { projectId: 'project-id' });

// Join codebase room for updates
socket.emit('join:codebase', { codebaseId: 'codebase-id' });

// Subscribe to notifications
socket.emit('subscribe:notifications', { 
  userId: 'user-id',
  projectId: 'project-id' 
});
```

### Listen for Events

```javascript
// Sync status updates
socket.on('sync:status', (update) => {
  console.log('Sync update:', update);
  // {
  //   syncJobId: 'job-id',
  //   codebaseId: 'codebase-id',
  //   status: 'RUNNING',
  //   progress: 75,
  //   message: 'Processing files...'
  // }
});

// Notifications
socket.on('notification', (notification) => {
  console.log('Notification:', notification);
  // {
  //   type: 'success',
  //   title: 'Sync Completed',
  //   message: 'Repository sync completed successfully',
  //   timestamp: '2024-01-01T12:00:00Z'
  // }
});

// System status updates
socket.on('system:status', (status) => {
  console.log('System status:', status);
});
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General API**: 100 requests per minute
- **Sync operations**: 10 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Sort field (default: 'createdAt')
- `sortOrder` - Sort direction: 'asc' or 'desc' (default: 'desc')

## Interactive Documentation

When the application is running, you can access interactive API documentation at:

```
http://localhost:3000/api/docs
```

This provides a Swagger UI interface for testing API endpoints directly.
