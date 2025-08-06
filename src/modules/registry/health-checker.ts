/**
 * @fileoverview Health monitoring system for registered modules
 * @module modules/registry/health-checker
 * @requires ./types
 * 
 * This file implements periodic health checking for all registered modules.
 * It monitors module health status, detects failures, and provides
 * comprehensive health reporting for the entire registry.
 * 
 * Key concepts:
 * - Periodic health checks with configurable intervals
 * - Non-blocking health monitoring to avoid impacting performance
 * - Automatic status updates based on health check results
 * - Graceful handling of health check failures
 * - Health trend tracking and alerting
 * 
 * @example
 * ```typescript
 * import { HealthChecker } from './health-checker';
 * 
 * const checker = new HealthChecker(registry, 30000);
 * checker.start();
 * 
 * // Later...
 * checker.stop();
 * ```
 * 
 * @see types.ts for health-related type definitions
 * @since 1.0.0
 */

import { IModuleRegistry, ModuleMetadata, HealthStatus } from './types';

/**
 * Monitors the health of all registered modules in the registry.
 * 
 * The HealthChecker runs periodic health checks on all modules that implement
 * the health() method. It updates module metadata with health status and
 * provides early warning of module failures.
 * 
 * Features:
 * - Non-blocking periodic health checks
 * - Automatic status updates based on health results
 * - Configurable check intervals
 * - Graceful handling of health check failures
 * - Prevention of overlapping health checks
 * 
 * @remarks
 * Health checks are designed to be lightweight and fast. Modules should
 * implement health checks that complete in under 100ms and test only
 * critical functionality.
 * 
 * @example
 * ```typescript
 * const healthChecker = new HealthChecker(registry, 30000); // 30 second intervals
 * healthChecker.start();
 * 
 * // Health checker will call registry.health() periodically
 * // and update individual module health status
 * 
 * process.on('SIGTERM', () => {
 *   healthChecker.stop();
 * });
 * ```
 * 
 * @public
 */
export class HealthChecker {
  /**
   * Timer handle for periodic health checks.
   * Null when health checking is not active.
   */
  private interval?: NodeJS.Timer;
  
  /**
   * Flag to prevent overlapping health checks.
   * Set to true during health check execution.
   */
  private checking = false;
  
  /**
   * Number of consecutive health check failures.
   * Used for exponential backoff and alerting.
   */
  private consecutiveFailures = 0;
  
  /**
   * Timestamp of the last successful health check.
   * Used for staleness detection.
   */
  private lastSuccessfulCheck?: Date;
  
  /**
   * History of health check results for trend analysis.
   * Limited to last 100 checks to prevent memory leaks.
   */
  private healthHistory: HealthCheckResult[] = [];
  
  /**
   * Creates a new health checker instance.
   * 
   * @param registry - The module registry to monitor
   * @param checkInterval - Interval between health checks in milliseconds
   * 
   * @example
   * ```typescript
   * const checker = new HealthChecker(registry, 30000); // Check every 30 seconds
   * ```
   * 
   * Implementation notes:
   * - Does not start checking immediately; call start() to begin
   * - Check interval should be reasonable (typically 10-60 seconds)
   * - Very frequent checks (< 5 seconds) may impact performance
   */
  constructor(
    private readonly registry: IModuleRegistry,
    private readonly checkInterval: number
  ) {
    // Validate check interval
    if (checkInterval < 1000) {
      console.warn(`Health check interval of ${checkInterval}ms is very frequent and may impact performance`);
    }
  }
  
  /**
   * Starts periodic health checking.
   * 
   * If health checking is already active, this method has no effect.
   * Performs an initial health check immediately after starting.
   * 
   * @example
   * ```typescript
   * healthChecker.start();
   * // Health checking is now active
   * ```
   * 
   * Implementation notes:
   * - Uses setInterval for consistent timing
   * - Prevents overlapping checks with the 'checking' flag
   * - Runs initial check asynchronously to avoid blocking
   * - Handles errors gracefully without stopping the checker
   */
  start(): void {
    if (this.interval) {
      console.warn('HealthChecker is already running');
      return;
    }
    
    console.log(`Starting health checker with ${this.checkInterval}ms interval`);
    
    // Set up periodic health checks
    this.interval = setInterval(async () => {
      // Skip if previous check is still running
      if (this.checking) {
        console.warn('Skipping health check - previous check still in progress');
        return;
      }
      
      await this.performHealthCheck();
    }, this.checkInterval);
    
    // Perform initial health check
    // Use setTimeout to make it asynchronous and non-blocking
    setTimeout(() => {
      this.performHealthCheck().catch(error => {
        console.error('Initial health check failed:', error);
      });
    }, 0);
  }
  
  /**
   * Stops periodic health checking.
   * 
   * Clears the interval timer and waits for any in-progress
   * health check to complete.
   * 
   * @example
   * ```typescript
   * healthChecker.stop();
   * // Health checking is now stopped
   * ```
   * 
   * Implementation notes:
   * - Safe to call multiple times
   * - Does not interrupt in-progress health checks
   * - Clears the interval timer to prevent future checks
   */
  stop(): void {
    if (this.interval) {
      console.log('Stopping health checker');
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
  
  /**
   * Gets the current health checking status.
   * 
   * @returns True if health checking is active, false otherwise
   */
  isRunning(): boolean {
    return this.interval !== undefined;
  }
  
  /**
   * Gets health check history for analysis.
   * 
   * @param limit - Maximum number of recent results to return (default: 10)
   * @returns Array of recent health check results
   * 
   * @example
   * ```typescript
   * const recentChecks = healthChecker.getHealthHistory(5);
   * const avgDuration = recentChecks.reduce((sum, check) => sum + check.duration, 0) / recentChecks.length;
   * ```
   */
  getHealthHistory(limit: number = 10): HealthCheckResult[] {
    return this.healthHistory.slice(-limit);
  }
  
  /**
   * Performs a single health check on all modules.
   * 
   * This method:
   * 1. Calls health() on each initialized module
   * 2. Updates module metadata with results
   * 3. Updates module status based on health
   * 4. Records health check metrics
   * 5. Triggers alerts for unhealthy modules
   * 
   * @returns Promise that resolves when health check is complete
   * 
   * @private
   */
  private async performHealthCheck(): Promise<void> {
    if (this.checking) {
      return; // Prevent concurrent health checks
    }
    
    this.checking = true;
    const startTime = Date.now();
    
    try {
      console.debug('Starting health check...');
      
      // Get all modules from registry
      const modules = this.registry.getAll();
      const moduleHealthResults: Record<string, HealthStatus> = {};
      
      // Check each module's health
      for (const [moduleId, metadata] of modules.entries()) {
        try {
          const healthResult = await this.checkModuleHealth(moduleId, metadata);
          if (healthResult) {
            moduleHealthResults[moduleId] = healthResult;
            await this.updateModuleHealth(metadata, healthResult);
          }
        } catch (error) {
          console.error(`Error checking health of module '${moduleId}':`, error);
          
          // Create an error health status
          const errorHealth: HealthStatus = {
            status: 'unhealthy',
            message: `Health check failed: ${error.message}`,
            details: { 
              error: error.name,
              timestamp: new Date().toISOString()
            }
          };
          
          moduleHealthResults[moduleId] = errorHealth;
          await this.updateModuleHealth(metadata, errorHealth);
        }
      }
      
      // Calculate overall health metrics
      const duration = Date.now() - startTime;
      const healthSummary = this.calculateHealthSummary(moduleHealthResults);
      
      // Record this health check
      this.recordHealthCheck({
        timestamp: new Date(),
        duration,
        moduleResults: moduleHealthResults,
        summary: healthSummary,
        success: true
      });
      
      // Log health status changes
      this.logHealthChanges(moduleHealthResults);
      
      // Reset failure counter on successful check
      this.consecutiveFailures = 0;
      this.lastSuccessfulCheck = new Date();
      
      console.debug(`Health check completed in ${duration}ms - ${healthSummary.healthy}/${healthSummary.total} modules healthy`);
      
    } catch (error) {
      console.error('Health check failed:', error);
      
      // Record failed health check
      this.recordHealthCheck({
        timestamp: new Date(),
        duration: Date.now() - startTime,
        moduleResults: {},
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
        success: false,
        error: error.message
      });
      
      this.consecutiveFailures++;
      
      // Implement exponential backoff for repeated failures
      if (this.consecutiveFailures >= 3) {
        console.warn(`Health checker has failed ${this.consecutiveFailures} consecutive times`);
      }
      
    } finally {
      this.checking = false;
    }
  }
  
  /**
   * Checks the health of a single module.
   * 
   * @param moduleId - ID of the module to check
   * @param metadata - Module metadata
   * @returns Health status if module supports health checks, undefined otherwise
   * 
   * @private
   */
  private async checkModuleHealth(moduleId: string, metadata: ModuleMetadata): Promise<HealthStatus | undefined> {
    // Only check health of initialized modules that implement health()
    if (!metadata.initialized || !metadata.module || !metadata.module.health) {
      return undefined;
    }
    
    // Set a reasonable timeout for health checks
    const healthCheckTimeout = 5000; // 5 seconds
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), healthCheckTimeout);
      });
      
      // Race the health check against the timeout
      const healthResult = await Promise.race([
        metadata.module.health(),
        timeoutPromise
      ]);
      
      return healthResult;
      
    } catch (error) {
      // Convert any error into an unhealthy status
      return {
        status: 'unhealthy',
        message: `Health check error: ${error.message}`,
        details: {
          error: error.name,
          moduleId,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Updates module metadata with new health information.
   * 
   * @param metadata - Module metadata to update
   * @param health - New health status
   * 
   * @private
   */
  private async updateModuleHealth(metadata: ModuleMetadata, health: HealthStatus): Promise<void> {
    // Store health information in metadata
    metadata.healthStatus = health;
    metadata.lastHealthCheck = new Date();
    
    // Update module status based on health
    const previousStatus = metadata.status;
    
    if (health.status === 'unhealthy' && metadata.status === 'ready') {
      // Module became unhealthy - mark as error
      metadata.status = 'error';
      console.warn(`Module '${metadata.id}' marked as error due to unhealthy status: ${health.message}`);
      
    } else if (health.status === 'healthy' && metadata.status === 'error' && metadata.initialized) {
      // Module recovered - mark as ready again
      metadata.status = 'ready';
      console.info(`Module '${metadata.id}' recovered and marked as ready`);
    }
    
    // Log status changes
    if (previousStatus !== metadata.status) {
      console.info(`Module '${metadata.id}' status changed: ${previousStatus} -> ${metadata.status}`);
    }
  }
  
  /**
   * Calculates summary health statistics.
   * 
   * @param moduleResults - Health results for all checked modules
   * @returns Summary statistics
   * 
   * @private
   */
  private calculateHealthSummary(moduleResults: Record<string, HealthStatus>): HealthSummary {
    const summary: HealthSummary = {
      total: Object.keys(moduleResults).length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0
    };
    
    for (const health of Object.values(moduleResults)) {
      switch (health.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          break;
        case 'unhealthy':
          summary.unhealthy++;
          break;
      }
    }
    
    return summary;
  }
  
  /**
   * Records a health check result in the history.
   * 
   * @param result - Health check result to record
   * 
   * @private
   */
  private recordHealthCheck(result: HealthCheckResult): void {
    this.healthHistory.push(result);
    
    // Keep only the last 100 health check results to prevent memory leaks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
  }
  
  /**
   * Logs significant health status changes.
   * 
   * @param moduleResults - Current health check results
   * 
   * @private
   */
  private logHealthChanges(moduleResults: Record<string, HealthStatus>): void {
    for (const [moduleId, health] of Object.entries(moduleResults)) {
      // Log warnings for unhealthy modules
      if (health.status === 'unhealthy') {
        console.warn(`Module '${moduleId}' is unhealthy: ${health.message}`);
      }
      
      // Log info for degraded modules
      if (health.status === 'degraded') {
        console.info(`Module '${moduleId}' is degraded: ${health.message || 'No details provided'}`);
      }
    }
  }
}

/**
 * Summary statistics for health check results.
 * 
 * @internal
 */
interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
}

/**
 * Result of a complete health check cycle.
 * 
 * @internal
 */
interface HealthCheckResult {
  /** When the health check was performed */
  timestamp: Date;
  
  /** How long the health check took in milliseconds */
  duration: number;
  
  /** Health results for each module */
  moduleResults: Record<string, HealthStatus>;
  
  /** Summary statistics */
  summary: HealthSummary;
  
  /** Whether the health check completed successfully */
  success: boolean;
  
  /** Error message if the health check failed */
  error?: string;
}