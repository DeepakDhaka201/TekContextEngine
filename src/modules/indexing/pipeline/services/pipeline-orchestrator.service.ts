import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  private readonly logger = new Logger(PipelineOrchestratorService.name);
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
  ) {}

  /**
   * Create and start a new pipeline
   */
  async createPipeline(request: CreatePipelineRequest): Promise<IndexPipeline> {
    this.logger.log(`Creating pipeline: ${request.type} for project ${request.projectId}`);

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

    // Get configuration from config service
    const configuration = this.pipelineConfigService.getDefaultConfiguration(request.type, request.customConfiguration);

    // Create pipeline entity
    const pipeline = new IndexPipeline();
    pipeline.type = request.type;
    pipeline.status = IndexPipelineStatus.PENDING;
    pipeline.priority = request.priority || 0;
    pipeline.description = request.description;
    pipeline.configuration = configuration;
    pipeline.metadata = this.createInitialMetadata();
    pipeline.project = project;
    pipeline.codebase = codebase;

    const savedPipeline = await this.pipelineRepository.save(pipeline);

    // Submit pipeline to worker pool for execution
    const executionPromise = this.pipelineWorkerService.submitPipeline(
      savedPipeline.id,
      savedPipeline.type,
      () => this.executePipeline(savedPipeline.id)
    );
    
    this.runningPipelines.set(savedPipeline.id, executionPromise);

    // Handle completion/failure
    executionPromise
      .then(result => {
        this.logger.log(`Pipeline ${savedPipeline.id} completed with status: ${result.status}`);
      })
      .catch(error => {
        this.logger.error(`Pipeline ${savedPipeline.id} execution failed:`, error);
      })
      .finally(() => {
        this.runningPipelines.delete(savedPipeline.id);
      });

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

    try {
      // Load pipeline with relations
      const pipeline = await this.pipelineRepository.findOne({
        where: { id: pipelineId },
        relations: ['project', 'codebase'],
      });

      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      this.logger.log(`Starting pipeline execution: ${pipelineId}`);

      // Update pipeline status to running
      await this.updatePipelineStatus(pipeline, IndexPipelineStatus.RUNNING);

      // Create pipeline context
      const context = await this.createPipelineContext(pipeline);

      // Get task instances
      const tasks = this.getTaskInstances();

      // Execute tasks in order
      for (const task of tasks) {
        if (!task.shouldExecute(context)) {
          context.logger.info(`Skipping task: ${task.name} (conditions not met)`);
          continue;
        }

        tasksExecuted++;
        context.logger.info(`Executing task: ${task.name}`);

        try {
          // Update current step
          pipeline.currentStep = task.name;
          pipeline.progress = Math.round((tasksExecuted / tasks.length) * 100);
          await this.pipelineRepository.save(pipeline);

          // Execute task
          const result = await task.execute(context);

          if (result.success) {
            tasksSucceeded++;
            context.logger.info(`Task completed successfully: ${task.name}`, {
              duration: result.duration,
              metrics: result.metrics,
            });
          } else {
            tasksFailed++;
            finalError = result.error;
            context.logger.error(`Task failed: ${task.name}`, { error: result.error });
            
            // Stop execution on failure
            break;
          }

        } catch (error) {
          tasksFailed++;
          finalError = error.message;
          context.logger.error(`Task execution error: ${task.name}`, { error: error.message });
          
          // Stop execution on error
          break;
        } finally {
          // Always run task cleanup
          try {
            await task.cleanup(context);
          } catch (cleanupError) {
            context.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupError.message });
          }
        }
      }

      // Update final pipeline status
      const finalStatus = tasksFailed > 0 ? IndexPipelineStatus.FAILED : IndexPipelineStatus.COMPLETED;
      pipeline.progress = finalStatus === IndexPipelineStatus.COMPLETED ? 100 : pipeline.progress;
      await this.updatePipelineStatus(pipeline, finalStatus, finalError);

      // Final context cleanup
      await this.cleanupPipelineContext(context);

      const duration = Date.now() - startTime;
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
      this.logger.error(`Pipeline ${pipelineId} execution failed:`, error);
      
      // Try to update pipeline status to failed
      try {
        const pipeline = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
        if (pipeline) {
          await this.updatePipelineStatus(pipeline, IndexPipelineStatus.FAILED, error.message);
        }
      } catch (updateError) {
        this.logger.error(`Failed to update pipeline status:`, updateError);
      }
      
      const duration = Date.now() - startTime;
      return {
        pipelineId,
        status: IndexPipelineStatus.FAILED,
        duration,
        tasksExecuted,
        tasksSucceeded,
        tasksFailed: tasksExecuted - tasksSucceeded,
        finalError: error.message,
      };
    }
  }

  /**
   * Get pipeline status
   */
  async getPipelineStatus(pipelineId: string): Promise<IndexPipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
      relations: ['project', 'codebase'],
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    return pipeline;
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(pipelineId: string): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.status === IndexPipelineStatus.COMPLETED || pipeline.status === IndexPipelineStatus.FAILED) {
      throw new Error(`Cannot cancel pipeline in status: ${pipeline.status}`);
    }

    // Try to cancel from worker pool first (if queued)
    const cancelledFromQueue = await this.pipelineWorkerService.cancelQueuedPipeline(pipelineId);
    
    await this.updatePipelineStatus(pipeline, IndexPipelineStatus.CANCELLED);
    this.runningPipelines.delete(pipelineId);
    
    this.logger.log(`Pipeline ${pipelineId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
  }

  /**
   * Create pipeline context
   */
  private async createPipelineContext(pipeline: IndexPipeline): Promise<PipelineContext> {
    // Create working directories
    const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'pipelines', pipeline.id);
    const tempDirectory = path.join(workingDirectory, 'temp');

    await fs.mkdir(workingDirectory, { recursive: true });
    await fs.mkdir(tempDirectory, { recursive: true });

    // Get codebase storage path (permanent location)
    const codebaseStoragePath = pipeline.codebase?.storagePath || 
      path.join(this.configService.get('STORAGE_ROOT', './storage'), 'codebases', pipeline.codebase?.id || 'unknown');

    // Ensure codebase storage directory exists
    await fs.mkdir(codebaseStoragePath, { recursive: true });

    // Create logger with pipeline context
    const logger = {
      info: (message: string, meta?: any) => this.logger.log(`[${pipeline.id}] ${message}`, meta),
      warn: (message: string, meta?: any) => this.logger.warn(`[${pipeline.id}] ${message}`, meta),
      error: (message: string, meta?: any) => this.logger.error(`[${pipeline.id}] ${message}`, meta),
      debug: (message: string, meta?: any) => this.logger.debug(`[${pipeline.id}] ${message}`, meta),
    };

    return {
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
  }

  /**
   * Cleanup pipeline context
   */
  private async cleanupPipelineContext(context: PipelineContext): Promise<void> {
    // Cleanup is handled by CleanupTask
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
   * Get worker pool statistics
   */
  getWorkerPoolStats() {
    return this.pipelineWorkerService.getPoolStats();
  }

  /**
   * Resize the worker pool
   */
  resizeWorkerPool(newSize: number): void {
    this.pipelineWorkerService.resizePool(newSize);
    this.logger.log(`Worker pool resized to ${newSize} workers`);
  }

  /**
   * Get all active pipelines being processed
   */
  getActivePipelines(): string[] {
    return this.pipelineWorkerService.getActivePipelines();
  }

  /**
   * Check if a specific pipeline is currently active
   */
  isPipelineActive(pipelineId: string): boolean {
    return this.runningPipelines.has(pipelineId) || this.pipelineWorkerService.isPipelineActive(pipelineId);
  }

  /**
   * Get system status including worker pool and pipeline information
   */
  async getSystemStatus() {
    const poolStats = this.getWorkerPoolStats();
    const activePipelines = Array.from(this.runningPipelines.keys());
    
    return {
      workerPool: poolStats,
      runningPipelines: activePipelines.length,
      activePipelineIds: activePipelines,
      systemHealth: {
        queueBacklog: poolStats?.queuedTasks || 0,
        utilization: poolStats?.utilization || 0,
        isHealthy: (poolStats?.utilization || 0) < 0.9, // Consider unhealthy if >90% utilization
      },
    };
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