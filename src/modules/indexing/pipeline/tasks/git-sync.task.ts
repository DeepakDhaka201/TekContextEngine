import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
import { IndexPipelineType } from '../../entities/index-pipeline.entity';
import { GitClientService } from '../../../gitlab/git-client.service';

@Injectable()
export class GitSyncTask extends BaseTask {
  readonly name = 'git_sync';
  readonly description = 'Synchronize Git repository and prepare workspace';
  readonly requiredSteps: string[] = [];
  readonly optionalSteps: string[] = [];

  constructor(
    private gitClient: GitClientService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  shouldExecute(context: PipelineContext): boolean {
    const { pipeline, codebase } = context;
    const pipelineId = pipeline.id;
    const shouldRun = !!codebase?.gitlabUrl;

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Checking if task should execute`, {
      codebaseId: codebase?.id,
      codebaseName: codebase?.name,
      hasGitlabUrl: !!codebase?.gitlabUrl,
      shouldExecute: shouldRun
    });

    return shouldRun;
  }

  async validate(context: PipelineContext): Promise<void> {
    const { pipeline, codebase, workingDirectory } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Validating task prerequisites`);

    if (!codebase) {
      this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No codebase provided`);
      throw new Error('Codebase is required for Git sync');
    }

    if (!codebase.gitlabUrl) {
      this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No GitLab URL`, {
        codebaseId: codebase.id,
        codebaseName: codebase.name
      });
      throw new Error('GitLab URL is required for Git sync');
    }

    if (!workingDirectory) {
      this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No working directory`);
      throw new Error('Working directory is required for Git sync');
    }

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Task validation completed successfully`, {
      codebaseId: codebase.id,
      codebaseName: codebase.name,
      gitlabUrl: codebase.gitlabUrl,
      branch: codebase.branch,
      workingDirectory
    });
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { pipeline, codebase, codebaseStoragePath, config } = context;
    const pipelineId = pipeline.id;

    context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting Git sync task`, {
      pipelineType: pipeline.type,
      codebaseId: codebase!.id,
      codebaseName: codebase!.name,
      gitlabUrl: codebase!.gitlabUrl,
      branch: codebase!.branch,
      storagePath: codebaseStoragePath
    });

    // Determine if this should be an incremental sync based on pipeline type
    const isValidRepo = await this.gitClient.isValidRepository(codebaseStoragePath);
    const isIncremental = pipeline.type === IndexPipelineType.INCREMENTAL && isValidRepo;

    context.logger.info(`[${pipelineId}] [GIT-SYNC] Sync mode determined`, {
      mode: isIncremental ? 'incremental' : 'full',
      existingRepoValid: isValidRepo,
      pipelineType: pipeline.type
    });

    try {
      let commitHash: string;
      let filesChanged: string[] = [];
      let filesAdded: string[] = [];
      let filesDeleted: string[] = [];

      if (isIncremental) {
        // Incremental sync: Update existing repository
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting incremental Git sync`, {
          path: codebaseStoragePath,
          branch: codebase!.branch
        });

        // Get current commit before pull
        context.logger.debug(`[${pipelineId}] [GIT-SYNC] Getting current commit hash`);
        const beforeCommit = await this.gitClient.getCurrentCommit(codebaseStoragePath);
        context.logger.debug(`[${pipelineId}] [GIT-SYNC] Current commit before pull`, {
          beforeCommit: beforeCommit.substring(0, 8)
        });

        // Pull latest changes
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Pulling latest changes from remote`);
        commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
          branch: codebase!.branch,
          gitConfig: codebase!.metadata?.gitConfig
        });
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Pull completed`, {
          newCommit: commitHash.substring(0, 8),
          hasChanges: beforeCommit !== commitHash
        });

        if (beforeCommit === commitHash) {
          context.logger.info(`[${pipelineId}] [GIT-SYNC] No new commits found, repository is up to date`);
        } else {
          // Get diff to determine what changed
          context.logger.debug(`[${pipelineId}] [GIT-SYNC] Analyzing changes between commits`, {
            fromCommit: beforeCommit.substring(0, 8),
            toCommit: commitHash.substring(0, 8)
          });

          const changes = await this.gitClient.getDiff(codebaseStoragePath, {
            fromCommit: beforeCommit,
            nameOnly: true
          });

          context.logger.debug(`[${pipelineId}] [GIT-SYNC] Found ${changes.length} file changes`);

          // Categorize changes
          for (const change of changes) {
            switch (change.operation) {
              case 'A':
                filesAdded.push(change.path);
                break;
              case 'D':
                filesDeleted.push(change.path);
                break;
              case 'M':
                filesChanged.push(change.path);
                break;
              case 'R':
                // Renamed files are treated as deleted + added
                if (change.oldPath) filesDeleted.push(change.oldPath);
                filesAdded.push(change.path);
                break;
            }
          }

          context.logger.info(`[${pipelineId}] [GIT-SYNC] Changes categorized`, {
            added: filesAdded.length,
            modified: filesChanged.length,
            deleted: filesDeleted.length,
            renamed: changes.filter(c => c.operation === 'R').length
          });
        }

      } else {
        // Full sync: Clone fresh repository
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting full Git clone`, {
          url: codebase!.gitlabUrl,
          branch: codebase!.branch,
          destination: codebaseStoragePath,
          shallow: config.gitSync.shallow
        });

        // Delete existing repository if it exists
        if (isValidRepo) {
          context.logger.debug(`[${pipelineId}] [GIT-SYNC] Removing existing repository`);
          await this.gitClient.deleteRepository(codebaseStoragePath);
          context.logger.debug(`[${pipelineId}] [GIT-SYNC] Existing repository removed`);
        }

        // Clone repository
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Cloning repository from remote`);
        const cloneStartTime = Date.now();

        commitHash = await this.gitClient.cloneRepository(
          codebase!.gitlabUrl,
          codebaseStoragePath,
          {
            branch: codebase!.branch,
            depth: config.gitSync.shallow ? 1 : undefined,
            gitConfig: codebase!.metadata?.gitConfig
          }
        );

        const cloneDuration = Date.now() - cloneStartTime;
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Repository cloned successfully`, {
          commitHash: commitHash.substring(0, 8),
          cloneDurationMs: cloneDuration
        });

        // For full sync, all files are considered "added"
        context.logger.debug(`[${pipelineId}] [GIT-SYNC] Listing all files in repository`);
        filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Repository file inventory completed`, {
          totalFiles: filesAdded.length
        });
      }

      // Calculate total changed files
      const totalFiles = filesAdded.length + filesChanged.length;

      context.logger.info(`[${pipelineId}] [GIT-SYNC] Git sync completed successfully`, {
        mode: isIncremental ? 'incremental' : 'full',
        commitHash: commitHash.substring(0, 8),
        filesAdded: filesAdded.length,
        filesChanged: filesChanged.length,
        filesDeleted: filesDeleted.length,
        totalFiles,
      });

      this.logger.log(`[${pipelineId}] [GIT-SYNC] Task completed successfully`, {
        mode: isIncremental ? 'incremental' : 'full',
        commitHash: commitHash.substring(0, 8),
        totalFilesProcessed: totalFiles,
        codebaseId: codebase!.id,
        codebaseName: codebase!.name
      });

      // Store results in context for downstream tasks to use
      // This data will be available to all subsequent tasks in the pipeline
      context.data.gitSync = {
        clonePath: codebaseStoragePath,  // Where the repository is stored
        commitHash,                       // Current commit after sync
        filesChanged,                     // Modified files (incremental only)
        filesAdded,                       // New files
        filesDeleted,                     // Removed files (incremental only)
      };

      return {
        success: true,
        duration: 0, // Will be set by base class
        data: context.data.gitSync,
        metrics: {
          filesProcessed: totalFiles,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${pipelineId}] [GIT-SYNC] Task failed with error`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        codebaseId: codebase!.id,
        codebaseName: codebase!.name,
        gitlabUrl: codebase!.gitlabUrl,
        branch: codebase!.branch
      });

      context.logger.error(`[${pipelineId}] [GIT-SYNC] Git sync failed`, {
        error: errorMessage
      });

      return {
        success: false,
        duration: 0,
        error: `Git sync failed: ${errorMessage}`,
      };
    }
  }

  async cleanup(context: PipelineContext): Promise<void> {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Starting task cleanup`);

    // Cleanup will be handled by cleanup task
    // This is just for any task-specific cleanup if needed

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Task cleanup completed`);
    context.logger.debug(`[${pipelineId}] [GIT-SYNC] Git sync cleanup completed`);
  }

  getEstimatedDuration(context: PipelineContext): number {
    const { pipeline, codebase } = context;
    const pipelineId = pipeline.id;

    // Estimate based on repository size and network
    const baseTime = 30000; // 30 seconds base
    const isIncremental = pipeline.type === IndexPipelineType.INCREMENTAL;
    const estimatedTime = isIncremental ? baseTime * 0.3 : baseTime;

    this.logger.debug(`[${pipelineId}] [GIT-SYNC] Estimated task duration calculated`, {
      baseTime,
      isIncremental,
      estimatedTime,
      codebaseId: codebase?.id,
      codebaseName: codebase?.name
    });

    return estimatedTime;
  }
}