import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  LoggerService
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CodebaseService } from './codebase.service';
import { CreateCodebaseDto } from './dto';
import { ApiResponse, PaginationOptions } from '@/common/types';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Controller('codebases')
export class CodebaseController {
  constructor(
    private readonly codebaseService: CodebaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Create a new codebase
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCodebase(@Body() createDto: CreateCodebaseDto): Promise<ApiResponse> {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [CREATE-CODEBASE] Starting codebase creation request`, {
      name: createDto.name,
      projectId: createDto.projectId,
      gitlabUrl: createDto.gitlabUrl,
      branch: createDto.branch
    });

    this.logger.log(`Creating codebase: ${createDto.name} for TekProject: ${createDto.projectId}`);

    try {
      this.logger.debug(`[${requestId}] [CREATE-CODEBASE] Calling codebase service`);
      const codebase = await this.codebaseService.create(createDto);

      this.logger.log(`[${requestId}] [CREATE-CODEBASE] Codebase creation completed successfully`, {
        codebaseId: codebase.id,
        codebaseName: codebase.name,
        projectId: codebase.project.id,
        gitlabUrl: codebase.gitlabUrl,
        branch: codebase.branch,
        status: codebase.status
      });

      return {
        success: true,
        data: codebase,
        message: 'Codebase created successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${requestId}] [CREATE-CODEBASE] Codebase creation failed`, {
        name: createDto.name,
        projectId: createDto.projectId,
        gitlabUrl: createDto.gitlabUrl,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * List codebases with optional project filter
   */
  @Get()
  async listCodebases(
    @Query('projectId') projectId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse> {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [LIST-CODEBASES] Starting codebases list request`, {
      projectId,
      page: paginationDto.page,
      limit: paginationDto.limit,
      sortBy: paginationDto.sortBy,
      sortOrder: paginationDto.sortOrder
    });

    if (!projectId) {
      this.logger.error(`[${requestId}] [LIST-CODEBASES] Missing required projectId parameter`);
      throw new Error('projectId query parameter is required');
    }

    const options: PaginationOptions = {
      page: paginationDto.page || 1,
      perPage: paginationDto.limit || 20,
      sort: paginationDto.sortBy || 'createdAt',
      orderBy: paginationDto.sortOrder || 'desc',
    };

    try {
      const result = await this.codebaseService.findByProjectId(projectId, options);

      this.logger.log(`[${requestId}] [LIST-CODEBASES] Codebases list completed successfully`, {
        projectId,
        totalResults: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${requestId}] [LIST-CODEBASES] Codebases list failed`, {
        projectId,
        page: paginationDto.page,
        limit: paginationDto.limit,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
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




}