import { PipelineContext, TaskExecutionResult } from './pipeline-context.interface';

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
  readonly requiredSteps: string[];
  readonly optionalSteps: string[];
  
  /**
   * Check if task should be executed based on context
   */
  shouldExecute(context: PipelineContext): boolean;
  
  /**
   * Validate that all prerequisites are met
   */
  validate(context: PipelineContext): Promise<void>;
  
  /**
   * Execute the task
   */
  execute(context: PipelineContext): Promise<TaskExecutionResult>;
  
  /**
   * Cleanup after task execution (success or failure)
   */
  cleanup(context: PipelineContext): Promise<void>;
  
  /**
   * Get estimated duration in milliseconds
   */
  getEstimatedDuration(context: PipelineContext): number;
}

export abstract class BaseTask implements ITask {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiredSteps: string[];
  abstract readonly optionalSteps: string[];

  protected status: TaskStatus = TaskStatus.PENDING;
  protected startTime?: Date;
  protected endTime?: Date;

  /**
   * Default implementation - always execute unless explicitly overridden
   */
  shouldExecute(context: PipelineContext): boolean {
    return true;
  }

  /**
   * Default validation - check required steps are completed
   */
  async validate(context: PipelineContext): Promise<void> {
    for (const requiredStep of this.requiredSteps) {
      if (!context.data[requiredStep]) {
        throw new Error(`Required step '${requiredStep}' not completed before ${this.name}`);
      }
    }
  }

  /**
   * Template method for task execution
   */
  async execute(context: PipelineContext): Promise<TaskExecutionResult> {
    this.status = TaskStatus.RUNNING;
    this.startTime = new Date();
    
    try {
      context.logger.info(`Starting task: ${this.name}`);
      context.metrics.stepTimes[this.name] = { start: this.startTime };
      
      // Validate prerequisites
      await this.validate(context);
      
      // Execute the actual task logic
      const result = await this.executeTask(context);
      
      this.endTime = new Date();
      this.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      
      const duration = this.endTime.getTime() - this.startTime.getTime();
      context.metrics.stepTimes[this.name].end = this.endTime;
      context.metrics.stepTimes[this.name].duration = duration;
      
      if (result.success) {
        context.logger.info(`Task completed: ${this.name}`, { duration });
      } else {
        context.logger.error(`Task failed: ${this.name}`, { error: result.error, duration });
        context.metrics.errors.push({
          step: this.name,
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
      context.metrics.stepTimes[this.name].end = this.endTime;
      context.metrics.stepTimes[this.name].duration = duration;
      
      context.logger.error(`Task error: ${this.name}`, { error: error.message, duration });
      context.metrics.errors.push({
        step: this.name,
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
  protected abstract executeTask(context: PipelineContext): Promise<TaskExecutionResult>;

  /**
   * Default cleanup - override if needed
   */
  async cleanup(context: PipelineContext): Promise<void> {
    context.logger.debug(`Cleanup completed for task: ${this.name}`);
  }

  /**
   * Default estimated duration - override with actual estimates
   */
  getEstimatedDuration(context: PipelineContext): number {
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