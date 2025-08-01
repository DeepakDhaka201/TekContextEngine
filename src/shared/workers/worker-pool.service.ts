import { Injectable, Inject, LoggerService, OnModuleDestroy } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export interface WorkerTask<T = any> {
  id: string;
  execute: () => Promise<T>;
  timeout?: number;
}

export interface WorkerPoolOptions {
  maxWorkers: number;
  taskTimeout: number;
}

interface Worker {
  id: string;
  busy: boolean;
  lastUsed: Date;
  currentTask?: WorkerTask;
}

/**
 * Semaphore for controlling concurrency
 */
export class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

/**
 * Worker Pool implementation
 */
export class WorkerPool implements OnModuleDestroy {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private semaphore: Semaphore;
  private isShuttingDown = false;

  constructor(
    private readonly name: string,
    private readonly options: WorkerPoolOptions,
    private readonly logger: LoggerService,
  ) {
    this.logger.debug(`[WORKER-POOL] [${this.name}] Initializing worker pool`, 'WorkerPool');
    this.logger.debug({
      maxWorkers: options.maxWorkers,
      taskTimeout: options.taskTimeout
    }, 'WorkerPool');

    this.semaphore = new Semaphore(options.maxWorkers);
    this.initializeWorkers();

    this.logger.log(`[WORKER-POOL] [${this.name}] Worker pool initialized successfully`, 'WorkerPool');
    this.logger.log({
      totalWorkers: this.workers.length,
      maxWorkers: options.maxWorkers
    }, 'WorkerPool');
  }

  /**
   * Submit a task to the worker pool
   */
  async submit<T>(task: WorkerTask<T>): Promise<T> {
    this.logger.debug(`[WORKER-POOL] [${this.name}] Submitting task to pool`, {
      taskId: task.id,
      timeout: task.timeout,
      currentQueueSize: this.taskQueue.length,
      activeWorkers: this.getActiveWorkerCount()
    });

    if (this.isShuttingDown) {
      this.logger.error(`[WORKER-POOL] [${this.name}] Cannot submit task - pool is shutting down`, {
        taskId: task.id
      });
      throw new Error('Worker pool is shutting down');
    }

    return new Promise<T>((resolve, reject) => {
      const wrappedTask: WorkerTask<T> = {
        ...task,
        execute: async () => {
          try {
            this.logger.debug(`[WORKER-POOL] [${this.name}] Starting task execution`, 'WorkerPool');
            this.logger.debug({
              taskId: task.id
            }, 'WorkerPool');

            const result = await this.executeWithTimeout(task);

            this.logger.debug(`[WORKER-POOL] [${this.name}] Task completed successfully`, 'WorkerPool');
            this.logger.debug({
              taskId: task.id
            }, 'WorkerPool');

            resolve(result);
            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error(`[WORKER-POOL] [${this.name}] Task failed`, {
              taskId: task.id,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined
            });

            reject(error);
            throw error;
          }
        },
      };

      this.taskQueue.push(wrappedTask);

      this.logger.debug(`[WORKER-POOL] [${this.name}] Task added to queue`, {
        taskId: task.id,
        newQueueSize: this.taskQueue.length
      });

      this.processQueue();
    });
  }



  /**
   * Shutdown the worker pool gracefully
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.logger.log('Shutting down worker pool...');
    this.isShuttingDown = true;

    // Wait for active tasks to complete or timeout
    const startTime = Date.now();
    while (this.hasActiveTasks() && Date.now() - startTime < timeout) {
      await this.sleep(100);
    }

    // Force cleanup
    this.taskQueue.length = 0;
    this.workers.length = 0;

    this.logger.log('Worker pool shutdown complete');
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  /**
   * Initialize workers
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      this.workers.push(this.createWorker(i));
    }
  }

  /**
   * Create a new worker
   */
  private createWorker(id: number): Worker {
    return {
      id: `${this.name}-worker-${id}`,
      busy: false,
      lastUsed: new Date(),
    };
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    this.logger.debug(`[WORKER-POOL] [${this.name}] Processing queue`, {
      queueLength: this.taskQueue.length,
      isShuttingDown: this.isShuttingDown,
      activeWorkers: this.getActiveWorkerCount(),
      availableWorkers: this.getAvailableWorkerCount()
    });

    if (this.taskQueue.length === 0 || this.isShuttingDown) {
      this.logger.debug(`[WORKER-POOL] [${this.name}] Queue processing skipped`, {
        reason: this.taskQueue.length === 0 ? 'empty queue' : 'shutting down'
      });
      return;
    }

    // Try to acquire a worker
    this.logger.debug(`[WORKER-POOL] [${this.name}] Acquiring worker from semaphore`);
    await this.semaphore.acquire();

    try {
      const task = this.taskQueue.shift();
      if (!task) {
        this.logger.debug(`[WORKER-POOL] [${this.name}] No task available after acquiring worker`);
        this.semaphore.release();
        return;
      }

      const worker = this.getAvailableWorker();
      if (!worker) {
        // This shouldn't happen due to semaphore, but handle gracefully
        this.logger.warn(`[WORKER-POOL] [${this.name}] No available worker despite semaphore acquisition`, {
          taskId: task.id,
          totalWorkers: this.workers.length,
          activeWorkers: this.getActiveWorkerCount()
        });

        this.taskQueue.unshift(task);
        this.semaphore.release();
        return;
      }

      this.logger.debug(`[WORKER-POOL] [${this.name}] Assigning task to worker`, {
        taskId: task.id,
        workerId: worker.id,
        queueLengthAfterShift: this.taskQueue.length
      });

      // Execute task
      this.executeTask(worker, task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[WORKER-POOL] [${this.name}] Error processing queue`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        queueLength: this.taskQueue.length
      });

      this.semaphore.release();
      this.logger.error('Error processing queue:', error);
    }
  }

  /**
   * Execute a task with a worker
   */
  private async executeTask(worker: Worker, task: WorkerTask): Promise<void> {
    this.logger.debug(`[WORKER-POOL] [${this.name}] Starting task execution`, {
      taskId: task.id,
      workerId: worker.id,
      workerLastUsed: worker.lastUsed
    });

    worker.busy = true;
    worker.currentTask = task;
    worker.lastUsed = new Date();

    const taskStartTime = Date.now();

    try {
      await task.execute();
      const taskDuration = Date.now() - taskStartTime;

      this.logger.debug(`[WORKER-POOL] [${this.name}] Task executed successfully`, {
        taskId: task.id,
        workerId: worker.id,
        duration: taskDuration
      });
    } catch (error) {
      const taskDuration = Date.now() - taskStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[WORKER-POOL] [${this.name}] Task execution failed`, {
        taskId: task.id,
        workerId: worker.id,
        duration: taskDuration,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Task ${task.id} failed:`, error);
    } finally {
      this.logger.debug(`[WORKER-POOL] [${this.name}] Cleaning up after task execution`, {
        taskId: task.id,
        workerId: worker.id
      });

      worker.busy = false;
      worker.currentTask = undefined;
      this.semaphore.release();

      // Continue processing queue
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout<T>(task: WorkerTask<T>): Promise<T> {
    const timeout = task.timeout || this.options.taskTimeout;
    
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);

      task.execute()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get an available worker
   */
  private getAvailableWorker(): Worker | null {
    return this.workers.find(w => !w.busy) || null;
  }

  /**
   * Get count of active workers
   */
  private getActiveWorkerCount(): number {
    return this.workers.filter(w => w.busy).length;
  }

  /**
   * Get count of available workers
   */
  private getAvailableWorkerCount(): number {
    return this.workers.filter(w => !w.busy).length;
  }

  /**
   * Check if there are active tasks
   */
  private hasActiveTasks(): boolean {
    return this.workers.some(w => w.busy) || this.taskQueue.length > 0;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Worker Pool Service - manages multiple worker pools
 */
@Injectable()
export class WorkerPoolService implements OnModuleDestroy {
  private pools = new Map<string, WorkerPool>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.logger.debug('[WORKER-POOL-SERVICE] Initializing worker pool service', 'WorkerPoolService');
  }

  /**
   * Create a new worker pool
   */
  createPool(name: string, options: WorkerPoolOptions): WorkerPool {
    this.logger.debug('[WORKER-POOL-SERVICE] Creating new worker pool', 'WorkerPoolService');
    this.logger.debug({
      poolName: name,
      maxWorkers: options.maxWorkers,
      taskTimeout: options.taskTimeout
    }, 'WorkerPoolService');

    if (this.pools.has(name)) {
      this.logger.error('[WORKER-POOL-SERVICE] Cannot create pool - name already exists', 'WorkerPoolService');
      this.logger.error({
        poolName: name,
        existingPools: Array.from(this.pools.keys())
      }, 'WorkerPoolService');
      throw new Error(`Worker pool '${name}' already exists`);
    }

    const pool = new WorkerPool(name, options, this.logger);
    this.pools.set(name, pool);

    this.logger.log('[WORKER-POOL-SERVICE] Worker pool created successfully', 'WorkerPoolService');
    this.logger.log({
      poolName: name,
      maxWorkers: options.maxWorkers,
      totalPools: this.pools.size
    }, 'WorkerPoolService');

    this.logger.log(`Created worker pool '${name}' with ${options.maxWorkers} workers`, 'WorkerPoolService');
    return pool;
  }



  /**
   * Submit a task to a specific pool
   */
  async submitTask<T>(poolName: string, task: WorkerTask<T>): Promise<T> {
    this.logger.debug('[WORKER-POOL-SERVICE] Submitting task to pool', 'WorkerPoolService');
    this.logger.debug({
      poolName,
      taskId: task.id,
      taskTimeout: task.timeout
    }, 'WorkerPoolService');

    const pool = this.pools.get(poolName);
    if (!pool) {
      this.logger.error('[WORKER-POOL-SERVICE] Cannot submit task - pool not found', 'WorkerPoolService');
      this.logger.error({
        poolName,
        taskId: task.id,
        availablePools: Array.from(this.pools.keys())
      }, 'WorkerPoolService');
      throw new Error(`Worker pool '${poolName}' not found`);
    }

    try {
      const result = await pool.submit(task);

      this.logger.debug('[WORKER-POOL-SERVICE] Task submitted successfully', 'WorkerPoolService');
      this.logger.debug({
        poolName,
        taskId: task.id
      }, 'WorkerPoolService');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[WORKER-POOL-SERVICE] Task submission failed', {
        poolName,
        taskId: task.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }



  /**
   * Shutdown all pools
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down all worker pools...');
    
    const shutdownPromises = Array.from(this.pools.values()).map(pool => 
      pool.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    this.pools.clear();
    
    this.logger.log('All worker pools shut down');
  }
}
