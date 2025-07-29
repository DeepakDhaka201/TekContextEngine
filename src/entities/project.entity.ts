import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Codebase } from './codebase.entity';
import { DocsBucket } from './docs-bucket.entity';
import { ProjectStatus } from './enums';
import { IndexPipeline } from '../modules/indexing/entities/index-pipeline.entity';

@Entity('tek_projects')
@Index(['status'])
export class TekProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Codebase, (codebase) => codebase.project)
  codebases: Codebase[];

  @OneToMany(() => DocsBucket, (bucket) => bucket.project)
  docsBuckets: DocsBucket[];

  @OneToMany(() => IndexPipeline, (pipeline) => pipeline.project)
  indexPipelines: IndexPipeline[];

}