import { Injectable, Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerPoolService, WorkerTask } from '@/shared/workers/worker-pool.service';
import { ConfigService } from '@nestjs/config';
import { PipelineExecutionResult } from './pipeline-orchestrator.service';

export interface PipelineWorkerTask extends WorkerTask<PipelineExecutionResult> {
  pipelineId: string;
  type: string;
}

@Injectable()
export class PipelineWorkerService implements OnModuleInit {
  private readonly PIPELINE_POOL_NAME = 'pipeline-execution';

  constructor(
    private workerPoolService: WorkerPoolService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.logger.debug('[PIPELINE-WORKER] Initializing pipeline worker service', 'PipelineWorkerService');
  }

  async onModuleInit() {
    this.logger.log('[PIPELINE-WORKER] Module initializing - setting up pipeline worker pool', 'PipelineWorkerService');

    // Initialize the pipeline worker pool
    this.initializePipelinePool();

    this.logger.log('[PIPELINE-WORKER] Module initialization completed', 'PipelineWorkerService');
  }

  /**
   * Submit a pipeline for execution in the worker pool
   */
  async submitPipeline(
    pipelineId: string,
    pipelineType: string,
    executeFn: () => Promise<PipelineExecutionResult>
  ): Promise<PipelineExecutionResult> {
    const timeout = this.getPipelineTimeout(pipelineType);

    this.logger.debug('[PIPELINE-WORKER] Preparing pipeline task for worker pool', {
      pipelineId,
      pipelineType,
      timeout,
      poolName: this.PIPELINE_POOL_NAME
    });

    const task: PipelineWorkerTask = {
      id: `pipeline-${pipelineId}`,
      pipelineId,
      type: pipelineType,
      timeout,
      execute: executeFn,
    };

    this.logger.log('[PIPELINE-WORKER] Submitting pipeline to worker pool', {
      pipelineId,
      pipelineType,
      taskId: task.id,
      timeout: task.timeout
    });

    this.logger.log(`Submitting pipeline ${pipelineId} to worker pool`);

    try {
      const submissionStartTime = Date.now();
      const result = await this.workerPoolService.submitTask(this.PIPELINE_POOL_NAME, task);
      const submissionDuration = Date.now() - submissionStartTime;

      this.logger.log('[PIPELINE-WORKER] Pipeline completed successfully in worker pool', {
        pipelineId,
        pipelineType,
        status: result.status,
        duration: result.duration,
        submissionDuration,
        tasksExecuted: result.tasksExecuted,
        tasksSucceeded: result.tasksSucceeded,
        tasksFailed: result.tasksFailed
      });

      this.logger.log(`Pipeline ${pipelineId} completed in worker pool`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[PIPELINE-WORKER] Pipeline failed in worker pool', {
        pipelineId,
        pipelineType,
        taskId: task.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Pipeline ${pipelineId} failed in worker pool:`, error);
      throw error;
    }
  }



  /**
   * Initialize the pipeline worker pool with configuration
   */
  private initializePipelinePool() {
    const maxWorkers = this.configService.get('PIPELINE_MAX_WORKERS', 4);
    const taskTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000); // 30 minutes

    this.logger.debug('[PIPELINE-WORKER] Initializing pipeline worker pool with configuration', {
      poolName: this.PIPELINE_POOL_NAME,
      maxWorkers,
      taskTimeout,
      taskTimeoutMin: Math.round(taskTimeout / 60000)
    });

    this.workerPoolService.createPool(this.PIPELINE_POOL_NAME, {
      maxWorkers,
      taskTimeout,
    });

    this.logger.log('[PIPELINE-WORKER] Pipeline worker pool initialized successfully', {
      poolName: this.PIPELINE_POOL_NAME,
      maxWorkers,
      configuration: {
        taskTimeoutMin: Math.round(taskTimeout / 60000)
      }
    });

    this.logger.log(`Initialized pipeline worker pool with ${maxWorkers} workers`);
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