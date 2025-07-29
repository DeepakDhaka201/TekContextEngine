# Migration Guide: From Legacy Sync Tasks to Pipeline-Based Indexing

## Overview

This guide helps you migrate from the legacy sync task system to the new pipeline-based indexing architecture. The new system provides better flexibility, scalability, and maintainability.

## Deprecated Components

### Entities (Marked for Removal)
- `CodebaseSyncTask` → Use `IndexPipeline`
- `ChunkTask` → Use `PipelineTask` with type `VECTOR_INDEXING`
- `IndexTask` → Use `PipelineTask` with type `CODE_PARSING`

### Services (Marked for Removal)
- `SyncTaskService` → Use `PipelineOrchestratorService`
- `SyncSchedulerService` → Use pipeline triggers instead
- `ChunkingService` → Integrated into tasks
- `SymbolIndexingService` → Integrated into `CodeParsingTask`

### Enums (Will be Removed)
- `SyncTaskType` → Use `PipelineType`
- `ChunkTaskType` → Use `TaskType`
- `IndexTaskType` → Use `TaskType`

## Migration Steps

### 1. Update Your Code

#### Creating a Full Sync
**Before (Legacy):**
```typescript
import { SyncTaskService } from '@/modules/sync/sync-task.service';

await syncTaskService.createCodebaseSyncTask({
  codebaseId: 'codebase-123',
  taskType: SyncTaskType.FULL_SYNC,
  trigger: SyncTrigger.MANUAL,
  options: {
    enableSimilarityIndex: true,
    enableGraphIndexing: true
  }
});
```

**After (Pipeline):**
```typescript
import { PipelineOrchestratorService } from '@/modules/indexing/pipeline/pipeline-orchestrator.service';
import { PipelineType, PipelineTrigger } from '@/modules/indexing/pipeline/index-pipeline.entity';

await pipelineOrchestrator.createPipeline({
  projectId: 'project-456',
  codebaseId: 'codebase-123',
  pipelineType: PipelineType.FULL_CODEBASE_INDEX,
  trigger: PipelineTrigger.MANUAL,
  customConfiguration: {
    graph: {
      enableVectorIndexing: true
    }
  }
});
```

#### Creating an Incremental Update
**Before (Legacy):**
```typescript
await syncTaskService.createCodebaseSyncTask({
  codebaseId: 'codebase-123',
  taskType: SyncTaskType.INCREMENTAL_SYNC,
  trigger: SyncTrigger.WEBHOOK,
  baseCommit: 'abc123',
  options: {
    enableSimilarityIndex: true
  }
});
```

**After (Pipeline):**
```typescript
await pipelineOrchestrator.createPipeline({
  projectId: 'project-456',
  codebaseId: 'codebase-123',
  pipelineType: PipelineType.INCREMENTAL_UPDATE,
  trigger: PipelineTrigger.WEBHOOK,
  baseCommit: 'abc123',
  targetCommit: 'def456'
});
```

### 2. Update API Calls

#### REST API Changes
**Before:**
```bash
POST /sync/tasks
{
  "codebaseId": "codebase-123",
  "taskType": "FULL_SYNC"
}
```

**After:**
```bash
POST /indexing/pipelines
{
  "projectId": "project-456",
  "codebaseId": "codebase-123",
  "pipelineType": "FULL_CODEBASE_INDEX",
  "trigger": "MANUAL"
}
```

#### Convenience Endpoints
```bash
# Full indexing
POST /indexing/codebases/{id}/full-index

# Incremental update
POST /indexing/codebases/{id}/incremental-update?baseCommit=abc123

# Dependency analysis
POST /indexing/projects/{id}/dependency-analysis
```

### 3. Update Status Checking

**Before:**
```typescript
const syncTask = await syncTaskService.getCodebaseSyncTaskStatus(taskId);
console.log(syncTask.status, syncTask.progress);
```

**After:**
```typescript
const pipeline = await pipelineOrchestrator.getPipelineStatus(pipelineId);
console.log(pipeline.status, pipeline.progress);
// Access individual task statuses
pipeline.tasks.forEach(task => {
  console.log(task.name, task.status, task.progress);
});
```

### 4. Update Webhook Handlers

**Before:**
```typescript
@Post('webhook')
async handleGitlabWebhook(@Body() payload: any) {
  await syncTaskService.createCodebaseSyncTask({
    codebaseId: payload.project.id,
    taskType: SyncTaskType.INCREMENTAL_SYNC,
    trigger: SyncTrigger.WEBHOOK
  });
}
```

**After:**
```typescript
@Post('webhook')
async handleGitlabWebhook(@Body() payload: any) {
  await pipelineOrchestrator.createPipeline({
    projectId: projectId,
    codebaseId: codebaseId,
    pipelineType: PipelineType.INCREMENTAL_UPDATE,
    trigger: PipelineTrigger.WEBHOOK,
    baseCommit: payload.before,
    targetCommit: payload.after
  });
}
```

### 5. Update Scheduled Tasks

**Before:**
```typescript
@Cron('0 0 * * *')
async scheduledSync() {
  const codebases = await this.getActiveCodebases();
  for (const codebase of codebases) {
    await syncTaskService.createCodebaseSyncTask({
      codebaseId: codebase.id,
      taskType: SyncTaskType.INCREMENTAL_SYNC,
      trigger: SyncTrigger.SCHEDULED
    });
  }
}
```

**After:**
```typescript
@Cron('0 0 * * *')
async scheduledSync() {
  const codebases = await this.getActiveCodebases();
  for (const codebase of codebases) {
    await pipelineOrchestrator.createPipeline({
      projectId: codebase.project.id,
      codebaseId: codebase.id,
      pipelineType: PipelineType.INCREMENTAL_UPDATE,
      trigger: PipelineTrigger.SCHEDULED
    });
  }
}
```

## Configuration Changes

### Environment Variables

**New Variables:**
```bash
# Pipeline Configuration
PIPELINE_WORK_DIR=/tmp/pipelines
PIPELINE_MAX_CONCURRENT_TASKS=4
PIPELINE_TASK_TIMEOUT_MS=1800000

# Git Sync
GIT_SYNC_MAX_FILE_SIZE=52428800
GIT_SYNC_EXCLUDE_PATTERNS=node_modules/**,.git/**

# Code Parsing
CODE_PARSING_DOCKER_ENABLED=true
DOCKER_IMAGE_JAVA_PARSER=tekai/java-parser:latest
DOCKER_IMAGE_TS_PARSER=tekai/ts-parser:latest

# Neo4j Graph
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
GRAPH_ENABLE_VECTOR_INDEXING=true
```

### Custom Configuration

You can override default configurations per pipeline:

```typescript
await pipelineOrchestrator.createPipeline({
  // ... other params
  customConfiguration: {
    gitSync: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      excludePatterns: ['*.log', 'dist/**']
    },
    codeParsing: {
      enableJavaSpoon: true,
      includePrivateMembers: false
    },
    graph: {
      batchSize: 200,
      enableVectorIndexing: true
    }
  }
});
```

## Benefits After Migration

1. **Better Visibility**: Track individual task progress and status
2. **More Flexibility**: Configure pipeline behavior per execution
3. **Better Error Handling**: Task-level retry and failure isolation
4. **Improved Performance**: Parallel task execution
5. **Enhanced Features**: Neo4j graph integration, Docker-based parsing

## Timeline

- **Phase 1 (Current)**: Both systems coexist, new features use pipeline system
- **Phase 2 (3 months)**: Legacy system marked as deprecated
- **Phase 3 (6 months)**: Legacy system removed from codebase

## Support

For help with migration:
1. Check the [Pipeline Architecture Documentation](./PIPELINE_ARCHITECTURE.md)
2. Review example implementations in the codebase
3. Contact the development team for specific migration assistance

## Checklist

- [ ] Update all `SyncTaskService` calls to `PipelineOrchestratorService`
- [ ] Update API endpoints from `/sync/*` to `/indexing/*`
- [ ] Update webhook handlers to use pipeline system
- [ ] Update scheduled tasks to use pipeline system
- [ ] Update monitoring/logging to track pipeline metrics
- [ ] Test migration in staging environment
- [ ] Update documentation and runbooks
- [ ] Train team on new pipeline system