import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WorkerTask<T = any> {
  id: string;
  execute: () => Promise<T>;
  priority?: number;
  timeout?: number;
  retries?: number;
}

export interface WorkerPoolOptions {
  maxWorkers: number;
  taskTimeout: number;
  retryAttempts: number;
  queueSize?: number;
  idleTimeout?: number;
}

export interface PoolStats {
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalWorkers: number;
  utilization: number;
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

  get available(): number {
    return this.permits;
  }

  get waiting(): number {
    return this.waitQueue.length;
  }
}

/**
 * Worker Pool implementation (Node.js equivalent of Go's ants)
 */
export class WorkerPool implements OnModuleDestroy {
  private readonly logger: Logger;
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private semaphore: Semaphore;
  private stats = {
    completedTasks: 0,
    failedTasks: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    private readonly name: string,
    private readonly options: WorkerPoolOptions,
  ) {
    this.logger = new Logger(`WorkerPool-${this.name}`);
    this.semaphore = new Semaphore(options.maxWorkers);
    this.initializeWorkers();
    this.startCleanupTimer();
  }

  /**
   * Submit a task to the worker pool
   */
  async submit<T>(task: WorkerTask<T>): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    // Check queue size limit
    if (this.options.queueSize && this.taskQueue.length >= this.options.queueSize) {
      throw new Error('Worker pool queue is full');
    }

    return new Promise<T>((resolve, reject) => {
      const wrappedTask: WorkerTask<T> = {
        ...task,
        execute: async () => {
          try {
            const result = await this.executeWithTimeout(task);
            this.stats.completedTasks++;
            resolve(result);
            return result;
          } catch (error) {
            this.stats.failedTasks++;
            reject(error);
            throw error;
          }
        },
      };

      this.taskQueue.push(wrappedTask);
      this.processQueue();
    });
  }

  /**
   * Submit multiple tasks and wait for all to complete
   */
  async submitBatch<T>(tasks: WorkerTask<T>[]): Promise<T[]> {
    const promises = tasks.map(task => this.submit(task));
    return Promise.all(promises);
  }

  /**
   * Submit tasks with controlled concurrency
   */
  async submitWithConcurrency<T>(
    tasks: WorkerTask<T>[],
    maxConcurrency: number,
  ): Promise<T[]> {
    const results: T[] = [];
    const semaphore = new Semaphore(maxConcurrency);

    const promises = tasks.map(async (task, index) => {
      await semaphore.acquire();
      try {
        const result = await this.submit(task);
        results[index] = result;
        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const activeWorkers = this.workers.filter(w => w.busy).length;
    const utilization = this.workers.length > 0 ? activeWorkers / this.workers.length : 0;

    return {
      activeWorkers,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      totalWorkers: this.workers.length,
      utilization,
    };
  }

  /**
   * Resize the worker pool
   */
  resize(newSize: number): void {
    if (newSize < 1) {
      throw new Error('Worker pool size must be at least 1');
    }

    const currentSize = this.options.maxWorkers;
    this.options.maxWorkers = newSize;
    this.semaphore = new Semaphore(newSize);

    if (newSize > currentSize) {
      // Add more workers
      for (let i = currentSize; i < newSize; i++) {
        this.workers.push(this.createWorker(i));
      }
    } else if (newSize < currentSize) {
      // Remove excess workers (only idle ones)
      const workersToRemove = this.workers
        .filter(w => !w.busy)
        .slice(0, currentSize - newSize);
      
      this.workers = this.workers.filter(w => !workersToRemove.includes(w));
    }

    this.logger.log(`Worker pool resized from ${currentSize} to ${newSize} workers`);
  }

  /**
   * Shutdown the worker pool gracefully
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.logger.log('Shutting down worker pool...');
    this.isShuttingDown = true;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

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
    if (this.taskQueue.length === 0 || this.isShuttingDown) {
      return;
    }

    // Try to acquire a worker
    await this.semaphore.acquire();

    try {
      const task = this.taskQueue.shift();
      if (!task) {
        this.semaphore.release();
        return;
      }

      const worker = this.getAvailableWorker();
      if (!worker) {
        // This shouldn't happen due to semaphore, but handle gracefully
        this.taskQueue.unshift(task);
        this.semaphore.release();
        return;
      }

      // Execute task
      this.executeTask(worker, task);
    } catch (error) {
      this.semaphore.release();
      this.logger.error('Error processing queue:', error);
    }
  }

  /**
   * Execute a task with a worker
   */
  private async executeTask(worker: Worker, task: WorkerTask): Promise<void> {
    worker.busy = true;
    worker.currentTask = task;
    worker.lastUsed = new Date();

    try {
      await task.execute();
    } catch (error) {
      this.logger.error(`Task ${task.id} failed:`, error);
    } finally {
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
   * Check if there are active tasks
   */
  private hasActiveTasks(): boolean {
    return this.workers.some(w => w.busy) || this.taskQueue.length > 0;
  }

  /**
   * Start cleanup timer for idle workers
   */
  private startCleanupTimer(): void {
    if (!this.options.idleTimeout) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, this.options.idleTimeout);
  }

  /**
   * Cleanup idle workers
   */
  private cleanupIdleWorkers(): void {
    if (!this.options.idleTimeout) return;

    const now = new Date();
    const idleThreshold = now.getTime() - this.options.idleTimeout;

    // Don't remove all workers, keep at least 1
    const idleWorkers = this.workers.filter(
      w => !w.busy && w.lastUsed.getTime() < idleThreshold
    );

    if (idleWorkers.length > 0 && this.workers.length > 1) {
      const toRemove = Math.min(idleWorkers.length, this.workers.length - 1);
      this.workers = this.workers.filter(w => !idleWorkers.slice(0, toRemove).includes(w));
      
      this.logger.debug(`Cleaned up ${toRemove} idle workers`);
    }
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
  private readonly logger = new Logger(WorkerPoolService.name);
  private pools = new Map<string, WorkerPool>();

  constructor(private configService: ConfigService) {}

  /**
   * Create a new worker pool
   */
  createPool(name: string, options: WorkerPoolOptions): WorkerPool {
    if (this.pools.has(name)) {
      throw new Error(`Worker pool '${name}' already exists`);
    }

    const pool = new WorkerPool(name, options);
    this.pools.set(name, pool);

    this.logger.log(`Created worker pool '${name}' with ${options.maxWorkers} workers`);
    return pool;
  }

  /**
   * Get an existing worker pool
   */
  getPool(name: string): WorkerPool | null {
    return this.pools.get(name) || null;
  }

  /**
   * Submit a task to a specific pool
   */
  async submitTask<T>(poolName: string, task: WorkerTask<T>): Promise<T> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Worker pool '${poolName}' not found`);
    }

    return pool.submit(task);
  }

  /**
   * Get stats for all pools
   */
  getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats();
    }
    return stats;
  }

  /**
   * Destroy a worker pool
   */
  async destroyPool(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (pool) {
      await pool.shutdown();
      this.pools.delete(name);
      this.logger.log(`Destroyed worker pool '${name}'`);
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
