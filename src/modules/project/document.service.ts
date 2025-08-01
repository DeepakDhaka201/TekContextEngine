import { Injectable, Inject, LoggerService, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { DocsBucket, Document, BucketStatus, TekProject } from '@/entities';
import { PaginatedResult, PaginationOptions } from '@/common/types';
import {
  DocumentAdapter,
  CreateDocsBucketData,
  UpdateDocsBucketData,
  UploadDocumentData
} from './adapters';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class DocumentService {
  private readonly storagePath: string;

  constructor(
    @InjectRepository(DocsBucket)
    private docsBucketRepository: Repository<DocsBucket>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(TekProject)
    private tekProjectRepository: Repository<TekProject>,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH', './storage');
  }

  // ==================== DocsBucket Methods ====================

  /**
   * Create default docs buckets for TekProject
   */
  async createDefaultBuckets(tekProject: TekProject): Promise<DocsBucket[]> {
    this.logger.debug('[DOCUMENT-SERVICE] Creating default docs buckets for project', {
      projectId: tekProject.id,
      projectName: tekProject.name,
      storagePath: this.storagePath
    });

    const buckets = DocumentAdapter.createDefaultDocsBuckets(tekProject, this.storagePath);

    this.logger.debug('[DOCUMENT-SERVICE] Default buckets created by adapter', {
      projectId: tekProject.id,
      bucketCount: buckets.length,
      bucketNames: buckets.map(b => b.name)
    });

    const savedBuckets = await this.docsBucketRepository.save(buckets);

    this.logger.log('[DOCUMENT-SERVICE] Default docs buckets created successfully', {
      projectId: tekProject.id,
      projectName: tekProject.name,
      bucketCount: savedBuckets.length,
      bucketIds: savedBuckets.map(b => b.id)
    });

    return savedBuckets;
  }

  /**
   * Create a custom docs bucket
   */
  async createBucket(createData: CreateDocsBucketData): Promise<DocsBucket> {
    this.logger.log('[DOCUMENT-SERVICE] Creating custom docs bucket', {
      bucketName: createData.name,
      projectId: createData.projectId,
      description: createData.description
    });

    this.logger.log(`Creating docs bucket: ${createData.name} for project: ${createData.projectId}`);

    this.logger.debug('[DOCUMENT-SERVICE] Finding project for bucket creation');
    const tekProject = await this.findTekProjectById(createData.projectId);
    this.logger.debug('[DOCUMENT-SERVICE] Creating bucket entity from adapter');
    const bucket = DocumentAdapter.fromCreateBucketData(createData, tekProject, this.storagePath);

    this.logger.debug('[DOCUMENT-SERVICE] Saving bucket to database', {
      bucketName: bucket.name,
      bucketStoragePath: bucket.storagePath,
      projectId: bucket.project.id
    });

    const savedBucket = await this.docsBucketRepository.save(bucket);

    this.logger.log('[DOCUMENT-SERVICE] Custom docs bucket created successfully', {
      bucketId: savedBucket.id,
      bucketName: savedBucket.name,
      projectId: savedBucket.project.id
    });

    return savedBucket;
  }

  /**
   * List docs buckets for a project
   */
  async findBucketsByProjectId(projectId: string): Promise<DocsBucket[]> {
    this.logger.debug('[DOCUMENT-SERVICE] Finding docs buckets for project', {
      projectId
    });

    const buckets = await this.docsBucketRepository.find({
      where: { project: { id: projectId }, status: BucketStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });

    this.logger.debug('[DOCUMENT-SERVICE] Found docs buckets for project', {
      projectId,
      bucketCount: buckets.length,
      bucketIds: buckets.map(b => b.id)
    });

    return buckets;
  }

  /**
   * Get docs bucket by ID
   */
  async findBucketById(id: string): Promise<DocsBucket> {
    this.logger.debug('[DOCUMENT-SERVICE] Finding docs bucket by ID', {
      bucketId: id
    });

    const bucket = await this.docsBucketRepository.findOne({
      where: { id },
      relations: ['project', 'documents'],
    });

    if (!bucket) {
      this.logger.error('[DOCUMENT-SERVICE] Docs bucket not found', {
        bucketId: id
      });
      throw new NotFoundException(`Docs bucket ${id} not found`);
    }

    this.logger.debug('[DOCUMENT-SERVICE] Docs bucket found successfully', {
      bucketId: bucket.id,
      bucketName: bucket.name,
      projectId: bucket.project.id,
      documentCount: bucket.documents?.length || 0
    });

    return bucket;
  }

  /**
   * Update docs bucket
   */
  async updateBucket(id: string, updateData: UpdateDocsBucketData): Promise<DocsBucket> {
    this.logger.log('[DOCUMENT-SERVICE] Updating docs bucket', {
      bucketId: id,
      updateFields: Object.keys(updateData)
    });

    const existingBucket = await this.findBucketById(id);

    this.logger.debug('[DOCUMENT-SERVICE] Creating updated bucket entity from adapter');
    const updatedBucket = DocumentAdapter.fromUpdateBucketData(existingBucket, updateData);

    const savedBucket = await this.docsBucketRepository.save(updatedBucket);

    this.logger.log('[DOCUMENT-SERVICE] Docs bucket updated successfully', {
      bucketId: savedBucket.id,
      bucketName: savedBucket.name
    });

    return savedBucket;
  }

  /**
   * Delete docs bucket (soft delete)
   */
  async deleteBucket(id: string): Promise<void> {
    this.logger.log('[DOCUMENT-SERVICE] Deleting (archiving) docs bucket', {
      bucketId: id
    });

    const bucket = await this.findBucketById(id);

    this.logger.debug('[DOCUMENT-SERVICE] Updating bucket status to archived', {
      bucketId: bucket.id,
      bucketName: bucket.name,
      previousStatus: bucket.status
    });

    bucket.status = BucketStatus.ARCHIVED;
    bucket.updatedAt = new Date();

    await this.docsBucketRepository.save(bucket);

    this.logger.log('[DOCUMENT-SERVICE] Docs bucket archived successfully', {
      bucketId: id,
      bucketName: bucket.name
    });

    this.logger.log(`Docs bucket archived: ${id}`);
  }

  // ==================== Document Methods ====================

  /**
   * Upload document to a bucket
   */
  async uploadDocument(file: any, uploadData: UploadDocumentData): Promise<Document> {
    this.logger.log(`Uploading document: ${uploadData.title} to bucket: ${uploadData.bucketId}`);

    const bucket = await this.findBucketById(uploadData.bucketId);

    // Save file to storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(bucket.storagePath, fileName);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    // Generate file hash
    const fileHash = this.generateFileHash(file.buffer);

    // Create document entity using adapter
    const document = DocumentAdapter.fromUploadData(file, uploadData, bucket, filePath, fileHash);

    return await this.documentRepository.save(document);
  }

  /**
   * List documents in a bucket with pagination
   */
  async findDocumentsByBucketId(
    bucketId: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;
    
    const [documents, total] = await this.documentRepository.findAndCount({
      where: { bucket: { id: bucketId } },
      relations: ['bucket'],
      order: { [sort]: orderBy.toUpperCase() as 'ASC' | 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return {
      data: documents,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasNext: page * perPage < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get document by ID
   */
  async findDocumentById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['bucket', 'bucket.project'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    const document = await this.findDocumentById(id);
    
    // Delete file from storage
    try {
      await fs.unlink(document.path);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${document.path}`, error);
    }

    // Delete document entity
    await this.documentRepository.remove(document);
    this.logger.log(`Document deleted: ${id}`);
  }

  // ==================== Helper Methods ====================

  /**
   * Helper method to find TekProject by ID
   */
  private async findTekProjectById(id: string): Promise<TekProject> {
    const tekProject = await this.tekProjectRepository.findOne({
      where: { id },
    });

    if (!tekProject) {
      throw new NotFoundException(`TekProject ${id} not found`);
    }

    return tekProject;
  }

  /**
   * Generate SHA-256 hash for file content
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}