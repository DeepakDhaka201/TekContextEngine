# Pipeline-Based Indexing Architecture

## Overview

The new pipeline-based indexing system replaces the legacy sync task approach with a more flexible, configurable, and scalable architecture. This system is designed around the concept of **IndexPipelines** that orchestrate multiple **Tasks** to process codebases and documents.

## Core Components

### 1. IndexPipeline Entity
- **Purpose**: Represents a complete indexing workflow
- **Types**: 
  - `FULL_CODEBASE_INDEX` - Complete codebase analysis
  - `INCREMENTAL_UPDATE` - Process only changed files
  - `DOCUMENT_UPLOAD` - Process uploaded documents
  - `DEPENDENCY_ANALYSIS` - Analyze project dependencies
  - `GRAPH_UPDATE` - Update knowledge graph only

### 2. PipelineTask Entity
- **Purpose**: Individual work units within a pipeline
- **Types**:
  - `GIT_SYNC` - Synchronize code from Git repository
  - `CODE_PARSING` - Parse code using language-specific analyzers
  - `DOCUMENT_PARSING` - Parse documents and extract content
  - `UPDATE_GRAPH` - Update Neo4j knowledge graph
  - `DEPENDENCY_ANALYSIS` - Analyze project dependencies
  - `CODEBASE_ANALYSIS` - Generate codebase metrics and insights

### 3. PipelineContext
- **Purpose**: Shared execution context for all tasks in a pipeline
- **Contains**:
  - Configuration for all task types
  - Working directories and temporary storage
  - Shared state between tasks
  - Logging and metrics collection
  - Database repositories and services

## Task Architecture

### BaseTask Abstract Class
All tasks inherit from `BaseTask` which provides:
- Dependency management
- Error handling and retry logic
- Progress tracking
- State management
- Validation framework

### Task Dependencies
Tasks can declare dependencies on other tasks:
- `GIT_SYNC` → No dependencies
- `CODE_PARSING` → Depends on `GIT_SYNC`
- `UPDATE_GRAPH` → Depends on `CODE_PARSING`

### Task Execution Flow
1. **Validation**: Check if task can run with current context
2. **Dependency Check**: Ensure all dependencies are satisfied
3. **Pre-execution**: Setup and status updates
4. **Execution**: Main task logic
5. **Post-execution**: Cleanup and result storage
6. **Error Handling**: Retry logic and failure management

## Configuration System

### PipelineConfiguration
Centralized configuration for all pipeline aspects:

```typescript
interface PipelineConfiguration {
  gitSync: GitSyncConfig;
  codeParsing: CodeParsingConfig;
  documentParsing: DocumentParsingConfig;
  graph: GraphConfig;
  dependencyAnalysis: DependencyAnalysisConfig;
  codebaseAnalysis: CodebaseAnalysisConfig;
  parallelism: ParallelismConfig;
}
```

### Language-Specific Parsing
- **Java**: Spoon analyzer via Docker
- **TypeScript**: ts-morph analyzer via Docker
- **Generic**: Fallback regex-based parsing
- **Docker Integration**: Isolated execution environment for analyzers

### Graph Integration
- **Neo4j**: Primary knowledge graph database
- **Vector Indexing**: Semantic search capabilities
- **Schema**: Industry-standard node and relationship types
- **Batch Processing**: Efficient bulk operations

## Pipeline Types

### Full Codebase Index
**Tasks**: `GIT_SYNC` → `CODE_PARSING` → `UPDATE_GRAPH`
- Complete repository clone/sync
- Parse all code files
- Build comprehensive knowledge graph

### Incremental Update
**Tasks**: `GIT_SYNC` → `CODE_PARSING` → `UPDATE_GRAPH`
- Git diff-based file detection
- Parse only changed files
- Update graph incrementally

### Document Upload
**Tasks**: `DOCUMENT_PARSING` → `UPDATE_GRAPH`
- Process uploaded documents
- Extract metadata and content
- Add to knowledge graph

### Dependency Analysis
**Tasks**: `DEPENDENCY_ANALYSIS` → `UPDATE_GRAPH`
- Analyze package managers (npm, maven, etc.)
- Map internal and external dependencies
- Update dependency relationships in graph

## API Endpoints

### Pipeline Management
- `POST /indexing/pipelines` - Create and start pipeline
- `GET /indexing/pipelines/:id` - Get pipeline status
- `DELETE /indexing/pipelines/:id` - Cancel pipeline

### Convenience Endpoints
- `POST /indexing/codebases/:id/full-index` - Start full indexing
- `POST /indexing/codebases/:id/incremental-update` - Incremental update
- `POST /indexing/projects/:id/dependency-analysis` - Dependency analysis

## Migration from Legacy System

### Deprecated Components
- `SyncTaskService` - Replace with `PipelineOrchestratorService`
- `CodebaseSyncTask` entity - Replace with `IndexPipeline`
- `ChunkTask` and `IndexTask` entities - Replace with `PipelineTask`

### Migration Path
```typescript
// Legacy
await syncTaskService.createCodebaseSyncTask({
  codebaseId: 'abc',
  taskType: SyncTaskType.FULL_SYNC
});

// New
await pipelineOrchestrator.createPipeline({
  projectId: 'project-id',
  codebaseId: 'abc',
  pipelineType: PipelineType.FULL_CODEBASE_INDEX,
  trigger: PipelineTrigger.MANUAL
});
```

## Benefits

### Flexibility
- Configurable task combinations
- Pipeline type-specific optimizations
- Custom configuration overrides

### Scalability
- Task-level parallelism
- Resource isolation via Docker
- Efficient batch processing

### Maintainability
- Clear separation of concerns
- Standardized task interface
- Comprehensive error handling

### Monitoring
- Real-time progress tracking
- Detailed metrics collection
- Task-level status reporting

## Future Enhancements

### Additional Tasks
- `VECTOR_INDEXING` - Generate embeddings for semantic search
- `CLEANUP` - Remove orphaned data
- `QUALITY_ANALYSIS` - Code quality metrics
- `SECURITY_SCAN` - Security vulnerability detection

### Advanced Features
- Pipeline templates
- Conditional task execution
- Task scheduling and cron triggers
- Multi-project pipelines
- Pipeline chaining and dependencies

### Performance Optimizations
- Task result caching
- Incremental graph updates
- Parallel task execution
- Resource usage optimization

## Conclusion

The new pipeline-based architecture provides a robust, scalable foundation for codebase indexing and analysis. It replaces the monolithic sync approach with a modular, configurable system that can adapt to different use cases and scale with growing requirements.