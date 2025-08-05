import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
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

export class CreateJobDto {
  projectId: string;
  codebaseId?: string;
  type: IndexJobType;
  description?: string;
  baseCommit?: string;
  priority?: number;
}

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

  @Post('jobs')
  @ApiOperation({ summary: 'Create and start a new indexing job' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Project or codebase not found' })
  async createJob(@Body() dto: CreateJobDto) {
    this.logger.debug(`[CREATE-JOB] Full request details`, {
      projectId: dto.projectId,
      codebaseId: dto.codebaseId,
      type: dto.type,
      description: dto.description,
      baseCommit: dto.baseCommit,
      priority: dto.priority
    });

    try {
      const request: CreateJobRequest = {
        projectId: dto.projectId,
        codebaseId: dto.codebaseId,
        type: dto.type,
        description: dto.description,
        baseCommit: dto.baseCommit,
        priority: dto.priority,
      };

      this.logger.debug(`[CREATE-JOB] Calling job orchestrator with request`);
      const job = await this.jobOrchestrator.createJob(request);

      this.logger.log(`[CREATE-JOB] Job created successfully`, {
        jobId: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt
      });

      return {
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
        },
        message: 'Index job created and started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[CREATE-JOB] Failed to create job`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        projectId: dto.projectId,
        codebaseId: dto.codebaseId,
        type: dto.type
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }
  }

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

      this.logger.debug(`[GET-JOB-STATUS] Job status retrieved successfully`, {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || 0,
        currentTask: job.currentTask,
        hasError: !!job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        tasksCount: Object.keys(job.metadata?.tasks || {}).length
      });

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
    @Query('description') description?: string
  ) {
    this.logger.log(`[FULL-INDEX] Starting full indexing for codebase: ${codebaseId}`);

    try {
      // First, resolve the codebase and get its project ID
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
        relations: ['project'],
      });

      if (!codebase) {
        throw new NotFoundException(`Codebase ${codebaseId} not found`);
      }

      // Create the job request with proper project ID
      const request: CreateJobRequest = {
        projectId: codebase.project.id,
        codebaseId,
        type: IndexJobType.CODEBASE_FULL,
        description: description || 'Full codebase indexing',
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

      if (!codebase) {
        throw new NotFoundException(`Codebase ${codebaseId} not found`);
      }

      const request: CreateJobRequest = {
        projectId: codebase.project.id,
        codebaseId,
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

  @Post('projects/:id/api-analysis')
  @ApiOperation({ summary: 'Start API analysis for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'API analysis started' })
  async startApiAnalysis(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    this.logger.log(`[API-ANALYSIS] Starting API analysis for project: ${projectId}`);

    try {
      const request: CreateJobRequest = {
        projectId,
        type: IndexJobType.API_ANALYSIS,
        description: description || 'Project API analysis',
      };

      const job = await this.jobOrchestrator.createJob(request);

      return {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          projectId,
        },
        message: 'API analysis started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[API-ANALYSIS] Failed to start API analysis`, { projectId, error: errorMessage });
      throw new BadRequestException(`Failed to start API analysis: ${errorMessage}`);
    }
  }

  @Post('projects/:id/userflow-analysis')
  @ApiOperation({ summary: 'Start user flow analysis for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'User flow analysis started' })
  async startUserflowAnalysis(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    this.logger.log(`[USERFLOW-ANALYSIS] Starting user flow analysis for project: ${projectId}`);

    try {
      const request: CreateJobRequest = {
        projectId,
        type: IndexJobType.USERFLOW_ANALYSIS,
        description: description || 'Project user flow analysis',
      };

      const job = await this.jobOrchestrator.createJob(request);

      return {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          projectId,
        },
        message: 'User flow analysis started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[USERFLOW-ANALYSIS] Failed to start user flow analysis`, { projectId, error: errorMessage });
      throw new BadRequestException(`Failed to start user flow analysis: ${errorMessage}`);
    }
  }

  @Post('projects/:id/docs-full-index')
  @ApiOperation({ summary: 'Start full documentation indexing for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Full documentation indexing started' })
  async startDocsFullIndex(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    this.logger.log(`[DOCS-FULL-INDEX] Starting full documentation indexing for project: ${projectId}`);

    try {
      const request: CreateJobRequest = {
        projectId,
        type: IndexJobType.DOCS_BUCKET_FULL,
        description: description || 'Full documentation indexing',
      };

      const job = await this.jobOrchestrator.createJob(request);

      return {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          projectId,
        },
        message: 'Full documentation indexing started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DOCS-FULL-INDEX] Failed to start full documentation indexing`, { projectId, error: errorMessage });
      throw new BadRequestException(`Failed to start full documentation indexing: ${errorMessage}`);
    }
  }

  @Post('projects/:id/docs-incremental-index')
  @ApiOperation({ summary: 'Start incremental documentation indexing for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Incremental documentation indexing started' })
  async startDocsIncrementalIndex(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    this.logger.log(`[DOCS-INCR-INDEX] Starting incremental documentation indexing for project: ${projectId}`);

    try {
      const request: CreateJobRequest = {
        projectId,
        type: IndexJobType.DOCS_BUCKET_INCR,
        description: description || 'Incremental documentation indexing',
      };

      const job = await this.jobOrchestrator.createJob(request);

      return {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          projectId,
        },
        message: 'Incremental documentation indexing started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[DOCS-INCR-INDEX] Failed to start incremental documentation indexing`, { projectId, error: errorMessage });
      throw new BadRequestException(`Failed to start incremental documentation indexing: ${errorMessage}`);
    }
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all jobs for monitoring' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async listJobs(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number
  ) {
    // TODO: Implement job listing with filters
    return {
      success: true,
      data: [],
      message: 'Job listing not yet implemented',
    };
  }
}