import { IndexJob } from '../../entities/index-job.entity';
import { TekProject, Codebase } from '@/entities';

export interface JobContext {
  // Job information
  job: IndexJob;
  project: TekProject;
  codebase?: Codebase;

  // Execution context
  workingDirectory: string;
  tempDirectory: string;
  codebaseStoragePath: string; // Permanent storage path for the codebase

  // Data passed between tasks with specific keys
  data: {
    // Git sync results
    GIT_SYNC?: {
      clonePath: string;
      commitHash: string;
      filesChanged: string[];
      filesAdded: string[];
      filesDeleted: string[];
    };

    // Code parsing results
    CODE_PARSING?: {
      symbolsExtracted: number;
      filesProcessed: number;
      parsingResults: any[];
      languages: Record<string, number>;
    };

    // Document processing results
    DOC_PROCESSING?: {
      documentsProcessed: number;
      textExtracted: number;
      metadataExtracted: Record<string, any>[];
    };

    // Graph update results
    GRAPH_UPDATE?: {
      nodesCreated: number;
      nodesUpdated: number;
      relationshipsCreated: number;
      relationshipsUpdated: number;
    };

    // Analysis results
    API_ANALYSIS?: {
      endpointsDiscovered: number;
      dependenciesFound: number;
      analysisResults: any[];
    };

    USERFLOW_ANALYSIS?: {
      flowsDiscovered: number;
      stepsAnalyzed: number;
      analysisResults: any[];
    };

    // Cleanup results
    CLEANUP?: {
      tempFilesRemoved: number;
      diskSpaceFreed: number;
    };
  };

  // Metrics and progress
  metrics: {
    startTime: Date;
    taskTimes: Record<string, { start: Date; end?: Date; duration?: number }>;
    totalFilesProcessed: number;
    totalSymbolsExtracted: number;
    errors: Array<{ task: string; error: string; timestamp: Date }>;
    warnings: Array<{ task: string; warning: string; timestamp: Date }>;
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
