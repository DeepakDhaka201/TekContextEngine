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

export enum DocsBucketType {
  API_DOCS = 'API_DOCS',
  USER_FLOWS = 'USER_FLOWS',
  SECURITY_GUIDELINES = 'SECURITY_GUIDELINES',
  ARCHITECTURE = 'ARCHITECTURE',
  DEPLOYMENT = 'DEPLOYMENT',
  OTHER = 'OTHER',
}

export enum BucketStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('docs_buckets')
@Unique(['project', 'name'])
@Index(['project', 'type'])
export class DocsBucket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: DocsBucketType,
  })
  type: DocsBucketType;

  @Column({ type: 'varchar', length: 500 })
  storagePath: string;

  @Column({
    type: 'enum',
    enum: BucketStatus,
    default: BucketStatus.ACTIVE,
  })
  status: BucketStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    processingConfig?: {
      chunkSize?: number;
      chunkOverlap?: number;
      fileExtensions?: string[];
    };
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TekProject, (project) => project.docsBuckets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: TekProject;

  @OneToMany(() => Document, (document) => document.bucket)
  documents: Document[];
}