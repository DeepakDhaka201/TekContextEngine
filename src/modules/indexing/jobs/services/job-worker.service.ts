import { Injectable, Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerPoolService, WorkerTask } from '@/shared/workers/worker-pool.service';
import { ConfigService } from '@nestjs/config';
import { JobExecutionResult } from './job-orchestrator.service';

export interface JobWorkerTask extends WorkerTask<JobExecutionResult> {
  jobId: string;
  type: string;
}

@Injectable()
export class JobWorkerService implements OnModuleInit {
  private readonly JOB_POOL_NAME = 'job-execution';

  constructor(
    private workerPoolService: WorkerPoolService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.logger.debug('[JOB-WORKER] Initializing job worker service', 'JobWorkerService');
  }

  async onModuleInit() {
    this.logger.log('[JOB-WORKER] Module initializing - setting up job worker pool', 'JobWorkerService');

    // Initialize the job worker pool
    this.initializeJobPool();

    this.logger.log('[JOB-WORKER] Module initialization completed', 'JobWorkerService');
  }

  /**
   * Submit a job for execution in the worker pool
   */
  async submitJob(
    jobId: string,
    jobType: string,
    executeFn: () => Promise<JobExecutionResult>
  ): Promise<JobExecutionResult> {
    const timeout = this.getJobTimeout(jobType);

    this.logger.debug('[JOB-WORKER] Preparing job task for worker pool', {
      jobId,
      jobType,
      timeout,
      poolName: this.JOB_POOL_NAME
    });

    const task: JobWorkerTask = {
      id: `job-${jobId}`,
      jobId,
      type: jobType,
      timeout,
      execute: executeFn,
    };

    this.logger.log('[JOB-WORKER] Submitting job to worker pool', {
      jobId,
      jobType,
      taskId: task.id,
      timeout: task.timeout
    });

    this.logger.log(`Submitting job ${jobId} to worker pool`);

    try {
      const submissionStartTime = Date.now();
      const result = await this.workerPoolService.submitTask(this.JOB_POOL_NAME, task);
      const submissionDuration = Date.now() - submissionStartTime;

      this.logger.log('[JOB-WORKER] Job completed successfully in worker pool', {
        jobId,
        jobType,
        status: result.status,
        duration: result.duration,
        submissionDuration,
        tasksExecuted: result.tasksExecuted,
        tasksSucceeded: result.tasksSucceeded,
        tasksFailed: result.tasksFailed
      });

      this.logger.log(`Job ${jobId} completed in worker pool`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[JOB-WORKER] Job failed in worker pool', {
        jobId,
        jobType,
        taskId: task.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Job ${jobId} failed in worker pool:`, error);
      throw error;
    }
  }



  /**
   * Initialize the job worker pool with configuration
   */
  private initializeJobPool() {
    const maxWorkers = this.configService.get('JOB_MAX_WORKERS', 4);
    const taskTimeout = this.configService.get('JOB_TASK_TIMEOUT', 1800000); // 30 minutes

    this.logger.debug('[JOB-WORKER] Initializing job worker pool with configuration', {
      poolName: this.JOB_POOL_NAME,
      maxWorkers,
      taskTimeout,
      taskTimeoutMin: Math.round(taskTimeout / 60000)
    });

    this.workerPoolService.createPool(this.JOB_POOL_NAME, {
      maxWorkers,
      taskTimeout,
    });

    this.logger.log('[JOB-WORKER] Job worker pool initialized successfully', {
      poolName: this.JOB_POOL_NAME,
      maxWorkers,
      configuration: {
        taskTimeoutMin: Math.round(taskTimeout / 60000)
      }
    });

    this.logger.log(`Initialized job worker pool with ${maxWorkers} workers`);
  }



  /**
   * Get timeout based on job type
   */
  private getJobTimeout(jobType: string): number {
    const baseTimeout = this.configService.get('JOB_TASK_TIMEOUT', 1800000); // 30 minutes
    
    switch (jobType.toUpperCase()) {
      case 'CODEBASE_FULL':
        return baseTimeout * 3; // 90 minutes for full indexing
      case 'CODEBASE_INCR':
        return baseTimeout * 0.5; // 15 minutes for incremental
      case 'DOCS_BUCKET_FULL':
      case 'DOCS_BUCKET_INCR':
        return baseTimeout * 0.3; // 9 minutes for document processing
      case 'API_ANALYSIS':
      case 'USERFLOW_ANALYSIS':
        return baseTimeout * 2; // 60 minutes for analysis
      default:
        return baseTimeout;
    }
  }

  /**
   * Get queue position for a job (if queued)
   */
  getQueuePosition(_jobId: string): number | null {
    // This would require extending the worker pool to track queue positions
    // For now, return null (not implemented)
    return null;
  }

  /**
   * Cancel a queued job (if possible)
   */
  async cancelQueuedJob(jobId: string): Promise<boolean> {
    // This would require extending the worker pool to support task cancellation
    // For now, return false (not supported)
    this.logger.warn(`Job cancellation not yet implemented for ${jobId}`);
    return false;
  }
}
