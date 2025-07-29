import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Param, 
  Body, 
  Query,
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PipelineOrchestratorService, CreatePipelineRequest } from './pipeline/services/pipeline-orchestrator.service';
import { IndexPipelineType } from './entities/index-pipeline.entity';

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
  ) {}

  @Post('pipelines')
  @ApiOperation({ summary: 'Create and start a new indexing pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Project or codebase not found' })
  async createPipeline(@Body() dto: CreatePipelineDto) {
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

      const job = await this.pipelineOrchestrator.createPipeline(request);
      
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
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('pipelines/:id')
  @ApiOperation({ summary: 'Get pipeline status and progress' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getPipelineStatus(@Param('id') pipelineId: string) {
    try {
      const job = await this.pipelineOrchestrator.getPipelineStatus(pipelineId);
      
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
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete('pipelines/:id')
  @ApiOperation({ summary: 'Cancel a running pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Pipeline cannot be cancelled' })
  async cancelPipeline(@Param('id') pipelineId: string) {
    try {
      await this.pipelineOrchestrator.cancelPipeline(pipelineId);
      
      return {
        success: true,
        message: 'Pipeline cancelled successfully',
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
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
    const request: CreatePipelineRequest = {
      projectId: '', // Will be resolved from codebase
      codebaseId,
      type: IndexPipelineType.FULL,
      description: description || 'Full codebase indexing',
    };
    
    const job = await this.pipelineOrchestrator.createPipeline(request);
    
    return {
      success: true,
      data: {
        pipelineId: job.id,
        status: job.status,
      },
      message: 'Full indexing started successfully',
    };
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
    const request: CreatePipelineRequest = {
      projectId: '', // Will be resolved from codebase
      codebaseId,
      type: IndexPipelineType.INCREMENTAL,
      baseCommit,
      targetCommit,
      description: 'Incremental codebase update',
    };

    const job = await this.pipelineOrchestrator.createPipeline(request);
    
    return {
      success: true,
      data: {
        pipelineId: job.id,
        status: job.status,
      },
      message: 'Incremental update started successfully',
    };
  }

  @Post('projects/:id/dependency-analysis')
  @ApiOperation({ summary: 'Start dependency analysis for project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Dependency analysis started' })
  async startDependencyAnalysis(
    @Param('id') projectId: string,
    @Query('description') description?: string
  ) {
    const request: CreatePipelineRequest = {
      projectId,
      type: IndexPipelineType.ANALYSIS,
      description: description || 'Project dependency analysis',
    };

    const job = await this.pipelineOrchestrator.createPipeline(request);
    
    return {
      success: true,
      data: {
        pipelineId: job.id,
        status: job.status,
      },
      message: 'Dependency analysis started successfully',
    };
  }

  // TODO: Implement pipeline listing
  // @Get('pipelines')
  // async listPipelines() { ... }
}