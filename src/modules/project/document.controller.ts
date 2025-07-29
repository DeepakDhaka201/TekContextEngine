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
  Logger,
  UploadedFile,
  UseInterceptors 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { ApiResponse, PaginationOptions } from '@/common/types';
import { 
  CreateDocsBucketDto, 
  UpdateDocsBucketDto, 
  UploadDocumentDto 
} from './dto';

@Controller('docsbuckets')
export class DocsBucketController {
  private readonly logger = new Logger(DocsBucketController.name);

  constructor(
    private readonly documentService: DocumentService,
  ) {}

  /**
   * Create a new docs bucket
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDocsBucket(@Body() createDto: CreateDocsBucketDto): Promise<ApiResponse> {
    this.logger.log(`Creating docs bucket: ${createDto.name} for project: ${createDto.projectId}`);
    
    const bucket = await this.documentService.createBucket(createDto);
    
    return {
      success: true,
      data: bucket,
      message: 'Docs bucket created successfully',
    };
  }

  /**
   * List docs buckets with optional project filter
   */
  @Get()
  async listDocsBuckets(@Query('projectId') projectId?: string): Promise<ApiResponse> {
    if (!projectId) {
      throw new Error('projectId query parameter is required');
    }

    const buckets = await this.documentService.findBucketsByProjectId(projectId);
    return {
      success: true,
      data: buckets,
    };
  }

  /**
   * Get docs bucket by ID
   */
  @Get(':id')
  async getDocsBucket(@Param('id') id: string): Promise<ApiResponse> {
    const bucket = await this.documentService.findBucketById(id);
    
    return {
      success: true,
      data: bucket,
    };
  }

  /**
   * Update docs bucket
   */
  @Put(':id')
  async updateDocsBucket(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocsBucketDto,
  ): Promise<ApiResponse> {
    const bucket = await this.documentService.updateBucket(id, updateDto);
    
    return {
      success: true,
      data: bucket,
      message: 'Docs bucket updated successfully',
    };
  }

  /**
   * Delete docs bucket
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocsBucket(@Param('id') id: string): Promise<void> {
    await this.documentService.deleteBucket(id);
    this.logger.log(`Docs bucket deleted: ${id}`);
  }
}

@Controller('documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(
    private readonly documentService: DocumentService,
  ) {}

  /**
   * Upload document to a docs bucket
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<ApiResponse> {
    this.logger.log(`Uploading document: ${uploadDto.title} to bucket: ${uploadDto.bucketId}`);
    
    const document = await this.documentService.uploadDocument(file, uploadDto);
    
    return {
      success: true,
      data: document,
      message: 'Document uploaded successfully',
    };
  }

  /**
   * List documents in a bucket
   */
  @Get()
  async listDocuments(
    @Query('bucketId') bucketId?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ): Promise<ApiResponse> {
    if (!bucketId) {
      throw new Error('bucketId query parameter is required');
    }

    const options: PaginationOptions = {
      page: page || 1,
      perPage: perPage || 20,
    };

    const result = await this.documentService.findDocumentsByBucketId(bucketId, options);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get document by ID
   */
  @Get(':id')
  async getDocument(@Param('id') id: string): Promise<ApiResponse> {
    const document = await this.documentService.findDocumentById(id);
    
    return {
      success: true,
      data: document,
    };
  }

  /**
   * Delete document
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('id') id: string): Promise<void> {
    await this.documentService.deleteDocument(id);
    this.logger.log(`Document deleted: ${id}`);
  }
}