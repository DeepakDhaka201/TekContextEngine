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
import { PipelineOrchestratorService, CreatePipelineRequest } from './pipeline/services/pipeline-orchestrator.service';
import { IndexPipelineType } from './entities/index-pipeline.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Codebase } from '@/entities';

export class CreatePipelineDto {
  projectId: string;
  codebaseId?: string;
  type: IndexPipelineType;
  description?: string;
  baseCommit?: string;
  targetCommit?: string;
  priority?: number;
  customConfiguration?: any;
}

@ApiTags('Indexing')
@Controller('indexing')
export class IndexingController {
  constructor(
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
    @InjectRepository(Codebase)
    private readonly codebaseRepository: Repository<Codebase>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Post('pipelines')
  @ApiOperation({ summary: 'Create and start a new indexing pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Project or codebase not found' })
  async createPipeline(@Body() dto: CreatePipelineDto) {
    this.logger.debug(`[CREATE-PIPELINE] Full request details`, {
      projectId: dto.projectId,
      codebaseId: dto.codebaseId,
      type: dto.type,
      description: dto.description,
      baseCommit: dto.baseCommit,
      targetCommit: dto.targetCommit,
      priority: dto.priority,
      hasCustomConfiguration: !!dto.customConfiguration
    });

    try {
      const request: CreatePipelineRequest = {
        projectId: dto.projectId,
        codebaseId: dto.codebaseId,
        type: dto.type,
        description: dto.description,
        baseCommit: dto.baseCommit,
        targetCommit: dto.targetCommit,
        priority: dto.priority,
        customConfiguration: dto.customConfiguration,
      };

      this.logger.debug(`[CREATE-PIPELINE] Calling pipeline orchestrator with request`);
      const job = await this.pipelineOrchestrator.createPipeline(request);

      this.logger.log(`[CREATE-PIPELINE] Pipeline created successfully`, {
        pipelineId: job.id,
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
        message: 'Index pipeline created and started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[CREATE-PIPELINE] Failed to create pipeline`, {
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

  @Get('pipelines/:id')
  @ApiOperation({ summary: 'Get pipeline status and progress' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getPipelineStatus(@Param('id') pipelineId: string) {
    this.logger.debug(`[GET-PIPELINE-STATUS] Retrieving pipeline status`, {
      pipelineId
    });

    try {
      const job = await this.pipelineOrchestrator.getPipelineStatus(pipelineId);

      this.logger.debug(`[GET-PIPELINE-STATUS] Pipeline status retrieved successfully`, {
        pipelineId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || 0,
        currentStep: job.currentStep,
        hasError: !!job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        stepsCount: Object.keys(job.metadata?.steps || {}).length
      });

      return {
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress || 0,
          currentStep: job.currentStep,
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          steps: job.metadata?.steps || {},
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[GET-PIPELINE-STATUS] Failed to retrieve pipeline status`, {
        pipelineId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Delete('pipelines/:id')
  @ApiOperation({ summary: 'Cancel a running pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Pipeline cannot be cancelled' })
  async cancelPipeline(@Param('id') pipelineId: string) {
    this.logger.log(`[CANCEL-PIPELINE] Cancelling pipeline`, {
      pipelineId
    });

    try {
      await this.pipelineOrchestrator.cancelPipeline(pipelineId);

      this.logger.log(`[CANCEL-PIPELINE] Pipeline cancelled successfully`, {
        pipelineId
      });

      return {
        success: true,
        message: 'Pipeline cancelled successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[CANCEL-PIPELINE] Failed to cancel pipeline`, {
        pipelineId,
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
    this.logger.debug(`[FULL-INDEX] Request params: { codebaseId: "${codebaseId}", description: "${description}" }`);

    try {
      // First, resolve the codebase and get its project ID
      this.logger.log(`[FULL-INDEX] Looking up codebase: ${codebaseId}`);
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
        relations: ['project'],
      });

      if (!codebase) {
        this.logger.error(`[FULL-INDEX] Codebase not found: ${codebaseId}`);
        throw new NotFoundException(`Codebase ${codebaseId} not found`);
      }

      this.logger.log(`[FULL-INDEX] Codebase found: ${codebase.name} (Project: ${codebase.project.id})`);
      this.logger.debug(`[FULL-INDEX] Codebase details: { id: "${codebase.id}", name: "${codebase.name}", projectId: "${codebase.project.id}", gitlabUrl: "${codebase.gitlabUrl}" }`);

      // Create the pipeline request with proper project ID
      const request: CreatePipelineRequest = {
        projectId: codebase.project.id,
        codebaseId,
        type: IndexPipelineType.FULL,
        description: description || 'Full codebase indexing',
      };

      this.logger.log(`[FULL-INDEX] Creating pipeline request:`);
      this.logger.debug(`[FULL-INDEX] Pipeline request: ${JSON.stringify(request, null, 2)}`);

      const job = await this.pipelineOrchestrator.createPipeline(request);

      this.logger.log(`[FULL-INDEX] Pipeline created successfully: ${job.id}`);
      this.logger.debug(`[FULL-INDEX] Pipeline details: { id: "${job.id}", type: "${job.type}", status: "${job.status}", createdAt: "${job.createdAt}" }`);

      return {
        success: true,
        data: {
          pipelineId: job.id,
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
  @ApiResponse({ status: 201, description: 'Incremental update started' })
  async startIncrementalUpdate(
    @Param('id') codebaseId: string,
    @Query('baseCommit') baseCommit?: string,
    @Query('targetCommit') targetCommit?: string
  ) {
    this.logger.log(`[INCREMENTAL-UPDATE] Starting incremental update for codebase`, {
      codebaseId,
      baseCommit,
      targetCommit
    });

    try {
      const request: CreatePipelineRequest = {
        projectId: '', // Will be resolved from codebase
        codebaseId,
        type: IndexPipelineType.INCREMENTAL,
        baseCommit,
        targetCommit,
        description: 'Incremental codebase update',
      };

      this.logger.debug(`[INCREMENTAL-UPDATE] Creating incremental pipeline request`, {
        request: {
          codebaseId: request.codebaseId,
          type: request.type,
          baseCommit: request.baseCommit,
          targetCommit: request.targetCommit,
          description: request.description
        }
      });

      const job = await this.pipelineOrchestrator.createPipeline(request);

      this.logger.log(`[INCREMENTAL-UPDATE] Incremental update pipeline created successfully`, {
        pipelineId: job.id,
        status: job.status,
        codebaseId
      });

      return {
        success: true,
        data: {
          pipelineId: job.id,
          status: job.status,
        },
        message: 'Incremental update started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[INCREMENTAL-UPDATE] Failed to start incremental update`, {
        codebaseId,
        baseCommit,
        targetCommit,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new BadRequestException(`Failed to start incremental update: ${errorMessage}`);
    }
  }

  @Post('projects/:id/dependency-analysis')
  @ApiOperation({ summary: 'Start dependency analysis for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Dependency analysis started' })
  async startDependencyAnalysis(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    this.logger.log(`[DEPENDENCY-ANALYSIS] Starting dependency analysis for project`, {
      projectId,
      description
    });

    try {
      const request: CreatePipelineRequest = {
        projectId,
        type: IndexPipelineType.ANALYSIS,
        description: description || 'Project dependency analysis',
      };

      this.logger.debug(`[DEPENDENCY-ANALYSIS] Creating dependency analysis pipeline request`, {
        request: {
          projectId: request.projectId,
          type: request.type,
          description: request.description
        }
      });

      const job = await this.pipelineOrchestrator.createPipeline(request);

      this.logger.log(`[DEPENDENCY-ANALYSIS] Dependency analysis pipeline created successfully`, {
        pipelineId: job.id,
        status: job.status,
        projectId
      });

      return {
        success: true,
        data: {
          pipelineId: job.id,
          status: job.status,
        },
        message: 'Dependency analysis started successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[DEPENDENCY-ANALYSIS] Failed to start dependency analysis`, {
        projectId,
        description,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new BadRequestException(`Failed to start dependency analysis: ${errorMessage}`);
    }
  }

  // TODO: Implement pipeline listing
  // @Get('pipelines')
  // async listPipelines() { ... }
}