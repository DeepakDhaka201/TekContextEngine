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

export enum IndexJobType {
  CODEBASE_FULL = 'CODEBASE_FULL',
  CODEBASE_INCR = 'CODEBASE_INCR',
  DOCS_BUCKET_FULL = 'DOCS_BUCKET_FULL',
  DOCS_BUCKET_INCR = 'DOCS_BUCKET_INCR',
  API_ANALYSIS = 'API_ANALYSIS',
  USERFLOW_ANALYSIS = 'USERFLOW_ANALYSIS',
}

export enum IndexJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum IndexJobTrigger {
  MANUAL = 'MANUAL',
  WEBHOOK = 'WEBHOOK',
  SCHEDULED = 'SCHEDULED',
}

// Task-specific configuration interfaces
export interface TaskConfig {
  enabled: boolean;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface GitSyncConfig extends TaskConfig {
  baseCommit?: string;
  targetCommit?: string;
  incrementalMode: boolean;
  includeDeleted: boolean;
  maxFileSize: number;
  excludePatterns: string[];
  shallow: boolean;
}

export interface CodeParsingConfig extends TaskConfig {
  languages: {
    [language: string]: {
      enabled: boolean;
      dockerImage?: string;
      options?: string[];
    };
  };
  outputFormat: 'json' | 'protobuf';
  maxFileSize: number;
}

export interface GraphUpdateConfig extends TaskConfig {
  url: string;
  username: string;
  password: string;
  database: string;
  batchSize: number;
  enableVectorIndex: boolean;
  vectorDimensions: number;
  indexingMode: 'sync' | 'async';
}

export interface DocProcessingConfig extends TaskConfig {
  supportedFormats: string[];
  extractText: boolean;
  extractMetadata: boolean;
  chunkSize: number;
}

export interface AnalysisConfig extends TaskConfig {
  analysisType: 'api' | 'userflow' | 'dependency';
  depth: number;
  includeExternal: boolean;
}

export interface IndexJobMetadata {
  filesProcessed: number;
  symbolsExtracted: number;
  duration: number;
  tasks: {
    [taskName: string]: {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
      progress?: number;
      config?: TaskConfig;
    };
  };
  metrics: {
    languages: Record<string, number>;
    fileTypes: Record<string, number>;
    errors: string[];
    warnings: string[];
  };
}

@Entity('index_jobs')
export class IndexJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: IndexJobType,
  })
  type: IndexJobType;

  @Column({
    type: 'enum', 
    enum: IndexJobStatus,
    default: IndexJobStatus.PENDING,
  })
  status: IndexJobStatus;

  @Column({
    type: 'enum',
    enum: IndexJobTrigger,
    default: IndexJobTrigger.MANUAL,
  })
  trigger: IndexJobTrigger;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentTask: string; // "GIT_SYNC", "CODE_PARSING", etc.

  @Column({ type: 'int', default: 0 })
  progress: number; // 0-100

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: IndexJobMetadata;

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
  @ManyToOne(() => TekProject, (project) => project.indexJobs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: TekProject;

  @ManyToOne(() => Codebase, (codebase) => codebase.indexJobs, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'codebase_id' })
  codebase: Codebase;

  // Helper methods
  isCompleted(): boolean {
    return this.status === IndexJobStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === IndexJobStatus.FAILED;
  }

  isRunning(): boolean {
    return this.status === IndexJobStatus.RUNNING;
  }

  canRetry(): boolean {
    const maxRetries = 3; // Default max retries, can be made configurable
    return this.retryCount < maxRetries && this.isFailed();
  }

  getDuration(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  getCurrentTaskProgress(): number {
    if (!this.metadata?.tasks || !this.currentTask) {
      return 0;
    }
    return this.metadata.tasks[this.currentTask]?.progress || 0;
  }

  getTasksForJobType(): string[] {
    switch (this.type) {
      case IndexJobType.CODEBASE_FULL:
      case IndexJobType.CODEBASE_INCR:
        return ['GIT_SYNC', 'CODE_PARSING', 'GRAPH_UPDATE', 'CLEANUP'];
      case IndexJobType.DOCS_BUCKET_FULL:
      case IndexJobType.DOCS_BUCKET_INCR:
        return ['DOC_SYNC', 'DOC_PROCESSING', 'GRAPH_UPDATE', 'CLEANUP'];
      case IndexJobType.API_ANALYSIS:
        return ['API_DISCOVERY', 'API_ANALYSIS', 'GRAPH_UPDATE', 'CLEANUP'];
      case IndexJobType.USERFLOW_ANALYSIS:
        return ['USERFLOW_DISCOVERY', 'USERFLOW_ANALYSIS', 'GRAPH_UPDATE', 'CLEANUP'];
      default:
        return [];
    }
  }
}
