import { IndexPipeline, IndexPipelineConfig } from '../../entities/index-pipeline.entity';
import { TekProject, Codebase } from '@/entities';

export interface PipelineContext {
  // Pipeline information
  pipeline: IndexPipeline;
  project: TekProject;
  codebase?: Codebase;
  
  // Configuration
  config: IndexPipelineConfig;
  
  // Execution context
  workingDirectory: string;
  tempDirectory: string;
  codebaseStoragePath: string; // Permanent storage path for the codebase
  
  // Data passed between tasks
  data: {
    // Git sync results
    gitSync?: {
      clonePath: string;
      commitHash: string;
      filesChanged: string[];
      filesAdded: string[];
      filesDeleted: string[];
    };
    
    // Code parsing results
    codeParsing?: {
      symbolsExtracted: number;
      filesProcessed: number;
      parsingResults: any[];
      languages: Record<string, number>;
    };
    
    // Graph update results
    graphUpdate?: {
      nodesCreated: number;
      nodesUpdated: number;
      relationshipsCreated: number;
      relationshipsUpdated: number;
    };
    
    // Cleanup results
    cleanup?: {
      tempFilesRemoved: number;
      diskSpaceFreed: number;
    };
  };
  
  // Metrics and progress
  metrics: {
    startTime: Date;
    stepTimes: Record<string, { start: Date; end?: Date; duration?: number }>;
    totalFilesProcessed: number;
    totalSymbolsExtracted: number;
    errors: Array<{ step: string; error: string; timestamp: Date }>;
    warnings: Array<{ step: string; warning: string; timestamp: Date }>;
  };
  
  // Logging context
  logger: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };
}

export interface TaskExecutionResult {
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
  metrics?: {
    filesProcessed?: number;
    symbolsExtracted?: number;
    itemsCreated?: number;
    itemsUpdated?: number;
  };
}