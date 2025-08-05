import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { IndexJobType, GitSyncConfig } from '../../entities/index-job.entity';
import { GitClientService } from '../../../gitlab/git-client.service';
import { TaskConfigService } from '../../config/task-config.service';

@Injectable()
export class GitSyncTask extends BaseTask {
  readonly name = 'GIT_SYNC';
  readonly description = 'Synchronize Git repository and prepare workspace';
  readonly requiredTasks: string[] = [];
  readonly optionalTasks: string[] = [];

  constructor(
    private gitClient: GitClientService,
    private taskConfigService: TaskConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  getConfig(context: JobContext): GitSyncConfig {
    const baseConfig = this.taskConfigService.getGitSyncConfig(context.job.type);

    // For incremental jobs, use baseCommit from job metadata
    if (context.job.type === IndexJobType.CODEBASE_INCR) {
      const jobMetadata = context.job.metadata as any;
      return {
        ...baseConfig,
        baseCommit: jobMetadata?.baseCommit || baseConfig.baseCommit,
      };
    }

    return baseConfig;
  }

  shouldExecute(context: JobContext): boolean {
    const { job, codebase } = context;
    const jobId = job.id;
    const shouldRun = !!codebase?.gitlabUrl;

    this.logger.debug(`[${jobId}] [GIT-SYNC] Checking if task should execute`, {
      codebaseId: codebase?.id,
      codebaseName: codebase?.name,
      hasGitlabUrl: !!codebase?.gitlabUrl,
      shouldExecute: shouldRun
    });

    return shouldRun;
  }

  async validate(context: JobContext): Promise<void> {
    const { job, codebase, workingDirectory } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [GIT-SYNC] Validating task prerequisites`);

    if (!codebase) {
      this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No codebase provided`);
      throw new Error('Codebase is required for Git sync');
    }

    if (!codebase.gitlabUrl) {
      this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No GitLab URL`, {
        codebaseId: codebase.id,
        codebaseName: codebase.name
      });
      throw new Error('GitLab URL is required for Git sync');
    }

    if (!workingDirectory) {
      this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No working directory`);
      throw new Error('Working directory is required for Git sync');
    }

    this.logger.debug(`[${jobId}] [GIT-SYNC] Task validation completed successfully`, {
      codebaseId: codebase.id,
      codebaseName: codebase.name,
      gitlabUrl: codebase.gitlabUrl,
      branch: codebase.branch,
      workingDirectory
    });
  }

  protected async executeTask(context: JobContext): Promise<TaskExecutionResult> {
    const { job, codebase, codebaseStoragePath } = context;
    const jobId = job.id;
    const config = this.getConfig(context);

    context.logger.info(`[${jobId}] [GIT-SYNC] Starting Git sync task`, {
      jobType: job.type,
      codebaseId: codebase!.id,
      codebaseName: codebase!.name,
      gitlabUrl: codebase!.gitlabUrl,
      branch: codebase!.branch,
      storagePath: codebaseStoragePath
    });

    try {
      // Determine if this should be an incremental sync based on job type
      const isValidRepo = await this.gitClient.isValidRepository(codebaseStoragePath);
      const isIncremental = job.type === IndexJobType.CODEBASE_INCR && isValidRepo;

      context.logger.info(`[${jobId}] [GIT-SYNC] Sync mode determined`, {
        mode: isIncremental ? 'incremental' : 'full',
        existingRepoValid: isValidRepo,
        jobType: job.type
      });

      let commitHash: string;
      let filesChanged: string[] = [];
      let filesAdded: string[] = [];
      let filesDeleted: string[] = [];

      if (isIncremental) {
        // Incremental sync: Update existing repository
        context.logger.info(`[${jobId}] [GIT-SYNC] Starting incremental Git sync`);

        // Check if repository exists, if not do full clone
        if (!isValidRepo) {
          context.logger.warn(`[${jobId}] [GIT-SYNC] Repository doesn't exist, falling back to full clone`);
          commitHash = await this.gitClient.cloneRepository(codebase!.gitlabUrl, codebaseStoragePath, {
            branch: codebase!.branch,
            depth: config.shallow ? 1 : undefined,
          });
          filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
        } else {
          // Pull latest changes first
          commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
            branch: codebase!.branch,
          });

          // Use baseCommit from config for diff analysis (compare to current HEAD)
          const baseCommit = config.baseCommit;

          if (baseCommit) {
            context.logger.info(`[${jobId}] [GIT-SYNC] Analyzing changes from ${baseCommit.substring(0, 8)} to HEAD`);

            const changes = await this.gitClient.getDiff(codebaseStoragePath, {
              fromCommit: baseCommit,
              nameOnly: true
            });

            // Categorize changes
            for (const change of changes) {
              switch (change.operation) {
                case 'A':
                  filesAdded.push(change.path);
                  break;
                case 'M':
                  filesChanged.push(change.path);
                  break;
                case 'D':
                  filesDeleted.push(change.path);
                  break;
              }
            }
          } else {
            context.logger.warn(`[${jobId}] [GIT-SYNC] No baseCommit provided for incremental sync`);
          }
        }
      } else {
        // Full sync: Clone fresh repository
        context.logger.info(`[${jobId}] [GIT-SYNC] Starting full Git clone`);
        
        if (isValidRepo) {
          await this.gitClient.deleteRepository(codebaseStoragePath);
        }

        commitHash = await this.gitClient.cloneRepository(codebase!.gitlabUrl, codebaseStoragePath, {
          branch: codebase!.branch,
          depth: config.shallow ? 1 : undefined,
        });

        // For full sync, all files are considered "added"
        filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
      }

      // Store results in context for next tasks
      context.data.GIT_SYNC = {
        clonePath: codebaseStoragePath,
        commitHash,
        filesChanged,
        filesAdded,
        filesDeleted,
      };

      const totalFiles = filesAdded.length + filesChanged.length;

      context.logger.info(`[${jobId}] [GIT-SYNC] Git sync completed successfully`, {
        mode: isIncremental ? 'incremental' : 'full',
        commitHash: commitHash.substring(0, 8),
        totalFiles,
        filesAdded: filesAdded.length,
        filesChanged: filesChanged.length,
        filesDeleted: filesDeleted.length
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        data: context.data.GIT_SYNC,
        metrics: {
          filesProcessed: totalFiles,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${jobId}] [GIT-SYNC] Task failed with error`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        duration: 0,
        error: errorMessage,
      };
    }
  }

  async cleanup(context: JobContext): Promise<void> {
    const { job } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [GIT-SYNC] Starting task cleanup`);
    // Cleanup will be handled by cleanup task
    this.logger.debug(`[${jobId}] [GIT-SYNC] Task cleanup completed`);
  }

  getEstimatedDuration(context: JobContext): number {
    const { job } = context;
    const isIncremental = job.type === IndexJobType.CODEBASE_INCR;
    const baseTime = 120000; // 2 minutes base
    return isIncremental ? baseTime * 0.3 : baseTime;
  }
}
