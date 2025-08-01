import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TekProject, Codebase } from '@/entities';
import { IndexPipeline, IndexPipelineStatus, IndexPipelineType } from '../../entities/index-pipeline.entity';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
import { ITask } from '../interfaces/base-task.interface';
import { GitSyncTask } from '../tasks/git-sync.task';
import { CodeParsingTask } from '../tasks/code-parsing.task';
import { GraphUpdateTask } from '../tasks/graph-update.task';
import { CleanupTask } from '../tasks/cleanup.task';
import { PipelineConfigService } from '../../config/pipeline-config.service';
import { PipelineWorkerService } from './pipeline-worker.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface CreatePipelineRequest {
  projectId: string;
  codebaseId?: string;
  type: IndexPipelineType;
  description?: string;
  baseCommit?: string;
  targetCommit?: string;
  priority?: number;
  customConfiguration?: any;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  status: IndexPipelineStatus;
  duration: number;
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  finalError?: string;
}

@Injectable()
export class PipelineOrchestratorService {
  private readonly runningPipelines = new Map<string, Promise<PipelineExecutionResult>>();

  constructor(
    @InjectRepository(IndexPipeline)
    private pipelineRepository: Repository<IndexPipeline>,
    @InjectRepository(TekProject)
    private projectRepository: Repository<TekProject>,
    @InjectRepository(Codebase)
    private codebaseRepository: Repository<Codebase>,
    private configService: ConfigService,
    private pipelineConfigService: PipelineConfigService,
    private pipelineWorkerService: PipelineWorkerService,
    private gitSyncTask: GitSyncTask,
    private codeParsingTask: CodeParsingTask,
    private graphUpdateTask: GraphUpdateTask,
    private cleanupTask: CleanupTask,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Create and start a new pipeline
   */
  async createPipeline(request: CreatePipelineRequest): Promise<IndexPipeline> {
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Creating pipeline: ${request.type} for project ${request.projectId}`);
    this.logger.debug(`[PIPELINE-ORCHESTRATOR] Full request: ${JSON.stringify(request)}`);

    // Validate project exists
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Validating project: ${request.projectId}`);
    const project = await this.projectRepository.findOne({
      where: { id: request.projectId },
    });
    if (!project) {
      this.logger.error(`[PIPELINE-ORCHESTRATOR] Project not found: ${request.projectId}`);
      throw new Error(`Project ${request.projectId} not found`);
    }
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Project found: ${project.name}`);
    this.logger.debug(`[PIPELINE-ORCHESTRATOR] Project details: { id: "${project.id}", name: "${project.name}" }`);

    // Validate codebase if provided
    let codebase: Codebase | undefined;
    if (request.codebaseId) {
      this.logger.log(`[PIPELINE-ORCHESTRATOR] Validating codebase: ${request.codebaseId}`);
      codebase = await this.codebaseRepository.findOne({
        where: { id: request.codebaseId },
        relations: ['project'],
      });
      if (!codebase) {
        this.logger.error(`[PIPELINE-ORCHESTRATOR] Codebase not found: ${request.codebaseId}`);
        throw new Error(`Codebase ${request.codebaseId} not found`);
      }
      if (codebase.project.id !== request.projectId) {
        this.logger.error(`[PIPELINE-ORCHESTRATOR] Codebase project mismatch: codebase.projectId=${codebase.project.id}, request.projectId=${request.projectId}`);
        throw new Error(`Codebase ${request.codebaseId} does not belong to project ${request.projectId}`);
      }
      this.logger.log(`[PIPELINE-ORCHESTRATOR] Codebase found: ${codebase.name}`);
      this.logger.debug(`[PIPELINE-ORCHESTRATOR] Codebase details: { id: "${codebase.id}", name: "${codebase.name}", gitlabUrl: "${codebase.gitlabUrl}" }`);
    }

    // Get configuration from config service
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Getting configuration for pipeline type: ${request.type}`);
    const configuration = this.pipelineConfigService.getDefaultConfiguration(request.type, request.customConfiguration);
    this.logger.debug(`[PIPELINE-ORCHESTRATOR] Pipeline configuration: ${JSON.stringify(configuration)}`);

    // Create pipeline entity
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Creating pipeline entity`);
    const pipeline = new IndexPipeline();
    pipeline.type = request.type;
    pipeline.status = IndexPipelineStatus.PENDING;
    pipeline.priority = request.priority || 0;
    pipeline.description = request.description;
    pipeline.configuration = configuration;
    pipeline.metadata = this.createInitialMetadata();
    pipeline.project = project;
    pipeline.codebase = codebase;

    this.logger.log(`[PIPELINE-ORCHESTRATOR] Saving pipeline to database`);
    const savedPipeline = await this.pipelineRepository.save(pipeline);
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline saved with ID: ${savedPipeline.id}`);

    // Submit pipeline to worker pool for execution
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Submitting pipeline to worker pool: ${savedPipeline.id}`);
    const executionPromise = this.pipelineWorkerService.submitPipeline(
      savedPipeline.id,
      savedPipeline.type,
      () => this.executePipeline(savedPipeline.id)
    );

    this.runningPipelines.set(savedPipeline.id, executionPromise);
    this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline submitted to worker pool. Running pipelines count: ${this.runningPipelines.size}`);

    // Handle completion/failure
    executionPromise
      .then(result => {
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} completed with status: ${result.status}`);
      })
      .catch(error => {
        this.logger.error(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} execution failed:`, error);
      })
      .finally(() => {
        this.runningPipelines.delete(savedPipeline.id);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} removed from running pipelines. Count: ${this.runningPipelines.size}`);
      });

    this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline creation completed successfully: ${savedPipeline.id}`);
    return savedPipeline;
  }

  /**
   * Execute pipeline with task orchestration
   */
  async executePipeline(pipelineId: string): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    let tasksExecuted = 0;
    let tasksSucceeded = 0;
    let tasksFailed = 0;
    let finalError: string | undefined;

    this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting pipeline execution`, {
      pipelineId,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Load pipeline with relations
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Loading pipeline from database`);
      const pipeline = await this.pipelineRepository.findOne({
        where: { id: pipelineId },
        relations: ['project', 'codebase'],
      });

      if (!pipeline) {
        this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline not found in database`);
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline loaded successfully`, {
        type: pipeline.type,
        status: pipeline.status,
        projectId: pipeline.project.id,
        projectName: pipeline.project.name,
        codebaseId: pipeline.codebase?.id,
        codebaseName: pipeline.codebase?.name,
        priority: pipeline.priority,
        description: pipeline.description
      });

      this.logger.log(`Starting pipeline execution: ${pipelineId}`);

      // Update pipeline status to running
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating pipeline status to RUNNING`);
      await this.updatePipelineStatus(pipeline, IndexPipelineStatus.RUNNING);

      // Create pipeline context
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Creating pipeline context`);
      const context = await this.createPipelineContext(pipeline);
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline context created successfully`, {
        workingDirectory: context.workingDirectory,
        tempDirectory: context.tempDirectory,
        codebaseStoragePath: context.codebaseStoragePath
      });

      // Get task instances
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Getting task instances`);
      const tasks = this.getTaskInstances();
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Task instances retrieved`, {
        taskCount: tasks.length,
        taskNames: tasks.map(t => t.name)
      });

      // Execute tasks in order
      this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting task execution sequence`, {
        totalTasks: tasks.length
      });

      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex];
        const taskNumber = taskIndex + 1;

        this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Evaluating task ${taskNumber}/${tasks.length}: ${task.name}`);

        if (!task.shouldExecute(context)) {
          this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Skipping task: ${task.name} (conditions not met)`);
          context.logger.info(`Skipping task: ${task.name} (conditions not met)`);
          continue;
        }

        tasksExecuted++;
        this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Executing task ${taskNumber}/${tasks.length}: ${task.name}`, {
          taskName: task.name,
          taskDescription: task.description,
          tasksExecuted,
          totalTasks: tasks.length
        });

        context.logger.info(`Executing task: ${task.name}`);

        try {
          // Update current step
          pipeline.currentStep = task.name;
          pipeline.progress = Math.round((tasksExecuted / tasks.length) * 100);

          this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating pipeline progress`, {
            currentStep: pipeline.currentStep,
            progress: pipeline.progress,
            tasksExecuted,
            totalTasks: tasks.length
          });

          await this.pipelineRepository.save(pipeline);

          // Execute task
          this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting task execution: ${task.name}`);
          const taskStartTime = Date.now();
          const result = await task.execute(context);
          const taskDuration = Date.now() - taskStartTime;

          if (result.success) {
            tasksSucceeded++;
            this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Task completed successfully: ${task.name}`, {
              taskName: task.name,
              duration: result.duration || taskDuration,
              metrics: result.metrics,
              tasksSucceeded,
              tasksExecuted
            });

            context.logger.info(`Task completed successfully: ${task.name}`, {
              duration: result.duration,
              metrics: result.metrics,
            });
          } else {
            tasksFailed++;
            finalError = result.error;

            this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Task failed: ${task.name}`, {
              taskName: task.name,
              error: result.error,
              duration: result.duration || taskDuration,
              tasksFailed,
              tasksExecuted
            });

            context.logger.error(`Task failed: ${task.name}`, { error: result.error });

            // Stop execution on failure
            this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Stopping pipeline execution due to task failure`);
            break;
          }

        } catch (error) {
          tasksFailed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          finalError = errorMessage;

          this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Task execution error: ${task.name}`, {
            taskName: task.name,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            tasksFailed,
            tasksExecuted
          });

          context.logger.error(`Task execution error: ${task.name}`, { error: errorMessage });

          // Stop execution on error
          this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Stopping pipeline execution due to task error`);
          break;
        } finally {
          // Always run task cleanup
          this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Running task cleanup: ${task.name}`);
          try {
            await task.cleanup(context);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Task cleanup completed: ${task.name}`);
          } catch (cleanupError) {
            const cleanupErrorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);

            this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Task cleanup failed: ${task.name}`, {
              taskName: task.name,
              error: cleanupErrorMessage,
              stack: cleanupError instanceof Error ? cleanupError.stack : undefined
            });

            context.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupErrorMessage });
          }
        }
      }

      // Update final pipeline status
      const finalStatus = tasksFailed > 0 ? IndexPipelineStatus.FAILED : IndexPipelineStatus.COMPLETED;
      pipeline.progress = finalStatus === IndexPipelineStatus.COMPLETED ? 100 : pipeline.progress;

      this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating final pipeline status`, {
        finalStatus,
        progress: pipeline.progress,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed,
        finalError
      });

      await this.updatePipelineStatus(pipeline, finalStatus, finalError);

      // Final context cleanup
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting final context cleanup`);
      await this.cleanupPipelineContext(context);
      this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Final context cleanup completed`);

      const duration = Date.now() - startTime;

      this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline execution completed successfully`, {
        pipelineId,
        status: finalStatus,
        duration,
        durationMin: Math.round(duration / 60000),
        tasksExecuted,
        tasksSucceeded,
        tasksFailed,
        finalError,
        successRate: tasksExecuted > 0 ? Math.round((tasksSucceeded / tasksExecuted) * 100) : 0
      });

      this.logger.log(`Pipeline ${pipelineId} execution completed`, {
        status: finalStatus,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed,
      });

      return {
        pipelineId,
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

      this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline execution failed with unhandled error`, {
        pipelineId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        durationMin: Math.round(duration / 60000),
        tasksExecuted,
        tasksSucceeded,
        tasksFailed
      });

      this.logger.error(`Pipeline ${pipelineId} execution failed:`, error);

      // Try to update pipeline status to failed
      try {
        this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Attempting to update pipeline status to FAILED`);
        const pipeline = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
        if (pipeline) {
          await this.updatePipelineStatus(pipeline, IndexPipelineStatus.FAILED, errorMessage);
          this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline status updated to FAILED`);
        } else {
          this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline not found when trying to update status to FAILED`);
        }
      } catch (updateError) {
        const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);

        this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Failed to update pipeline status to FAILED`, {
          error: updateErrorMessage,
          stack: updateError instanceof Error ? updateError.stack : undefined
        });

        this.logger.error(`Failed to update pipeline status:`, updateError);
      }

      return {
        pipelineId,
        status: IndexPipelineStatus.FAILED,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed: tasksExecuted - tasksSucceeded,
        finalError: errorMessage,
      };
    }
  }

  /**
   * Get pipeline status
   */
  async getPipelineStatus(pipelineId: string): Promise<IndexPipeline> {
    this.logger.debug(`[${pipelineId}] [PIPELINE-STATUS] Retrieving pipeline status from database`);

    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
      relations: ['project', 'codebase'],
    });

    if (!pipeline) {
      this.logger.error(`[${pipelineId}] [PIPELINE-STATUS] Pipeline not found in database`);
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    this.logger.debug(`[${pipelineId}] [PIPELINE-STATUS] Pipeline status retrieved successfully`, {
      pipelineId: pipeline.id,
      type: pipeline.type,
      status: pipeline.status,
      progress: pipeline.progress,
      currentStep: pipeline.currentStep,
      projectId: pipeline.project.id,
      codebaseId: pipeline.codebase?.id,
      createdAt: pipeline.createdAt,
      startedAt: pipeline.startedAt,
      completedAt: pipeline.completedAt,
      hasError: !!pipeline.error
    });

    return pipeline;
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(pipelineId: string): Promise<void> {
    this.logger.log(`[${pipelineId}] [PIPELINE-CANCEL] Attempting to cancel pipeline`);

    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      this.logger.error(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline not found in database`);
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline found, checking cancellation eligibility`, {
      currentStatus: pipeline.status,
      progress: pipeline.progress,
      currentStep: pipeline.currentStep
    });

    if (pipeline.status === IndexPipelineStatus.COMPLETED || pipeline.status === IndexPipelineStatus.FAILED) {
      this.logger.warn(`[${pipelineId}] [PIPELINE-CANCEL] Cannot cancel pipeline in final status`, {
        status: pipeline.status
      });
      throw new Error(`Cannot cancel pipeline in status: ${pipeline.status}`);
    }

    // Try to cancel from worker pool first (if queued)
    this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Attempting to cancel from worker pool queue`);
    const cancelledFromQueue = await this.pipelineWorkerService.cancelQueuedPipeline(pipelineId);

    this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Worker pool cancellation result`, {
      cancelledFromQueue
    });

    this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Updating pipeline status to CANCELLED`);
    await this.updatePipelineStatus(pipeline, IndexPipelineStatus.CANCELLED);

    this.runningPipelines.delete(pipelineId);

    this.logger.log(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline cancelled successfully`, {
      cancelledFromQueue,
      previousStatus: pipeline.status,
      runningPipelinesCount: this.runningPipelines.size
    });

    this.logger.log(`Pipeline ${pipelineId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
  }

  /**
   * Create pipeline context
   */
  private async createPipelineContext(pipeline: IndexPipeline): Promise<PipelineContext> {
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Creating pipeline context`);

    // Create working directories
    const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'pipelines', pipeline.id);
    const tempDirectory = path.join(workingDirectory, 'temp');

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Creating working directories`, {
      workingDirectory,
      tempDirectory
    });

    await fs.mkdir(workingDirectory, { recursive: true });
    await fs.mkdir(tempDirectory, { recursive: true });

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Working directories created successfully`);

    // Get codebase storage path (permanent location)
    const storageRoot = this.configService.get('STORAGE_ROOT', './storage');
    const codebaseStoragePath = pipeline.codebase?.storagePath ||
      path.join(storageRoot, 'codebases', pipeline.codebase?.id || 'unknown');

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Determining codebase storage path`, {
      storageRoot,
      codebaseId: pipeline.codebase?.id,
      codebaseStoragePath,
      hasCustomStoragePath: !!pipeline.codebase?.storagePath
    });

    // Ensure codebase storage directory exists
    await fs.mkdir(codebaseStoragePath, { recursive: true });

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Codebase storage directory ensured`);

    // Create logger with pipeline context
    const logger = {
      info: (message: string, meta?: any) => this.logger.log(`[${pipeline.id}] ${message}`, meta),
      warn: (message: string, meta?: any) => this.logger.warn(`[${pipeline.id}] ${message}`, meta),
      error: (message: string, meta?: any) => this.logger.error(`[${pipeline.id}] ${message}`, meta),
      debug: (message: string, meta?: any) => this.logger.debug(`[${pipeline.id}] ${message}`, meta),
    };

    const context: PipelineContext = {
      pipeline,
      project: pipeline.project,
      codebase: pipeline.codebase,
      config: pipeline.configuration,
      workingDirectory,
      tempDirectory,
      codebaseStoragePath,
      data: {},
      metrics: {
        startTime: new Date(),
        stepTimes: {},
        totalFilesProcessed: 0,
        totalSymbolsExtracted: 0,
        errors: [],
        warnings: [],
      },
      logger,
    };

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Pipeline context created successfully`, {
      projectId: context.project.id,
      projectName: context.project.name,
      codebaseId: context.codebase?.id,
      codebaseName: context.codebase?.name,
      workingDirectory: context.workingDirectory,
      tempDirectory: context.tempDirectory,
      codebaseStoragePath: context.codebaseStoragePath,
      configKeys: Object.keys(context.config || {})
    });

    return context;
  }

  /**
   * Cleanup pipeline context
   */
  private async cleanupPipelineContext(context: PipelineContext): Promise<void> {
    const pipelineId = context.pipeline.id;

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Starting pipeline context cleanup`);

    // Cleanup is handled by CleanupTask
    // This is just for any orchestrator-level cleanup if needed

    this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Pipeline context cleanup completed`);
    context.logger.debug('Pipeline context cleanup completed');
  }

  /**
   * Get task instances in execution order
   */
  private getTaskInstances(): ITask[] {
    return [
      this.gitSyncTask,
      this.codeParsingTask,
      this.graphUpdateTask,
      this.cleanupTask,
    ];
  }

  /**
   * Update pipeline status
   */
  private async updatePipelineStatus(
    pipeline: IndexPipeline,
    status: IndexPipelineStatus,
    error?: string
  ): Promise<void> {
    pipeline.status = status;
    pipeline.updatedAt = new Date();

    if (status === IndexPipelineStatus.RUNNING) {
      pipeline.startedAt = new Date();
    } else if (status === IndexPipelineStatus.COMPLETED || status === IndexPipelineStatus.FAILED) {
      pipeline.completedAt = new Date();
    }

    if (error) {
      pipeline.error = error;
    }

    await this.pipelineRepository.save(pipeline);
  }

  /**
   * Create initial pipeline metadata
   */
  private createInitialMetadata(): any {
    return {
      filesProcessed: 0,
      symbolsExtracted: 0,
      duration: 0,
      steps: {},
      metrics: {
        linesOfCode: 0,
        languages: {},
        fileTypes: {},
        errors: [],
        warnings: [],
      },
    };
  }

  /**
   * Get all active pipelines being processed
   */
  getActivePipelines(): string[] {
    return Array.from(this.runningPipelines.keys());
  }

  /**
   * Check if a specific pipeline is currently active
   */
  isPipelineActive(pipelineId: string): boolean {
    return this.runningPipelines.has(pipelineId);
  }

  /**
   * Get system status including pipeline information
   */
  async getSystemStatus() {
    this.logger.debug('[PIPELINE-ORCHESTRATOR] Getting comprehensive system status');

    const statusStartTime = Date.now();
    const activePipelines = Array.from(this.runningPipelines.keys());
    const isHealthy = activePipelines.length < 10; // Consider unhealthy if >10 active pipelines

    const systemStatus = {
      runningPipelines: activePipelines.length,
      activePipelineIds: activePipelines,
      systemHealth: {
        queueBacklog: 0,
        utilization: activePipelines.length / 10, // Simple utilization based on active pipelines
        isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        lastChecked: new Date().toISOString()
      },
      performance: {
        totalPipelinesRun: this.runningPipelines.size,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    const statusDuration = Date.now() - statusStartTime;

    this.logger.debug('[PIPELINE-ORCHESTRATOR] System status collected successfully', {
      activePipelines: activePipelines.length,
      utilization: systemStatus.systemHealth.utilization,
      isHealthy,
      queueBacklog: 0,
      statusCollectionDuration: statusDuration,
      memoryUsageMB: Math.round(systemStatus.performance.memoryUsage.heapUsed / (1024 * 1024))
    });

    return systemStatus;
  }

  /**
   * Get pipelines for a specific codebase
   */
  async getPipelinesForCodebase(codebaseId: string) {
    // Get active (running) pipelines
    const activePipelines = await this.pipelineRepository.find({
      where: {
        codebase: { id: codebaseId },
        status: IndexPipelineStatus.RUNNING,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Get recent completed/failed pipelines
    const recentPipelines = await this.pipelineRepository.find({
      where: [
        {
          codebase: { id: codebaseId },
          status: IndexPipelineStatus.COMPLETED,
        },
        {
          codebase: { id: codebaseId },
          status: IndexPipelineStatus.FAILED,
        },
        {
          codebase: { id: codebaseId },
          status: IndexPipelineStatus.CANCELLED,
        },
      ],
      order: { completedAt: 'DESC' },
      take: 20,
    });

    return {
      activePipelines,
      recentPipelines,
      summary: {
        activeCount: activePipelines.length,
        recentCount: recentPipelines.length,
        hasRunning: activePipelines.length > 0,
      },
    };
  }

  /**
   * Get all pipelines for a project
   */
  async getPipelinesForProject(projectId: string, limit: number = 50) {
    return await this.pipelineRepository.find({
      where: { project: { id: projectId } },
      relations: ['project', 'codebase'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

}