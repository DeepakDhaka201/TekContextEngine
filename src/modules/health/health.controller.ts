import { Controller, Get, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.debug(`[${requestId}] [HEALTH-CHECK] Starting comprehensive health check`);

    try {
      const healthCheckStartTime = Date.now();

      const result = await this.health.check([
        () => this.db.pingCheck('database'),
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      ]);

      const healthCheckDuration = Date.now() - healthCheckStartTime;

      this.logger.debug(`[${requestId}] [HEALTH-CHECK] Health check completed successfully`, {
        status: result.status,
        duration: healthCheckDuration,
        checks: Object.keys(result.details || {}),
        allHealthy: result.status === 'ok'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${requestId}] [HEALTH-CHECK] Health check failed`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  @Get('simple')
  simpleCheck() {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.debug(`[${requestId}] [SIMPLE-HEALTH-CHECK] Performing simple health check`);

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'TekAI Context Engine',
      version: '2.0.0'
    };

    this.logger.debug(`[${requestId}] [SIMPLE-HEALTH-CHECK] Simple health check completed`, {
      status: response.status,
      service: response.service,
      version: response.version
    });

    return response;
  }
}