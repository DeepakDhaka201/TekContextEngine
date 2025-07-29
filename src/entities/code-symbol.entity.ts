import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Codebase } from './codebase.entity';
import { SymbolKind } from './enums';

@Entity('code_symbols')
@Unique(['codebase', 'symbolId'])
@Index(['codebase', 'kind'])
@Index(['name'])
export class CodeSymbol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  symbolId: string; // SCIP symbol ID

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: SymbolKind,
  })
  kind: SymbolKind;

  @Column({ type: 'varchar', length: 50 })
  language: string;

  // Position
  @Column({ type: 'int' })
  startLine: number;

  @Column({ type: 'int' })
  startColumn: number;

  @Column({ type: 'int' })
  endLine: number;

  @Column({ type: 'int' })
  endColumn: number;

  // Symbol information
  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({ type: 'text', nullable: true })
  documentation: string;

  @Column({ type: 'boolean', default: false })
  isDefinition: boolean;

  // BadgerDB reference
  @Column({ type: 'varchar', length: 500 })
  badgerKey: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    visibility?: 'public' | 'private' | 'protected' | 'internal';
    modifiers?: string[]; // static, final, abstract, etc.
    typeParameters?: string[];
    parameters?: Array<{
      name: string;
      type: string;
    }>;
    returnType?: string;
    implements?: string[];
    extends?: string[];
    annotations?: string[];
    relationships?: {
      definitions?: string[];
      references?: string[];
      implementations?: string[];
      inheritedFrom?: string;
      overrides?: string;
    };
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // File path within the codebase
  @Column({ type: 'varchar', length: 1000 })
  filePath: string;

  // Relations
  @ManyToOne(() => Codebase, (codebase) => codebase.symbols, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'codebase_id' })
  codebase: Codebase;
}