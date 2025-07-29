import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WorkerPoolService, WorkerTask } from '@/shared/workers/worker-pool.service';
import { ConfigService } from '@nestjs/config';
import { PipelineExecutionResult } from './pipeline-orchestrator.service';

export interface PipelineWorkerTask extends WorkerTask<PipelineExecutionResult> {
  pipelineId: string;
  type: string;
}

@Injectable()
export class PipelineWorkerService implements OnModuleInit {
  private readonly logger = new Logger(PipelineWorkerService.name);
  private readonly PIPELINE_POOL_NAME = 'pipeline-execution';

  constructor(
    private workerPoolService: WorkerPoolService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize the pipeline worker pool
    this.initializePipelinePool();
  }

  /**
   * Submit a pipeline for execution in the worker pool
   */
  async submitPipeline(
    pipelineId: string,
    pipelineType: string,
    executeFn: () => Promise<PipelineExecutionResult>
  ): Promise<PipelineExecutionResult> {
    const task: PipelineWorkerTask = {
      id: `pipeline-${pipelineId}`,
      pipelineId,
      type: pipelineType,
      priority: this.getPipelinePriority(pipelineType),
      timeout: this.getPipelineTimeout(pipelineType),
      execute: executeFn,
    };

    this.logger.log(`Submitting pipeline ${pipelineId} to worker pool`);
    
    try {
      const result = await this.workerPoolService.submitTask(this.PIPELINE_POOL_NAME, task);
      this.logger.log(`Pipeline ${pipelineId} completed in worker pool`);
      return result;
    } catch (error) {
      this.logger.error(`Pipeline ${pipelineId} failed in worker pool:`, error);
      throw error;
    }
  }

  /**
   * Get worker pool statistics
   */
  getPoolStats() {
    const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
    return pool ? pool.getStats() : null;
  }

  /**
   * Resize the pipeline worker pool
   */
  resizePool(newSize: number) {
    const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
    if (pool) {
      pool.resize(newSize);
      this.logger.log(`Resized pipeline worker pool to ${newSize} workers`);
    }
  }

  /**
   * Initialize the pipeline worker pool with configuration
   */
  private initializePipelinePool() {
    const maxWorkers = this.configService.get('PIPELINE_MAX_WORKERS', 4);
    const taskTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000); // 30 minutes
    const retryAttempts = this.configService.get('PIPELINE_RETRY_ATTEMPTS', 1);
    const queueSize = this.configService.get('PIPELINE_QUEUE_SIZE', 100);
    const idleTimeout = this.configService.get('PIPELINE_IDLE_TIMEOUT', 300000); // 5 minutes

    this.workerPoolService.createPool(this.PIPELINE_POOL_NAME, {
      maxWorkers,
      taskTimeout,
      retryAttempts,
      queueSize,
      idleTimeout,
    });

    this.logger.log(`Initialized pipeline worker pool with ${maxWorkers} workers`);
  }

  /**
   * Get priority based on pipeline type
   */
  private getPipelinePriority(pipelineType: string): number {
    switch (pipelineType.toUpperCase()) {
      case 'WEBHOOK':
        return 10; // Highest priority for webhook-triggered pipelines
      case 'INCREMENTAL':
        return 8;  // High priority for incremental updates
      case 'FULL':
        return 5;  // Medium priority for full indexing
      case 'DOCUMENT':
        return 6;  // Medium-high priority for document processing
      case 'ANALYSIS':
        return 3;  // Lower priority for analysis tasks
      default:
        return 5;  // Default medium priority
    }
  }

  /**
   * Get timeout based on pipeline type
   */
  private getPipelineTimeout(pipelineType: string): number {
    const baseTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000); // 30 minutes
    
    switch (pipelineType.toUpperCase()) {
      case 'FULL':
        return baseTimeout * 3; // 90 minutes for full indexing
      case 'INCREMENTAL':
        return baseTimeout * 0.5; // 15 minutes for incremental
      case 'DOCUMENT':
        return baseTimeout * 0.3; // 9 minutes for document processing
      case 'ANALYSIS':
        return baseTimeout * 2; // 60 minutes for analysis
      default:
        return baseTimeout;
    }
  }

  /**
   * Get all pipelines currently being processed
   */
  getActivePipelines(): string[] {
    const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
    if (!pool) return [];

    const stats = pool.getStats();
    // Note: We'd need to extend the worker pool to track active task IDs
    // For now, return based on active worker count
    return Array.from({ length: stats.activeWorkers }, (_, i) => `active-pipeline-${i}`);
  }

  /**
   * Check if a specific pipeline is currently being processed
   */
  isPipelineActive(_pipelineId: string): boolean {
    // This would require extending the worker pool to track specific task IDs
    // For now, we'll implement a simple check
    const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
    return pool ? pool.getStats().activeWorkers > 0 : false;
  }

  /**
   * Get queue position for a pipeline (if queued)
   */
  getQueuePosition(_pipelineId: string): number | null {
    // This would require extending the worker pool to track queue positions
    // For now, return null (not implemented)
    return null;
  }

  /**
   * Cancel a queued pipeline (if possible)
   */
  async cancelQueuedPipeline(pipelineId: string): Promise<boolean> {
    // This would require extending the worker pool to support task cancellation
    // For now, return false (not supported)
    this.logger.warn(`Pipeline cancellation not yet implemented for ${pipelineId}`);
    return false;
  }
}