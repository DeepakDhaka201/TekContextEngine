import { JobContext, TaskExecutionResult } from './job-context.interface';
import { TaskConfig } from '../../entities/index-job.entity';

export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface ITask {
  readonly name: string;
  readonly description: string;
  readonly requiredTasks: string[];
  readonly optionalTasks: string[];

  /**
   * Get task-specific configuration
   */
  getConfig(context: JobContext): TaskConfig;

  /**
   * Check if task should be executed based on context
   */
  shouldExecute(context: JobContext): boolean;

  /**
   * Validate that all prerequisites are met
   */
  validate(context: JobContext): Promise<void>;

  /**
   * Execute the task
   */
  execute(context: JobContext): Promise<TaskExecutionResult>;

  /**
   * Cleanup after task execution (success or failure)
   */
  cleanup(context: JobContext): Promise<void>;

  /**
   * Get estimated duration in milliseconds
   */
  getEstimatedDuration(context: JobContext): number;
}

export abstract class BaseTask implements ITask {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiredTasks: string[];
  abstract readonly optionalTasks: string[];

  protected status: TaskStatus = TaskStatus.PENDING;
  protected startTime?: Date;
  protected endTime?: Date;

  /**
   * Abstract method to get task-specific configuration
   */
  abstract getConfig(context: JobContext): TaskConfig;

  /**
   * Default implementation - always execute unless explicitly overridden
   */
  shouldExecute(_context: JobContext): boolean {
    return true;
  }

  /**
   * Default validation - check required tasks are completed
   */
  async validate(context: JobContext): Promise<void> {
    for (const requiredTask of this.requiredTasks) {
      if (!context.data[requiredTask]) {
        throw new Error(`Required task '${requiredTask}' not completed before ${this.name}`);
      }
    }
  }

  /**
   * Template method for task execution
   */
  async execute(context: JobContext): Promise<TaskExecutionResult> {
    this.status = TaskStatus.RUNNING;
    this.startTime = new Date();

    try {
      context.logger.info(`Starting task: ${this.name}`);
      context.metrics.taskTimes[this.name] = { start: this.startTime };

      // Validate prerequisites
      await this.validate(context);

      // Execute the actual task logic
      const result = await this.executeTask(context);

      this.endTime = new Date();
      this.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;

      const duration = this.endTime.getTime() - this.startTime.getTime();
      context.metrics.taskTimes[this.name].end = this.endTime;
      context.metrics.taskTimes[this.name].duration = duration;

      if (result.success) {
        context.logger.info(`Task completed: ${this.name}`, { duration });
      } else {
        context.logger.error(`Task failed: ${this.name}`, { error: result.error, duration });
        context.metrics.errors.push({
          task: this.name,
          error: result.error || 'Unknown error',
          timestamp: new Date(),
        });
      }

      return {
        ...result,
        duration,
      };

    } catch (error) {
      this.endTime = new Date();
      this.status = TaskStatus.FAILED;

      const duration = this.endTime.getTime() - this.startTime!.getTime();
      context.metrics.taskTimes[this.name].end = this.endTime;
      context.metrics.taskTimes[this.name].duration = duration;

      context.logger.error(`Task error: ${this.name}`, { error: error.message, duration });
      context.metrics.errors.push({
        task: this.name,
        error: error.message,
        timestamp: new Date(),
      });

      return {
        success: false,
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Abstract method for actual task implementation
   */
  protected abstract executeTask(context: JobContext): Promise<TaskExecutionResult>;

  /**
   * Default cleanup - override if needed
   */
  async cleanup(context: JobContext): Promise<void> {
    context.logger.debug(`Cleanup completed for task: ${this.name}`);
  }

  /**
   * Default estimated duration - override with actual estimates
   */
  getEstimatedDuration(_context: JobContext): number {
    return 30000; // 30 seconds default
  }

  /**
   * Get current task status
   */
  getStatus(): TaskStatus {
    return this.status;
  }

  /**
   * Get task execution duration if completed
   */
  getDuration(): number | null {
    if (this.startTime && this.endTime) {
      return this.endTime.getTime() - this.startTime.getTime();
    }
    return null;
  }
}