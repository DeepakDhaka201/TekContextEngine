import { ConfigService } from '@nestjs/config';

export interface SyncWorkerPoolConfig {
  maxWorkers: number;
  maxQueueSize: number;
  timeoutMs: number;
}

export interface SyncChunkingConfig {
  maxChunkSize: number;
  overlapSize: number;
  minChunkSize: number;
}

export interface SyncIndexingConfig {
  enableSemanticSearch: boolean;
  enableSymbolExtraction: boolean;
  batchSize: number;
}

export interface SyncTaskConfig {
  workerPools: {
    file: SyncWorkerPoolConfig;
    codegraph: SyncWorkerPoolConfig;
    embedding: SyncWorkerPoolConfig;
    cleanup: SyncWorkerPoolConfig;
  };
  chunking: SyncChunkingConfig;
  indexing: SyncIndexingConfig;
  retryConfig: {
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
  };
  progressReporting: {
    intervalMs: number;
    enableWebSocket: boolean;
  };
}

export class SyncConfiguration {
  private static instance?: SyncConfiguration;
  private configService?: ConfigService;

  static getInstance(configService?: ConfigService): SyncConfiguration {
    if (!SyncConfiguration.instance) {
      SyncConfiguration.instance = new SyncConfiguration();
    }
    if (configService) {
      SyncConfiguration.instance.configService = configService;
    }
    return SyncConfiguration.instance;
  }

  getSyncTaskConfig(): SyncTaskConfig {
    if (!this.configService) {
      throw new Error('ConfigService not initialized in SyncConfiguration');
    }

    return {
      workerPools: {
        file: {
          maxWorkers: this.configService.get<number>('SYNC_FILE_WORKERS', 4),
          maxQueueSize: this.configService.get<number>('SYNC_FILE_QUEUE_SIZE', 1000),
          timeoutMs: this.configService.get<number>('SYNC_FILE_TIMEOUT_MS', 30000),
        },
        codegraph: {
          maxWorkers: this.configService.get<number>('SYNC_CODEGRAPH_WORKERS', 2),
          maxQueueSize: this.configService.get<number>('SYNC_CODEGRAPH_QUEUE_SIZE', 500),
          timeoutMs: this.configService.get<number>('SYNC_CODEGRAPH_TIMEOUT_MS', 60000),
        },
        embedding: {
          maxWorkers: this.configService.get<number>('SYNC_EMBEDDING_WORKERS', 2),
          maxQueueSize: this.configService.get<number>('SYNC_EMBEDDING_QUEUE_SIZE', 500),
          timeoutMs: this.configService.get<number>('SYNC_EMBEDDING_TIMEOUT_MS', 45000),
        },
        cleanup: {
          maxWorkers: this.configService.get<number>('SYNC_CLEANUP_WORKERS', 1),
          maxQueueSize: this.configService.get<number>('SYNC_CLEANUP_QUEUE_SIZE', 100),
          timeoutMs: this.configService.get<number>('SYNC_CLEANUP_TIMEOUT_MS', 10000),
        },
      },
      chunking: {
        maxChunkSize: this.configService.get<number>('SYNC_MAX_CHUNK_SIZE', 2000),
        overlapSize: this.configService.get<number>('SYNC_CHUNK_OVERLAP', 200),
        minChunkSize: this.configService.get<number>('SYNC_MIN_CHUNK_SIZE', 100),
      },
      indexing: {
        enableSemanticSearch: this.configService.get<boolean>('SYNC_ENABLE_SEMANTIC_SEARCH', true),
        enableSymbolExtraction: this.configService.get<boolean>('SYNC_ENABLE_SYMBOL_EXTRACTION', true),
        batchSize: this.configService.get<number>('SYNC_INDEXING_BATCH_SIZE', 50),
      },
      retryConfig: {
        maxRetries: this.configService.get<number>('SYNC_MAX_RETRIES', 3),
        retryDelayMs: this.configService.get<number>('SYNC_RETRY_DELAY_MS', 1000),
        exponentialBackoff: this.configService.get<boolean>('SYNC_EXPONENTIAL_BACKOFF', true),
      },
      progressReporting: {
        intervalMs: this.configService.get<number>('SYNC_PROGRESS_INTERVAL_MS', 5000),
        enableWebSocket: this.configService.get<boolean>('SYNC_ENABLE_WEBSOCKET', true),
      },
    };
  }

  validateConfig(): boolean {
    try {
      const config = this.getSyncTaskConfig();
      
      // Validate worker pool configurations
      Object.values(config.workerPools).forEach(pool => {
        if (pool.maxWorkers <= 0 || pool.maxQueueSize <= 0 || pool.timeoutMs <= 0) {
          throw new Error('Invalid worker pool configuration');
        }
      });

      // Validate chunking configuration
      if (config.chunking.maxChunkSize <= config.chunking.minChunkSize) {
        throw new Error('Max chunk size must be greater than min chunk size');
      }

      if (config.chunking.overlapSize >= config.chunking.minChunkSize) {
        throw new Error('Overlap size must be less than min chunk size');
      }

      return true;
    } catch (error) {
      console.error('Sync configuration validation failed:', error);
      return false;
    }
  }

  getConfigSummary(): Record<string, any> {
    const config = this.getSyncTaskConfig();
    return {
      totalWorkers: Object.values(config.workerPools).reduce((sum, pool) => sum + pool.maxWorkers, 0),
      totalQueueCapacity: Object.values(config.workerPools).reduce((sum, pool) => sum + pool.maxQueueSize, 0),
      chunkingEnabled: config.chunking.maxChunkSize > 0,
      semanticSearchEnabled: config.indexing.enableSemanticSearch,
      symbolExtractionEnabled: config.indexing.enableSymbolExtraction,
      retryEnabled: config.retryConfig.maxRetries > 0,
      websocketEnabled: config.progressReporting.enableWebSocket,
    };
  }
}