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
} from 'typeorm';
import { DocsBucket } from './docs-bucket.entity';
import { Codebase } from './codebase.entity';
import { DocumentType, FileStatus } from './enums';

@Entity('documents')
@Index(['bucket', 'status'])
@Index(['codebase', 'status'])
@Index(['hash'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1000 })
  path: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType;

  @Column({ type: 'varchar', length: 64 })
  hash: string;

  @Column({ type: 'int' })
  size: number;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.ACTIVE,
  })
  status: FileStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    author?: string;
    version?: string;
    tags?: string[];
    tableOfContents?: any[];
    language?: string;
    lastModified?: Date;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations - Either bucket or codebase, not both
  @ManyToOne(() => DocsBucket, (bucket) => bucket.documents, { 
    nullable: true, 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'bucket_id' })
  bucket: DocsBucket;

  @ManyToOne(() => Codebase, (codebase) => codebase.documents, { 
    nullable: true, 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'codebase_id' })
  codebase: Codebase;

}