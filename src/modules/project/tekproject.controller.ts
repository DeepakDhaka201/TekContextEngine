import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  LoggerService
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TekProjectService } from './tekproject.service';
import { DocumentService } from './document.service';
import { CreateTekProjectDto, UpdateTekProjectDto } from './dto';
import { ApiResponse, PaginationOptions } from '@/common/types';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Controller('tekprojects')
export class TekProjectController {
  constructor(
    private readonly tekProjectService: TekProjectService,
    private readonly documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Create a new TekProject (organization/product level)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTekProject(@Body() createDto: CreateTekProjectDto): Promise<ApiResponse> {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [CREATE-TEKPROJECT] Starting TekProject creation request`, {
      name: createDto.name,
      description: createDto.description
    });

    this.logger.log(`Creating TekProject: ${createDto.name}`);

    try {
      this.logger.debug(`[${requestId}] [CREATE-TEKPROJECT] Calling TekProject service`);
      const tekProject = await this.tekProjectService.create(createDto);

      this.logger.debug(`[${requestId}] [CREATE-TEKPROJECT] TekProject created, creating default docs buckets`, {
        tekProjectId: tekProject.id,
        tekProjectName: tekProject.name
      });

      // Create default docs buckets
      await this.documentService.createDefaultBuckets(tekProject);

      this.logger.log(`[${requestId}] [CREATE-TEKPROJECT] TekProject creation completed successfully`, {
        tekProjectId: tekProject.id,
        tekProjectName: tekProject.name,
        slug: tekProject.slug
      });

      return {
        success: true,
        data: tekProject,
        message: 'TekProject created successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${requestId}] [CREATE-TEKPROJECT] TekProject creation failed`, {
        name: createDto.name,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * List all TekProjects with pagination
   */
  @Get()
  async listTekProjects(@Query() paginationDto: PaginationDto): Promise<ApiResponse> {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [LIST-TEKPROJECTS] Starting TekProjects list request`, {
      page: paginationDto.page,
      limit: paginationDto.limit,
      sortBy: paginationDto.sortBy,
      sortOrder: paginationDto.sortOrder
    });

    const options: PaginationOptions = {
      page: paginationDto.page || 1,
      perPage: paginationDto.limit || 20,
      sort: paginationDto.sortBy || 'createdAt',
      orderBy: paginationDto.sortOrder || 'desc',
    };

    try {
      const result = await this.tekProjectService.findAll(options);

      this.logger.log(`[${requestId}] [LIST-TEKPROJECTS] TekProjects list completed successfully`, {
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

      this.logger.error(`[${requestId}] [LIST-TEKPROJECTS] TekProjects list failed`, {
        page: paginationDto.page,
        limit: paginationDto.limit,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * Get TekProject by ID
   */
  @Get(':id')
  async getTekProject(@Param('id') id: string): Promise<ApiResponse> {
    const tekProject = await this.tekProjectService.findById(id);
    
    return {
      success: true,
      data: tekProject,
    };
  }

  /**
   * Update TekProject
   */
  @Put(':id')
  async updateTekProject(
    @Param('id') id: string,
    @Body() updateDto: UpdateTekProjectDto,
  ): Promise<ApiResponse> {
    const tekProject = await this.tekProjectService.update(id, updateDto);
    
    return {
      success: true,
      data: tekProject,
      message: 'TekProject updated successfully',
    };
  }

  /**
   * Delete TekProject (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTekProject(@Param('id') id: string): Promise<void> {
    await this.tekProjectService.delete(id);
    this.logger.log(`TekProject deleted: ${id}`);
  }


}