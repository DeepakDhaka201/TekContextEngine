import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JobOrchestratorService, CreateJobRequest } from './jobs/services/job-orchestrator.service';
import { IndexJobType } from './entities/index-job.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Codebase } from '@/entities';

@ApiTags('Indexing')
@Controller('indexing')
export class IndexingController {
  constructor(
    private readonly jobOrchestrator: JobOrchestratorService,
    @InjectRepository(Codebase)
    private readonly codebaseRepository: Repository<Codebase>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job status and progress' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('id') jobId: string) {
    this.logger.debug(`[GET-JOB-STATUS] Retrieving job status`, {
      jobId
    });

    try {
      const job = await this.jobOrchestrator.getJobStatus(jobId);

      return {
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress || 0,
          currentTask: job.currentTask,
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          tasks: job.metadata?.tasks || {},
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[GET-JOB-STATUS] Failed to retrieve job status`, {
        jobId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Cancel a running job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Job cannot be cancelled' })
  async cancelJob(@Param('id') jobId: string) {
    this.logger.log(`[CANCEL-JOB] Cancelling job`, {
      jobId
    });

    try {
      await this.jobOrchestrator.cancelJob(jobId);

      this.logger.log(`[CANCEL-JOB] Job cancelled successfully`, {
        jobId
      });

      return {
        success: true,
        message: 'Job cancelled successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[CANCEL-JOB] Failed to cancel job`, {
        jobId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('codebases/:id/full-index')
  @ApiOperation({ summary: 'Start full codebase indexing' })
  @ApiParam({ name: 'id', description: 'Codebase ID' })
  @ApiResponse({ status: 201, description: 'Full indexing started' })
  async startFullIndexing(
    @Param('id') codebaseId: string,
  ) {
    this.logger.log(`[FULL-INDEX] Starting full indexing for codebase: ${codebaseId}`);

    try {
      // First, resolve the codebase and get its project ID
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
        relations: ['project'],
      });

      if (codebase) {
        const request: CreateJobRequest = {
          project: codebase.project,
          codebase,
          type: IndexJobType.CODEBASE_FULL,
          description: 'Full Codebase indexing',
        };
        const job = await this.jobOrchestrator.createJob(request);
        return {
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            projectId: codebase.project.id,
          },
          message: 'Full indexing started successfully',
        };
      } else {
        throw new NotFoundException(`Codebase ${codebaseId} not found`);
      }

      // Create the job request with proper project ID
    } catch (error) {
      this.logger.error(`[FULL-INDEX] Error starting full indexing for codebase ${codebaseId}:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(`Failed to start full indexing: ${error.message}`);
    }
  }

  @Post('codebases/:id/incremental-update')
  @ApiOperation({ summary: 'Start incremental codebase update' })
  @ApiParam({ name: 'id', description: 'Codebase ID' })
  @ApiQuery({ name: 'fromCommit', required: true, description: 'Starting commit hash to compare from' })
  @ApiResponse({ status: 201, description: 'Incremental update started' })
  async startIncrementalUpdate(
    @Param('id') codebaseId: string,
    @Query('fromCommit') fromCommit: string
  ) {
    this.logger.log(`[INCREMENTAL-UPDATE] Starting incremental update for codebase`, {
      codebaseId,
      fromCommit
    });

    try {
      // First, resolve the codebase and get its project ID
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
        relations: ['project'],
      });

      if (codebase) {
        const request: CreateJobRequest = {
          project: codebase.project,
          codebase,
          type: IndexJobType.CODEBASE_INCR,
          baseCommit: fromCommit,
          description: 'Incremental codebase update',
        };
        const job = await this.jobOrchestrator.createJob(request);
        this.logger.log(`[INCREMENTAL-UPDATE] Incremental update job created successfully`, {
          jobId: job.id,
          status: job.status,
          codebaseId
        });
        return {
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            projectId: codebase.project.id,
          },
          message: 'Incremental update started successfully',
        };
      } else {
        throw new NotFoundException(`Codebase ${codebaseId} not found`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[INCREMENTAL-UPDATE] Failed to start incremental update`, {
        codebaseId,
        fromCommit,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new BadRequestException(`Failed to start incremental update: ${errorMessage}`);
    }
  }
}