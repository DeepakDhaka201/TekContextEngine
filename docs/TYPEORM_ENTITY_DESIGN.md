# TypeORM Entity Design - TekAI Context Engine 2.0

## Overview

I've redesigned the entire entity model using TypeORM instead of Prisma for better clarity and more explicit relationship management. TypeORM provides decorator-based entity definitions similar to JPA/Hibernate, making it more familiar for Java Spring Boot developers.

## Key Improvements with TypeORM

### 1. **Explicit Relationships**
- Clear `@ManyToOne`, `@OneToMany`, `@ManyToMany` decorators
- Explicit join columns and tables
- Better control over cascade operations

### 2. **Better Type Safety**
- Strong TypeScript support with decorators
- Enum types are properly typed
- JSONB columns with typed interfaces

### 3. **Advanced Features**
- Built-in caching with Redis
- Custom naming strategies
- Query builder for complex queries
- Better migration support

## Entity Structure

### Core Entities

#### 1. **Project**
- Root entity for organizing codebases
- Self-referencing many-to-many for dependencies
- Contains codebases and documentation buckets

#### 2. **ProjectDependency**
- Explicit join table for project dependencies
- Tracks dependency type (compile, runtime, test, provided)
- Metadata for version constraints

#### 3. **DocsBucket**
- Project-level documentation containers
- Different types: API docs, user flows, security guidelines
- Configurable processing rules in metadata

#### 4. **Codebase**
- GitLab repository representation
- Sync modes: manual, auto, webhook
- Stores git configuration and sync state
- Tracks last synced commit for incremental sync

### File Entities

#### 5. **CodeFile**
- Individual code files in a codebase
- Hash-based change detection
- Language detection and metadata
- Relationships to chunks and symbols

#### 6. **Document**
- Documentation files (either in bucket or codebase)
- Support for various formats (Markdown, PDF, HTML, etc.)
- Metadata for author, version, tags

### Task Entities

#### 7. **SyncTask**
- Central orchestrator for sync operations
- Tracks file changes (added, modified, deleted)
- Git commit range for incremental sync
- Spawns parallel chunk and index tasks

#### 8. **ChunkTask**
- Handles chunking operations
- Two types: CODE_CHUNK (tree-sitter) and DOCUMENT_CHUNK (fixed-size)
- Tracks progress and failed files

#### 9. **IndexTask**
- Handles symbol indexing
- Types: SCIP, Tree-sitter, or combined
- Performance metrics in metadata

### Storage Entities

#### 10. **VectorChunk**
- Stores text chunks with embeddings
- Position information for source tracking
- Metadata for semantic type and complexity

#### 11. **CodeSymbol**
- Code symbols extracted via SCIP
- Full position and relationship information
- BadgerDB key for graph lookups
- Rich metadata for visibility, parameters, etc.

## Key Design Patterns

### 1. **Polymorphic Associations**
- VectorChunk can belong to either CodeFile or Document
- Document can belong to either DocsBucket or Codebase
- Using nullable foreign keys with constraints

### 2. **JSONB for Flexible Metadata**
- All entities have metadata columns
- Typed interfaces for known fields
- Extensible for future needs

### 3. **Enum-based Status Management**
- Consistent status enums across entities
- Type-safe status transitions
- Clear state machine patterns

### 4. **Audit Fields**
- All entities have createdAt/updatedAt
- Automatic timestamp management
- Support for soft deletes if needed

## Advantages Over Prisma

1. **Better OOP Support**: Entities are classes with methods
2. **Repository Pattern**: Built-in repository pattern
3. **Query Builder**: More flexible for complex queries
4. **Migration Control**: Better control over migrations
5. **Performance**: Lazy loading, eager loading control
6. **Caching**: Built-in second-level cache

## Example Usage

```typescript
// Creating a project with dependencies
const project = new Project();
project.name = 'Main Service';
project.slug = 'main-service';
project.dependencies = [authProject, dataProject];

// Creating a sync task
const syncTask = new SyncTask();
syncTask.taskType = SyncTaskType.INCREMENTAL_SYNC;
syncTask.codebase = codebase;
syncTask.baseCommit = 'abc123';

// Querying with relations
const projectWithDeps = await projectRepository.findOne({
  where: { id: projectId },
  relations: ['dependencies', 'codebases', 'docsBuckets'],
});

// Complex query with query builder
const activeCodebases = await codebaseRepository
  .createQueryBuilder('codebase')
  .leftJoinAndSelect('codebase.project', 'project')
  .leftJoinAndSelect('codebase.files', 'files')
  .where('codebase.status = :status', { status: CodebaseStatus.ACTIVE })
  .andWhere('files.language IN (:...languages)', { languages: ['typescript', 'java'] })
  .getMany();
```

## Next Steps

1. **Install TypeORM**: `npm install typeorm @nestjs/typeorm pg`
2. **Generate Migrations**: Create initial migration from entities
3. **Update Services**: Refactor services to use repositories
4. **Implement Worker Pools**: For parallel processing
5. **Add BadgerDB Integration**: For graph storage