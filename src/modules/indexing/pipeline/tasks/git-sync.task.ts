import { Injectable } from '@nestjs/common';
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
  
  constructor(private gitClient: GitClientService) {
    super();
  }

  shouldExecute(context: PipelineContext): boolean {
    return !!context.codebase?.gitlabUrl;
  }

  async validate(context: PipelineContext): Promise<void> {
    if (!context.codebase) {
      throw new Error('Codebase is required for Git sync');
    }
    
    if (!context.codebase.gitlabUrl) {
      throw new Error('GitLab URL is required for Git sync');
    }

    if (!context.workingDirectory) {
      throw new Error('Working directory is required for Git sync');
    }
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { pipeline, codebase, codebaseStoragePath, config } = context;
    
    // Determine if this should be an incremental sync based on pipeline type
    const isIncremental = pipeline.type === IndexPipelineType.INCREMENTAL && 
                         await this.gitClient.isValidRepository(codebaseStoragePath);

    try {
      let commitHash: string;
      let filesChanged: string[] = [];
      let filesAdded: string[] = [];
      let filesDeleted: string[] = [];

      if (isIncremental) {
        // Incremental sync: Update existing repository
        context.logger.info('Starting incremental Git sync', { 
          path: codebaseStoragePath,
          branch: codebase!.branch 
        });

        // Get current commit before pull
        const beforeCommit = await this.gitClient.getCurrentCommit(codebaseStoragePath);

        // Pull latest changes
        commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
          branch: codebase!.branch,
          gitConfig: codebase!.metadata?.gitConfig
        });

        // Get diff to determine what changed
        const changes = await this.gitClient.getDiff(codebaseStoragePath, {
          fromCommit: beforeCommit,
          nameOnly: true
        });

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

      } else {
        // Full sync: Clone fresh repository
        context.logger.info('Starting full Git clone', { 
          url: codebase!.gitlabUrl, 
          branch: codebase!.branch,
          destination: codebaseStoragePath
        });

        // Delete existing repository if it exists
        if (await this.gitClient.isValidRepository(codebaseStoragePath)) {
          await this.gitClient.deleteRepository(codebaseStoragePath);
        }

        // Clone repository
        commitHash = await this.gitClient.cloneRepository(
          codebase!.gitlabUrl,
          codebaseStoragePath,
          {
            branch: codebase!.branch,
            depth: config.gitSync.shallow ? 1 : undefined,
            gitConfig: codebase!.metadata?.gitConfig
          }
        );

        // For full sync, all files are considered "added"
        filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
      }

      // Calculate total changed files
      const totalFiles = filesAdded.length + filesChanged.length;
      
      context.logger.info('Git sync completed', {
        mode: isIncremental ? 'incremental' : 'full',
        commitHash,
        filesAdded: filesAdded.length,
        filesChanged: filesChanged.length,
        filesDeleted: filesDeleted.length,
        totalFiles,
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
      context.logger.error('Git sync failed', { error: error.message });
      
      return {
        success: false,
        duration: 0,
        error: `Git sync failed: ${error.message}`,
      };
    }
  }

  async cleanup(context: PipelineContext): Promise<void> {
    // Cleanup will be handled by cleanup task
    context.logger.debug('Git sync cleanup completed');
  }

  getEstimatedDuration(context: PipelineContext): number {
    // Estimate based on repository size and network
    const baseTime = 30000; // 30 seconds base
    const isIncremental = context.pipeline.type === IndexPipelineType.INCREMENTAL;
    return isIncremental ? baseTime * 0.3 : baseTime;
  }
}