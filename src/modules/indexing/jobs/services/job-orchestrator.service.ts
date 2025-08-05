import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TekProject, Codebase } from '@/entities';
import { IndexJob, IndexJobStatus, IndexJobType } from '../../entities/index-job.entity';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { ITask } from '../interfaces/base-task.interface';
import { GitSyncTask } from '../tasks/git-sync.task';
import { CodeParsingTask } from '../tasks/code-parsing.task';
import { GraphUpdateTask } from '../tasks/graph-update.task';
import { CleanupTask } from '../tasks/cleanup.task';
import { TaskConfigService } from '../../config/task-config.service';
import { JobWorkerService } from './job-worker.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface CreateJobRequest {
  projectId: string;
  codebaseId?: string;
  type: IndexJobType;
  description?: string;
  baseCommit?: string;
  priority?: number;
}

export interface JobExecutionResult {
  jobId: string;
  status: IndexJobStatus;
  duration: number;
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  finalError?: string;
}

@Injectable()
export class JobOrchestratorService {
  private readonly runningJobs = new Map<string, Promise<JobExecutionResult>>();

  constructor(
    @InjectRepository(IndexJob)
    private jobRepository: Repository<IndexJob>,
    @InjectRepository(TekProject)
    private projectRepository: Repository<TekProject>,
    @InjectRepository(Codebase)
    private codebaseRepository: Repository<Codebase>,
    private configService: ConfigService,
    private taskConfigService: TaskConfigService,
    private jobWorkerService: JobWorkerService,
    private gitSyncTask: GitSyncTask,
    private codeParsingTask: CodeParsingTask,
    private graphUpdateTask: GraphUpdateTask,
    private cleanupTask: CleanupTask,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Create and start a new job
   */
  async createJob(request: CreateJobRequest): Promise<IndexJob> {
    this.logger.log(`[JOB-ORCHESTRATOR] Creating job: ${request.type} for project ${request.projectId}`);

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: request.projectId },
    });
    if (!project) {
      throw new Error(`Project ${request.projectId} not found`);
    }

    // Validate codebase if provided
    let codebase: Codebase | undefined;
    if (request.codebaseId) {
      codebase = await this.codebaseRepository.findOne({
        where: { id: request.codebaseId },
        relations: ['project'],
      });
      if (!codebase) {
        throw new Error(`Codebase ${request.codebaseId} not found`);
      }
      if (codebase.project.id !== request.projectId) {
        throw new Error(`Codebase ${request.codebaseId} does not belong to project ${request.projectId}`);
      }
    }

    // Create job entity
    const job = new IndexJob();
    job.type = request.type;
    job.status = IndexJobStatus.PENDING;
    job.priority = request.priority || 0;
    job.description = request.description;
    job.metadata = this.createInitialMetadata(request);
    job.project = project;
    job.codebase = codebase;

    const savedJob = await this.jobRepository.save(job);

    // Submit job to worker pool for execution
    const executionPromise = this.jobWorkerService.submitJob(
      savedJob.id,
      savedJob.type,
      () => this.executeJob(savedJob.id)
    );

    this.runningJobs.set(savedJob.id, executionPromise);

    // Handle completion/failure
    executionPromise
      .then(result => {
        this.logger.log(`[JOB-ORCHESTRATOR] Job ${savedJob.id} completed with status: ${result.status}`);
      })
      .catch(error => {
        this.logger.error(`[JOB-ORCHESTRATOR] Job ${savedJob.id} execution failed:`, error);
      })
      .finally(() => {
        this.runningJobs.delete(savedJob.id);
      });

    return savedJob;
  }

  /**
   * Execute job with task orchestration
   */
  async executeJob(jobId: string): Promise<JobExecutionResult> {
    const startTime = Date.now();
    let tasksExecuted = 0;
    let tasksSucceeded = 0;
    let tasksFailed = 0;
    let finalError: string | undefined;

    try {
      // Load job with relations
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
        relations: ['project', 'codebase'],
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      this.logger.log(`Starting job execution: ${jobId}`);

      // Update job status to running
      await this.updateJobStatus(job, IndexJobStatus.RUNNING);

      // Create job context
      const context = await this.createJobContext(job);

      // Get task instances based on job type
      const tasks = this.getTaskInstancesForJobType(job.type);

      // Execute tasks in order
      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex];
        const taskNumber = taskIndex + 1;

        if (!task.shouldExecute(context)) {
          this.logger.debug(`Skipping task: ${task.name} (conditions not met)`);
          continue;
        }

        tasksExecuted++;
        this.logger.log(`Executing task ${taskNumber}/${tasks.length}: ${task.name}`);

        try {
          // Update current task
          job.currentTask = task.name;
          job.progress = Math.round((tasksExecuted / tasks.length) * 100);
          await this.jobRepository.save(job);

          // Execute task
          const result = await task.execute(context);

          if (result.success) {
            tasksSucceeded++;
            this.logger.log(`Task completed successfully: ${task.name}`);
          } else {
            tasksFailed++;
            finalError = result.error;
            this.logger.error(`Task failed: ${task.name}`, { error: result.error });
            break;
          }

        } catch (error) {
          tasksFailed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          finalError = errorMessage;
          this.logger.error(`Task execution error: ${task.name}`, { error: errorMessage });
          break;
        } finally {
          // Always run task cleanup
          try {
            await task.cleanup(context);
          } catch (cleanupError) {
            this.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupError });
          }
        }
      }

      // Update final job status
      const finalStatus = tasksFailed > 0 ? IndexJobStatus.FAILED : IndexJobStatus.COMPLETED;
      job.progress = finalStatus === IndexJobStatus.COMPLETED ? 100 : job.progress;
      await this.updateJobStatus(job, finalStatus, finalError);

      // Final context cleanup
      await this.cleanupJobContext(context);

      const duration = Date.now() - startTime;

      this.logger.log(`Job ${jobId} execution completed`, {
        status: finalStatus,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed,
      });

      return {
        jobId,
        status: finalStatus,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed,
        finalError,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      this.logger.error(`Job ${jobId} execution failed:`, error);

      // Try to update job status to failed
      try {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (job) {
          await this.updateJobStatus(job, IndexJobStatus.FAILED, errorMessage);
        }
      } catch (updateError) {
        this.logger.error(`Failed to update job status:`, updateError);
      }

      return {
        jobId,
        status: IndexJobStatus.FAILED,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed: tasksExecuted - tasksSucceeded,
        finalError: errorMessage,
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IndexJob> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['project', 'codebase'],
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return job;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === IndexJobStatus.COMPLETED || job.status === IndexJobStatus.FAILED) {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    // Try to cancel from worker pool first (if queued)
    const cancelledFromQueue = await this.jobWorkerService.cancelQueuedJob(jobId);

    await this.updateJobStatus(job, IndexJobStatus.CANCELLED);
    this.runningJobs.delete(jobId);

    this.logger.log(`Job ${jobId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
  }

  /**
   * Create job context
   */
  private async createJobContext(job: IndexJob): Promise<JobContext> {
    // Create working directories
    const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'jobs', job.id);
    const tempDirectory = path.join(workingDirectory, 'temp');

    await fs.mkdir(workingDirectory, { recursive: true });
    await fs.mkdir(tempDirectory, { recursive: true });

    // Get codebase storage path (permanent location)
    const storageRoot = this.configService.get('STORAGE_ROOT', './storage');
    const codebaseStoragePath = job.codebase?.storagePath ||
      path.join(storageRoot, 'codebases', job.codebase?.id || 'unknown');

    // Ensure codebase storage directory exists
    await fs.mkdir(codebaseStoragePath, { recursive: true });

    // Create logger with job context
    const logger = {
      info: (message: string, meta?: any) => this.logger.log(`[${job.id}] ${message}`, meta),
      warn: (message: string, meta?: any) => this.logger.warn(`[${job.id}] ${message}`, meta),
      error: (message: string, meta?: any) => this.logger.error(`[${job.id}] ${message}`, meta),
      debug: (message: string, meta?: any) => this.logger.debug(`[${job.id}] ${message}`, meta),
    };

    const context: JobContext = {
      job,
      project: job.project,
      codebase: job.codebase,
      workingDirectory,
      tempDirectory,
      codebaseStoragePath,
      data: {},
      metrics: {
        startTime: new Date(),
        taskTimes: {},
        totalFilesProcessed: 0,
        totalSymbolsExtracted: 0,
        errors: [],
        warnings: [],
      },
      logger,
    };

    return context;
  }

  /**
   * Cleanup job context
   */
  private async cleanupJobContext(context: JobContext): Promise<void> {
    // Cleanup is handled by CleanupTask
    // This is just for any orchestrator-level cleanup if needed
    context.logger.debug('Job context cleanup completed');
  }

  /**
   * Get task instances based on job type
   */
  private getTaskInstancesForJobType(jobType: IndexJobType): ITask[] {
    switch (jobType) {
      case IndexJobType.CODEBASE_FULL:
      case IndexJobType.CODEBASE_INCR:
        return [
          this.gitSyncTask,
          this.codeParsingTask,
          this.graphUpdateTask,
          this.cleanupTask,
        ];
      case IndexJobType.DOCS_BUCKET_FULL:
      case IndexJobType.DOCS_BUCKET_INCR:
        // TODO: Implement document processing tasks
        return [this.cleanupTask];
      case IndexJobType.API_ANALYSIS:
      case IndexJobType.USERFLOW_ANALYSIS:
        // TODO: Implement analysis tasks
        return [this.cleanupTask];
      default:
        return [];
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    job: IndexJob,
    status: IndexJobStatus,
    error?: string
  ): Promise<void> {
    job.status = status;
    job.updatedAt = new Date();

    if (status === IndexJobStatus.RUNNING) {
      job.startedAt = new Date();
    } else if (status === IndexJobStatus.COMPLETED || status === IndexJobStatus.FAILED) {
      job.completedAt = new Date();
    }

    if (error) {
      job.error = error;
    }

    await this.jobRepository.save(job);
  }

  /**
   * Create initial job metadata
   */
  private createInitialMetadata(request?: CreateJobRequest): any {
    const metadata: any = {
      filesProcessed: 0,
      symbolsExtracted: 0,
      duration: 0,
      tasks: {},
      metrics: {
        languages: {},
        fileTypes: {},
        errors: [],
        warnings: [],
      },
    };

    // Add baseCommit for incremental jobs
    if (request?.type === IndexJobType.CODEBASE_INCR) {
      if (request.baseCommit) {
        metadata.baseCommit = request.baseCommit;
      }
    }

    return metadata;
  }

  /**
   * Get all active jobs being processed
   */
  getActiveJobs(): string[] {
    return Array.from(this.runningJobs.keys());
  }

  /**
   * Check if a specific job is currently active
   */
  isJobActive(jobId: string): boolean {
    return this.runningJobs.has(jobId);
  }
}
