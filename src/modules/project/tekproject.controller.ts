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
  Logger 
} from '@nestjs/common';
import { TekProjectService } from './tekproject.service';
import { DocumentService } from './document.service';
import { CreateTekProjectDto, UpdateTekProjectDto } from './dto';
import { ApiResponse, PaginationOptions } from '@/common/types';

@Controller('tekprojects')
export class TekProjectController {
  private readonly logger = new Logger(TekProjectController.name);

  constructor(
    private readonly tekProjectService: TekProjectService,
    private readonly documentService: DocumentService,
  ) {}

  /**
   * Create a new TekProject (organization/product level)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTekProject(@Body() createDto: CreateTekProjectDto): Promise<ApiResponse> {
    this.logger.log(`Creating TekProject: ${createDto.name}`);
    
    const tekProject = await this.tekProjectService.create(createDto);
    
    // Create default docs buckets
    await this.documentService.createDefaultBuckets(tekProject);
    
    return {
      success: true,
      data: tekProject,
      message: 'TekProject created successfully',
    };
  }

  /**
   * List all TekProjects with pagination
   */
  @Get()
  async listTekProjects(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('sort') sort?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ): Promise<ApiResponse> {
    const options: PaginationOptions = {
      page: page || 1,
      perPage: perPage || 20,
      sort: sort || 'createdAt',
      orderBy: orderBy || 'desc',
    };

    const result = await this.tekProjectService.findAll(options);
    
    return {
      success: true,
      data: result,
    };
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