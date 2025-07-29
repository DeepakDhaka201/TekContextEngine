import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(DocsBucket)
    private docsBucketRepository: Repository<DocsBucket>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(TekProject)
    private tekProjectRepository: Repository<TekProject>,
  ) {}

  // ==================== DocsBucket Methods ====================

  /**
   * Create default docs buckets for TekProject
   */
  async createDefaultBuckets(tekProject: TekProject): Promise<DocsBucket[]> {
    const buckets = DocumentAdapter.createDefaultDocsBuckets(tekProject);
    return await this.docsBucketRepository.save(buckets);
  }

  /**
   * Create a custom docs bucket
   */
  async createBucket(createData: CreateDocsBucketData): Promise<DocsBucket> {
    this.logger.log(`Creating docs bucket: ${createData.name} for project: ${createData.projectId}`);

    const tekProject = await this.findTekProjectById(createData.projectId);
    const bucket = DocumentAdapter.fromCreateBucketData(createData, tekProject);

    return await this.docsBucketRepository.save(bucket);
  }

  /**
   * List docs buckets for a project
   */
  async findBucketsByProjectId(projectId: string): Promise<DocsBucket[]> {
    return await this.docsBucketRepository.find({
      where: { project: { id: projectId }, status: BucketStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get docs bucket by ID
   */
  async findBucketById(id: string): Promise<DocsBucket> {
    const bucket = await this.docsBucketRepository.findOne({
      where: { id },
      relations: ['project', 'documents'],
    });

    if (!bucket) {
      throw new NotFoundException(`Docs bucket ${id} not found`);
    }

    return bucket;
  }

  /**
   * Update docs bucket
   */
  async updateBucket(id: string, updateData: UpdateDocsBucketData): Promise<DocsBucket> {
    const existingBucket = await this.findBucketById(id);
    const updatedBucket = DocumentAdapter.fromUpdateBucketData(existingBucket, updateData);

    return await this.docsBucketRepository.save(updatedBucket);
  }

  /**
   * Delete docs bucket (soft delete)
   */
  async deleteBucket(id: string): Promise<void> {
    const bucket = await this.findBucketById(id);
    bucket.status = BucketStatus.ARCHIVED;
    bucket.updatedAt = new Date();
    await this.docsBucketRepository.save(bucket);
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