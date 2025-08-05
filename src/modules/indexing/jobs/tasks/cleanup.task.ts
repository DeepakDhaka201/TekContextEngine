import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { TaskConfig } from '../../entities/index-job.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CleanupTask extends BaseTask {
  readonly name = 'CLEANUP';
  readonly description = 'Clean up temporary files and resources';
  readonly requiredTasks: string[] = [];
  readonly optionalTasks: string[] = ['GIT_SYNC', 'CODE_PARSING', 'GRAPH_UPDATE'];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  getConfig(_context: JobContext): TaskConfig {
    return {
      enabled: true,
      timeout: 60000, // 1 minute
      retries: 1,
    };
  }

  shouldExecute(_context: JobContext): boolean {
    // Always execute cleanup
    return true;
  }

  async validate(_context: JobContext): Promise<void> {
    // No validation needed for cleanup
  }

  protected async executeTask(context: JobContext): Promise<TaskExecutionResult> {
    const { job, tempDirectory, workingDirectory } = context;
    const jobId = job.id;

    context.logger.info(`[${jobId}] [CLEANUP] Starting cleanup task`);

    try {
      let tempFilesRemoved = 0;
      let diskSpaceFreed = 0;

      // Clean up temporary directory
      if (tempDirectory) {
        try {
          const tempStats = await this.getDirectorySize(tempDirectory);
          await fs.rm(tempDirectory, { recursive: true, force: true });
          tempFilesRemoved += tempStats.fileCount;
          diskSpaceFreed += tempStats.totalSize;
          
          context.logger.debug(`[${jobId}] [CLEANUP] Removed temporary directory`, {
            path: tempDirectory,
            filesRemoved: tempStats.fileCount,
            sizeFreed: tempStats.totalSize
          });
        } catch (error) {
          context.logger.warn(`[${jobId}] [CLEANUP] Failed to remove temp directory`, {
            path: tempDirectory,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Clean up working directory (but keep codebase storage)
      if (workingDirectory && workingDirectory !== context.codebaseStoragePath) {
        try {
          const workingStats = await this.getDirectorySize(workingDirectory);
          await fs.rm(workingDirectory, { recursive: true, force: true });
          tempFilesRemoved += workingStats.fileCount;
          diskSpaceFreed += workingStats.totalSize;
          
          context.logger.debug(`[${jobId}] [CLEANUP] Removed working directory`, {
            path: workingDirectory,
            filesRemoved: workingStats.fileCount,
            sizeFreed: workingStats.totalSize
          });
        } catch (error) {
          context.logger.warn(`[${jobId}] [CLEANUP] Failed to remove working directory`, {
            path: workingDirectory,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Store results in context
      context.data.CLEANUP = {
        tempFilesRemoved,
        diskSpaceFreed,
      };

      context.logger.info(`[${jobId}] [CLEANUP] Cleanup completed successfully`, {
        tempFilesRemoved,
        diskSpaceFreed: this.formatBytes(diskSpaceFreed)
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        data: context.data.CLEANUP,
        metrics: {
          filesProcessed: tempFilesRemoved,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${jobId}] [CLEANUP] Task failed with error`, {
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

  private async getDirectorySize(dirPath: string): Promise<{ fileCount: number; totalSize: number }> {
    let fileCount = 0;
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          const subDirStats = await this.getDirectorySize(itemPath);
          fileCount += subDirStats.fileCount;
          totalSize += subDirStats.totalSize;
        } else {
          const stats = await fs.stat(itemPath);
          fileCount++;
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
      this.logger.debug(`Failed to get directory size: ${dirPath}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return { fileCount, totalSize };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanup(context: JobContext): Promise<void> {
    const { job } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [CLEANUP] Starting task cleanup (cleanup of cleanup)`);
    // Nothing to cleanup for the cleanup task itself
    this.logger.debug(`[${jobId}] [CLEANUP] Task cleanup completed`);
  }

  getEstimatedDuration(_context: JobContext): number {
    return 30000; // 30 seconds
  }
}
