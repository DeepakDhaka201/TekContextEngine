import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  Query,
  HttpCode, 
  HttpStatus,
  Logger 
} from '@nestjs/common';
import { CodebaseService } from './codebase.service';
import { PipelineOrchestratorService } from '../indexing/pipeline/services/pipeline-orchestrator.service';
import { IndexPipelineType } from '../indexing/entities/index-pipeline.entity';
import { CreateCodebaseDto } from './dto';
import { ApiResponse } from '@/common/types';

@Controller('codebases')
export class CodebaseController {
  private readonly logger = new Logger(CodebaseController.name);

  constructor(
    private readonly codebaseService: CodebaseService,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
  ) {}

  /**
   * Create a new codebase
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCodebase(@Body() createDto: CreateCodebaseDto): Promise<ApiResponse> {
    this.logger.log(`Creating codebase: ${createDto.name} for TekProject: ${createDto.projectId}`);
    
    const codebase = await this.codebaseService.create(createDto);
    
    return {
      success: true,
      data: codebase,
      message: 'Codebase created successfully',
    };
  }

  /**
   * List codebases with optional project filter
   */
  @Get()
  async listCodebases(@Query('projectId') projectId?: string): Promise<ApiResponse> {
    if (!projectId) {
      throw new Error('projectId query parameter is required');
    }

    const codebases = await this.codebaseService.findByProjectId(projectId);
    return {
      success: true,
      data: codebases,
    };
  }

  /**
   * Get codebase by ID
   */
  @Get(':id')
  async getCodebase(@Param('id') id: string): Promise<ApiResponse> {
    const codebase = await this.codebaseService.findById(id);
    
    return {
      success: true,
      data: codebase,
    };
  }

  /**
   * Start indexing pipeline for a specific codebase
   */
  @Post(':id/index')
  @HttpCode(HttpStatus.ACCEPTED)
  async startIndexingJob(
    @Param('id') codebaseId: string,
    @Body() options: {
      type?: 'full' | 'incremental';
      baseCommit?: string;
      targetCommit?: string;
      customConfiguration?: any;
    } = {},
  ): Promise<ApiResponse> {
    this.logger.log(`Starting indexing job for codebase: ${codebaseId}`);
    
    // Get codebase information
    const { codebase } = await this.codebaseService.findForIndexing(codebaseId);
    
    // Create pipeline
    const job = await this.pipelineOrchestrator.createPipeline({
      projectId: codebase.project.id,
      codebaseId: codebase.id,
      type: this.mapPipelineType(options.type) || IndexPipelineType.INCREMENTAL,
      baseCommit: options.baseCommit,
      targetCommit: options.targetCommit,
      priority: 1,
      customConfiguration: options.customConfiguration,
    });
    
    return {
      success: true,
      data: {
        jobId: job.id,
        type: job.type,
        status: job.status,
      },
      message: 'Indexing job started successfully',
    };
  }

  /**
   * Get pipeline status and history for a specific codebase
   */
  @Get(':id/index/status')
  async getCodebaseIndexStatus(@Param('id') codebaseId: string): Promise<ApiResponse> {
    const codebase = await this.codebaseService.findById(codebaseId);
    const { activePipelines, recentPipelines, summary } = await this.pipelineOrchestrator.getPipelinesForCodebase(codebaseId);
    
    const indexStatus = {
      codebase: {
        id: codebase.id,
        name: codebase.name,
        status: codebase.status,
        lastIndexAt: codebase.lastSyncAt,
        lastIndexCommit: codebase.lastSyncCommit,
      },
      activeJobs: activePipelines.map(pipeline => ({
        id: pipeline.id,
        type: pipeline.type,
        status: pipeline.status,
        progress: pipeline.progress,
        currentStep: pipeline.currentStep,
        startedAt: pipeline.startedAt,
        description: pipeline.description,
      })),
      recentJobs: recentPipelines.map(pipeline => ({
        id: pipeline.id,
        type: pipeline.type,
        status: pipeline.status,
        progress: pipeline.progress,
        startedAt: pipeline.startedAt,
        completedAt: pipeline.completedAt,
        duration: pipeline.completedAt && pipeline.startedAt 
          ? pipeline.completedAt.getTime() - pipeline.startedAt.getTime()
          : null,
        description: pipeline.description,
        error: pipeline.error,
      })),
      summary: {
        activeJobCount: summary.activeCount,
        recentJobCount: summary.recentCount,
        hasRunningJob: summary.hasRunning,
      },
    };
    
    return {
      success: true,
      data: indexStatus,
    };
  }

  /**
   * Map string pipeline type to enum
   */
  private mapPipelineType(pipelineType?: string): IndexPipelineType | undefined {
    switch (pipelineType) {
      case 'full':
        return IndexPipelineType.FULL;
      case 'incremental':
        return IndexPipelineType.INCREMENTAL;
      default:
        return undefined;
    }
  }
}