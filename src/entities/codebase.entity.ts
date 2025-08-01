import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { TekProject } from './project.entity';
import { Document } from './document.entity';
import { IndexMode, CodebaseStatus } from './enums';
import { GitConfig } from '../config/git.config';
import { IndexPipeline } from '../modules/indexing/entities/index-pipeline.entity';

@Entity('codebases')
@Unique(['project', 'gitlabUrl'])
@Index(['project', 'status'])
export class Codebase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  gitlabUrl: string;

  @Column({ type: 'int', nullable: true })
  gitlabProjectId: number;

  @Column({ type: 'varchar', length: 100, default: 'main' })
  branch: string;

  @Column({ type: 'varchar', length: 500 })
  storagePath: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string;

  @Column({
    type: 'enum',
    enum: IndexMode,
    default: IndexMode.MANUAL,
  })
  syncMode: IndexMode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookSecret: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  lastSyncCommit: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAttemptAt: Date;

  @Column({
    type: 'enum',
    enum: CodebaseStatus,
    default: CodebaseStatus.PENDING,
  })
  status: CodebaseStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    gitConfig?: GitConfig;
    syncConfig?: {
      includePaths?: string[];
      excludePaths?: string[];
      maxFileSize?: number;
    };
    statistics?: {
      totalFiles?: number;
      totalLines?: number;
      languages?: Record<string, number>;
    };
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TekProject, (project) => project.codebases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: TekProject;


  @OneToMany(() => Document, (document) => document.codebase)
  documents: Document[];

  @OneToMany(() => IndexPipeline, (pipeline) => pipeline.codebase)
  indexPipelines: IndexPipeline[];
}