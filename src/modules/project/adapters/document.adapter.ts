import { DocsBucket, Document, DocsBucketType, BucketStatus, DocumentType, TekProject } from '@/entities';

export interface CreateDocsBucketData {
  projectId: string;
  name: string;
  type: string;
  description?: string;
}

export interface UpdateDocsBucketData {
  name?: string;
  description?: string;
  status?: string;
}

export interface UploadDocumentData {
  bucketId: string;
  title: string;
  description?: string;
  type: string;
  tags?: string[];
}

export class DocumentAdapter {
  /**
   * Create default docs buckets for TekProject
   */
  static createDefaultDocsBuckets(tekProject: TekProject, storagePath: string = './storage'): DocsBucket[] {
    const bucketConfigs = [
      {
        name: 'API Documentation',
        type: DocsBucketType.API_DOCS,
      },
      {
        name: 'User Flows',
        type: DocsBucketType.USER_FLOWS,
      },
      {
        name: 'Security Guidelines',
        type: DocsBucketType.SECURITY_GUIDELINES,
      },
    ];

    return bucketConfigs.map(config => {
      const bucket = new DocsBucket();
      bucket.project = tekProject;
      bucket.name = config.name;
      bucket.type = config.type;
      bucket.storagePath = `${storagePath}/docs/${tekProject.id}/${config.type}`;
      bucket.metadata = {
        createdBy: 'system',
        defaultBucket: true,
        processingConfig: {
          chunkSize: 2000,
          chunkOverlap: 400,
          fileExtensions: ['.md', '.txt', '.pdf', '.docx'],
        },
      };
      return bucket;
    });
  }

  /**
   * Create custom docs bucket from data
   */
  static fromCreateBucketData(data: CreateDocsBucketData, tekProject: TekProject, storagePath: string = './storage'): DocsBucket {
    const bucket = new DocsBucket();
    bucket.project = tekProject;
    bucket.name = data.name;
    bucket.type = data.type as DocsBucketType;
    bucket.storagePath = `${storagePath}/docs/${tekProject.id}/${data.type}`;
    bucket.metadata = {
      description: data.description,
      createdBy: 'user',
      processingConfig: {
        chunkSize: 2000,
        chunkOverlap: 400,
        fileExtensions: ['.md', '.txt', '.pdf', '.docx'],
      },
    };
    return bucket;
  }

  /**
   * Update docs bucket from data
   */
  static fromUpdateBucketData(existingBucket: DocsBucket, data: UpdateDocsBucketData): DocsBucket {
    const updatedBucket = { ...existingBucket };
    
    if (data.name) {
      updatedBucket.name = data.name;
    }
    
    if (data.status) {
      updatedBucket.status = data.status as BucketStatus;
    }
    
    if (data.description) {
      updatedBucket.metadata = {
        ...updatedBucket.metadata,
        description: data.description,
      };
    }
    
    updatedBucket.updatedAt = new Date();
    return updatedBucket;
  }

  /**
   * Create document from file upload data
   */
  static fromUploadData(
    file: any,
    uploadData: UploadDocumentData,
    bucket: DocsBucket,
    filePath: string,
    fileHash: string
  ): Document {
    const document = new Document();
    document.bucket = bucket;
    document.title = uploadData.title;
    document.type = this.mapDocumentType(uploadData.type);
    document.path = filePath;
    document.size = file.size;
    document.hash = fileHash;
    document.metadata = {
      description: uploadData.description,
      tags: uploadData.tags || [],
      uploadedBy: 'user', // TODO: Add actual user context
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      processed: false,
    };
    return document;
  }

  /**
   * Map string document type to enum
   */
  private static mapDocumentType(type: string): DocumentType {
    switch (type.toLowerCase()) {
      case 'markdown':
        return DocumentType.MARKDOWN;
      case 'pdf':
        return DocumentType.PDF;
      case 'html':
        return DocumentType.HTML;
      case 'text':
        return DocumentType.TEXT;
      case 'documentation':
      case 'specification':
      case 'guide':
        return DocumentType.OTHER; // Map new types to OTHER for now
      default:
        return DocumentType.OTHER;
    }
  }
}