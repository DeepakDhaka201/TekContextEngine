import { ConfigService } from '@nestjs/config';

export interface ProcessingTimeouts {
  simulationDelayMs: number;
  fileProcessingTimeoutMs: number;
  chunkProcessingTimeoutMs: number;
  indexProcessingTimeoutMs: number;
}

export interface ProcessingLimits {
  maxFileSize: number;
  maxBatchSize: number;
  maxConcurrentTasks: number;
  maxRetryAttempts: number;
}

export interface ProcessingConfiguration {
  timeouts: ProcessingTimeouts;
  limits: ProcessingLimits;
  enableParallelProcessing: boolean;
  enableProgressReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class ProcessingConfig {
  private static instance?: ProcessingConfig;
  private configService?: ConfigService;

  static getInstance(configService?: ConfigService): ProcessingConfig {
    if (!ProcessingConfig.instance) {
      ProcessingConfig.instance = new ProcessingConfig();
    }
    if (configService) {
      ProcessingConfig.instance.configService = configService;
    }
    return ProcessingConfig.instance;
  }

  getProcessingConfig(): ProcessingConfiguration {
    if (!this.configService) {
      throw new Error('ConfigService not initialized in ProcessingConfig');
    }

    return {
      timeouts: {
        simulationDelayMs: this.configService.get<number>('PROCESSING_SIMULATION_DELAY_MS', 100),
        fileProcessingTimeoutMs: this.configService.get<number>('PROCESSING_FILE_TIMEOUT_MS', 30000),
        chunkProcessingTimeoutMs: this.configService.get<number>('PROCESSING_CHUNK_TIMEOUT_MS', 60000),
        indexProcessingTimeoutMs: this.configService.get<number>('PROCESSING_INDEX_TIMEOUT_MS', 120000),
      },
      limits: {
        maxFileSize: this.configService.get<number>('PROCESSING_MAX_FILE_SIZE_MB', 50) * 1024 * 1024,
        maxBatchSize: this.configService.get<number>('PROCESSING_MAX_BATCH_SIZE', 100),
        maxConcurrentTasks: this.configService.get<number>('PROCESSING_MAX_CONCURRENT_TASKS', 10),
        maxRetryAttempts: this.configService.get<number>('PROCESSING_MAX_RETRY_ATTEMPTS', 3),
      },
      enableParallelProcessing: this.configService.get<boolean>('PROCESSING_ENABLE_PARALLEL', true),
      enableProgressReporting: this.configService.get<boolean>('PROCESSING_ENABLE_PROGRESS', true),
      logLevel: this.configService.get<'debug' | 'info' | 'warn' | 'error'>('PROCESSING_LOG_LEVEL', 'info'),
    };
  }

  getSimulationDelay(taskType: 'chunk' | 'index' | 'file'): number {
    const config = this.getProcessingConfig();
    const baseDelay = config.timeouts.simulationDelayMs;
    
    switch (taskType) {
      case 'chunk':
        return baseDelay;
      case 'index':
        return baseDelay * 2;
      case 'file':
        return baseDelay * 0.5;
      default:
        return baseDelay;
    }
  }

  getTimeout(taskType: 'file' | 'chunk' | 'index'): number {
    const config = this.getProcessingConfig();
    
    switch (taskType) {
      case 'file':
        return config.timeouts.fileProcessingTimeoutMs;
      case 'chunk':
        return config.timeouts.chunkProcessingTimeoutMs;
      case 'index':
        return config.timeouts.indexProcessingTimeoutMs;
      default:
        return config.timeouts.fileProcessingTimeoutMs;
    }
  }

  validateConfig(): boolean {
    try {
      const config = this.getProcessingConfig();
      
      // Validate timeouts
      Object.values(config.timeouts).forEach(timeout => {
        if (timeout <= 0) {
          throw new Error('Invalid timeout configuration');
        }
      });

      // Validate limits
      Object.values(config.limits).forEach(limit => {
        if (limit <= 0) {
          throw new Error('Invalid limit configuration');
        }
      });

      return true;
    } catch (error) {
      console.error('Processing configuration validation failed:', error);
      return false;
    }
  }

  getConfigSummary(): Record<string, any> {
    const config = this.getProcessingConfig();
    return {
      parallelProcessingEnabled: config.enableParallelProcessing,
      progressReportingEnabled: config.enableProgressReporting,
      maxFileSize: config.limits.maxFileSize,
      maxBatchSize: config.limits.maxBatchSize,
      maxConcurrentTasks: config.limits.maxConcurrentTasks,
      maxRetryAttempts: config.limits.maxRetryAttempts,
      logLevel: config.logLevel,
    };
  }
}