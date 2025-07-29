import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TekProject, Codebase } from '@/entities';

export enum IndexPipelineType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL', 
  DOCUMENT = 'DOCUMENT',
  ANALYSIS = 'ANALYSIS',
}

export enum IndexPipelineStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum IndexPipelineTrigger {
  MANUAL = 'MANUAL',
  WEBHOOK = 'WEBHOOK',
  SCHEDULED = 'SCHEDULED',
}

export interface IndexPipelineConfig {
  // Git Sync Configuration
  gitSync: {
    baseCommit?: string;
    targetCommit?: string;
    incrementalMode: boolean;
    includeDeleted: boolean;
    maxFileSize: number; // 50MB default
    excludePatterns: string[]; // node_modules, .git, etc.
    timeout: number; // Git operation timeout
    shallow: boolean; // Shallow clone for large repos
  };

  // Docker Configuration
  docker: {
    enabled: boolean;
    networkMode: string; // bridge, host, none
    memoryLimit: string; // "2g"
    cpuLimit: string; // "1.5"
    timeout: number; // Container execution timeout
    registry: string; // Docker registry URL
    pullPolicy: 'always' | 'if-not-present' | 'never';
    cleanup: boolean; // Remove containers after execution
  };

  // Language-Specific Parsing
  parsing: {
    languages: {
      java: { enabled: boolean; dockerImage: string; jvmOptions: string[]; };
      typescript: { enabled: boolean; dockerImage: string; nodeOptions: string[]; };
      python: { enabled: boolean; dockerImage: string; pythonPath: string; };
      go: { enabled: boolean; dockerImage: string; goModules: boolean; };
      rust: { enabled: boolean; dockerImage: string; cargoFeatures: string[]; };
    };
    outputFormat: 'json' | 'protobuf';
    includePrivate: boolean;
    includeComments: boolean;
    includeTests: boolean;
    maxFileSize: number;
  };

  // Neo4j Configuration
  graph: {
    url: string;
    username: string;
    password: string;
    database: string; // Neo4j 4.0+ supports multiple DBs
    batchSize: number;
    enableVectorIndex: boolean;
    vectorDimensions: number;
    indexingMode: 'sync' | 'async';
    retainHistory: boolean; // Keep previous versions
    schema: {
      nodeLabels: string[];
      relationshipTypes: string[];
    };
  };

  // Performance/Scaling
  performance: {
    maxConcurrentTasks: number;
    taskTimeout: number;
    memoryLimit: string;
    tempDirCleanup: boolean;
    enableMetrics: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableProfiling: boolean;
    checkpointInterval: number; // Save progress every N minutes
  };

  // File Processing
  files: {
    includePaths: string[];
    excludePaths: string[];
    supportedExtensions: string[];
    encoding: string; // 'utf-8', 'latin1', etc.
    detectBinary: boolean;
    maxDepth: number; // Directory traversal depth
  };

  // Retry/Recovery
  retry: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    retryableErrors: string[]; // Which errors to retry
    failureThreshold: number; // % of failures before stopping
  };
}

export interface IndexPipelineMetadata {
  filesProcessed: number;
  symbolsExtracted: number;
  duration: number;
  steps: {
    [stepName: string]: {
      status: 'pending' | 'running' | 'completed' | 'failed';
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
      progress?: number;
    };
  };
  metrics: {
    linesOfCode: number;
    languages: Record<string, number>;
    fileTypes: Record<string, number>;
    errors: string[];
    warnings: string[];
  };
}

@Entity('index_pipelines')
export class IndexPipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: IndexPipelineType,
  })
  type: IndexPipelineType;

  @Column({
    type: 'enum', 
    enum: IndexPipelineStatus,
    default: IndexPipelineStatus.PENDING,
  })
  status: IndexPipelineStatus;

  @Column({
    type: 'enum',
    enum: IndexPipelineTrigger,
    default: IndexPipelineTrigger.MANUAL,
  })
  trigger: IndexPipelineTrigger;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentStep: string; // "git_sync", "code_parsing", etc.

  @Column({ type: 'int', default: 0 })
  progress: number; // 0-100

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  configuration: IndexPipelineConfig;

  @Column({ type: 'jsonb', nullable: true })
  metadata: IndexPipelineMetadata;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'text', nullable: true })
  errorStack: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TekProject, (project) => project.indexPipelines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: TekProject;

  @ManyToOne(() => Codebase, (codebase) => codebase.indexPipelines, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'codebase_id' })
  codebase: Codebase;

  // Helper methods
  isCompleted(): boolean {
    return this.status === IndexPipelineStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === IndexPipelineStatus.FAILED;
  }

  isRunning(): boolean {
    return this.status === IndexPipelineStatus.RUNNING;
  }

  canRetry(): boolean {
    return this.retryCount < this.configuration.retry.maxRetries && this.isFailed();
  }

  getDuration(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  getCurrentStepProgress(): number {
    if (!this.metadata?.steps || !this.currentStep) {
      return 0;
    }
    return this.metadata.steps[this.currentStep]?.progress || 0;
  }
}