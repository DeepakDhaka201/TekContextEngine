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
  LoggerService,
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { ApiResponse, PaginationOptions } from '@/common/types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  CreateDocsBucketDto,
  UpdateDocsBucketDto,
  UploadDocumentDto
} from './dto';

@Controller('docsbuckets')
export class DocsBucketController {

  constructor(
    private readonly documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
  constructor(
    private readonly documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [UPLOAD-DOCUMENT] Starting document upload request`, {
      title: uploadDto.title,
      bucketId: uploadDto.bucketId,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype
    });

    this.logger.log(`Uploading document: ${uploadDto.title} to bucket: ${uploadDto.bucketId}`);

    try {
      this.logger.debug(`[${requestId}] [UPLOAD-DOCUMENT] Validating file upload`, {
        hasFile: !!file,
        fileName: file?.originalname,
        fileSize: file?.size,
        fileSizeMB: file?.size ? Math.round(file.size / (1024 * 1024) * 100) / 100 : 0
      });

      this.logger.debug(`[${requestId}] [UPLOAD-DOCUMENT] Calling document service`);
      const document = await this.documentService.uploadDocument(file, uploadDto);

      this.logger.log(`[${requestId}] [UPLOAD-DOCUMENT] Document upload completed successfully`, {
        documentId: document.id,
        documentTitle: document.title,
        bucketId: document.bucket.id,
        filePath: document.path,
        fileSize: document.size,
        status: document.status
      });

      return {
        success: true,
        data: document,
        message: 'Document uploaded successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${requestId}] [UPLOAD-DOCUMENT] Document upload failed`, {
        title: uploadDto.title,
        bucketId: uploadDto.bucketId,
        fileName: file?.originalname,
        fileSize: file?.size,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * List documents in a bucket
   */
  @Get()
  async listDocuments(
    @Query('bucketId') bucketId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse> {
    const requestId = Math.random().toString(36).substring(2, 8);

    this.logger.log(`[${requestId}] [LIST-DOCUMENTS] Starting documents list request`, {
      bucketId,
      page: paginationDto.page,
      limit: paginationDto.limit,
      sortBy: paginationDto.sortBy,
      sortOrder: paginationDto.sortOrder
    });

    if (!bucketId) {
      this.logger.error(`[${requestId}] [LIST-DOCUMENTS] Missing required bucketId parameter`);
      throw new BadRequestException('bucketId query parameter is required');
    }

    const options: PaginationOptions = {
      page: paginationDto.page || 1,
      perPage: paginationDto.limit || 20,
      sort: paginationDto.sortBy || 'createdAt',
      orderBy: paginationDto.sortOrder || 'desc',
    };

    try {
      const result = await this.documentService.findDocumentsByBucketId(bucketId, options);

      this.logger.log(`[${requestId}] [LIST-DOCUMENTS] Documents list completed successfully`, {
        bucketId,
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

      this.logger.error(`[${requestId}] [LIST-DOCUMENTS] Documents list failed`, {
        bucketId,
        page: paginationDto.page,
        limit: paginationDto.limit,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
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