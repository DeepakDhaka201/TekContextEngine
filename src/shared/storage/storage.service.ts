import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs';
  basePath: string;
  maxFileSize: number;
  allowedExtensions?: string[];
}

export interface StoredFile {
  id: string;
  originalName: string;
  path: string;
  size: number;
  hash: string;
  mimeType?: string;
  createdAt: Date;
}

@Injectable()
export class StorageService {
  private readonly config: StorageConfig;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.logger.debug('[STORAGE-SERVICE] Initializing storage service');

    this.config = {
      type: this.configService.get<'local' | 's3' | 'gcs'>('STORAGE_TYPE', 'local'),
      basePath: this.configService.get<string>('STORAGE_PATH', './storage'),
      maxFileSize: this.configService.get<number>('MAX_FILE_SIZE_MB', 100) * 1024 * 1024,
      allowedExtensions: [
        '.ts', '.js', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
        '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.sh', '.sql', '.html',
        '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml',
        '.md', '.txt', '.dockerfile', '.gitignore', '.env.example',
      ],
    };

    this.logger.log('[STORAGE-SERVICE] Storage configuration loaded', {
      type: this.config.type,
      basePath: this.config.basePath,
      maxFileSizeMB: Math.round(this.config.maxFileSize / (1024 * 1024)),
      allowedExtensionsCount: this.config.allowedExtensions?.length || 0
    });

    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    this.logger.debug('[STORAGE-SERVICE] Starting storage initialization', {
      storageType: this.config.type
    });

    if (this.config.type === 'local') {
      this.logger.debug('[STORAGE-SERVICE] Initializing local storage directories');
      try {
        const directories = [
          this.config.basePath,
          path.join(this.config.basePath, 'codebases'),
          path.join(this.config.basePath, 'temp'),
          path.join(this.config.basePath, 'cache')
        ];

        for (const dir of directories) {
          await fs.mkdir(dir, { recursive: true });
          this.logger.debug('[STORAGE-SERVICE] Created directory', { directory: dir });
        }

        this.logger.log('[STORAGE-SERVICE] Local storage initialized successfully', {
          basePath: this.config.basePath,
          directoriesCreated: directories.length
        });

        this.logger.log(`Local storage initialized at: ${this.config.basePath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.error('[STORAGE-SERVICE] Failed to initialize local storage', {
          error: errorMessage,
          basePath: this.config.basePath,
          stack: error instanceof Error ? error.stack : undefined
        });

        this.logger.error('Failed to initialize local storage:', error);
        throw error;
      }
    } else {
      this.logger.debug('[STORAGE-SERVICE] Non-local storage type, skipping directory initialization', {
        storageType: this.config.type
      });
    }
  }

  /**
   * Store file content
   */
  async storeFile(
    content: Buffer,
    originalName: string,
    codebaseId: string,
    filePath: string,
  ): Promise<StoredFile> {
    this.logger.debug('[STORAGE-SERVICE] Starting file storage operation', {
      originalName,
      codebaseId,
      filePath,
      contentSize: content.length,
      contentSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100
    });

    // Validate file size
    if (content.length > this.config.maxFileSize) {
      this.logger.error('[STORAGE-SERVICE] File size validation failed', {
        fileSize: content.length,
        maxFileSize: this.config.maxFileSize,
        fileSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100,
        maxFileSizeMB: Math.round(this.config.maxFileSize / (1024 * 1024))
      });
      throw new Error(`File size exceeds maximum allowed size: ${this.config.maxFileSize} bytes`);
    }

    // Validate file extension
    const extension = path.extname(originalName).toLowerCase();
    if (this.config.allowedExtensions && !this.config.allowedExtensions.includes(extension)) {
      this.logger.error('[STORAGE-SERVICE] File extension validation failed', {
        extension,
        originalName,
        allowedExtensions: this.config.allowedExtensions
      });
      throw new Error(`File extension not allowed: ${extension}`);
    }

    this.logger.debug('[STORAGE-SERVICE] File validation passed', {
      extension,
      contentSize: content.length
    });

    // Calculate hash
    this.logger.debug('[STORAGE-SERVICE] Calculating file hash');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Generate storage path
    this.logger.debug('[STORAGE-SERVICE] Generating storage path');
    const storagePath = this.generateStoragePath(codebaseId, filePath);
    const fullPath = path.join(this.config.basePath, storagePath);

    this.logger.debug('[STORAGE-SERVICE] Storage paths generated', {
      storagePath,
      fullPath,
      hash: hash.substring(0, 8)
    });

    try {
      // Ensure directory exists
      const parentDir = path.dirname(fullPath);
      this.logger.debug('[STORAGE-SERVICE] Ensuring parent directory exists', {
        parentDir
      });

      await fs.mkdir(parentDir, { recursive: true });

      // Write file
      this.logger.debug('[STORAGE-SERVICE] Writing file to storage');
      const writeStartTime = Date.now();
      await fs.writeFile(fullPath, content);
      const writeDuration = Date.now() - writeStartTime;

      const storedFile: StoredFile = {
        id: crypto.randomUUID(),
        originalName,
        path: storagePath,
        size: content.length,
        hash,
        createdAt: new Date(),
      };

      this.logger.log('[STORAGE-SERVICE] File stored successfully', {
        storedFileId: storedFile.id,
        originalName: storedFile.originalName,
        storagePath: storedFile.path,
        fileSize: storedFile.size,
        fileSizeMB: Math.round(storedFile.size / (1024 * 1024) * 100) / 100,
        hash: storedFile.hash.substring(0, 8),
        writeDurationMs: writeDuration,
        codebaseId
      });

      this.logger.debug(`File stored: ${storagePath} (${content.length} bytes)`);
      return storedFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[STORAGE-SERVICE] Failed to store file', {
        originalName,
        codebaseId,
        filePath,
        storagePath,
        fullPath,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Failed to store file ${originalName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve file content
   */
  async getFile(storagePath: string): Promise<Buffer> {
    this.logger.debug('[STORAGE-SERVICE] Retrieving file content', {
      storagePath
    });

    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      const readStartTime = Date.now();
      const content = await fs.readFile(fullPath);
      const readDuration = Date.now() - readStartTime;

      this.logger.debug('[STORAGE-SERVICE] File retrieved successfully', {
        storagePath,
        contentSize: content.length,
        contentSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100,
        readDurationMs: readDuration
      });

      this.logger.debug(`File retrieved: ${storagePath} (${content.length} bytes)`);
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[STORAGE-SERVICE] Failed to retrieve file', {
        storagePath,
        fullPath,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Failed to retrieve file ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    this.logger.debug('[STORAGE-SERVICE] Checking if file exists', {
      storagePath
    });

    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      await fs.access(fullPath);

      this.logger.debug('[STORAGE-SERVICE] File exists', {
        storagePath,
        exists: true
      });

      return true;
    } catch {
      this.logger.debug('[STORAGE-SERVICE] File does not exist', {
        storagePath,
        exists: false
      });

      return false;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      await fs.unlink(fullPath);
      this.logger.debug(`File deleted: ${storagePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete all files for a codebase
   */
  async deleteCodebaseFiles(codebaseId: string): Promise<void> {
    const codebasePath = path.join(this.config.basePath, 'codebases', codebaseId);

    try {
      await fs.rm(codebasePath, { recursive: true, force: true });
      this.logger.log(`Deleted all files for codebase: ${codebaseId}`);
    } catch (error) {
      this.logger.error(`Failed to delete codebase files ${codebaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(storagePath: string): Promise<{ size: number; mtime: Date }> {
    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      this.logger.error(`Failed to get file stats ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Store temporary file
   */
  async storeTempFile(content: Buffer, filename: string): Promise<string> {
    const tempPath = path.join('temp', `${Date.now()}-${filename}`);
    const fullPath = path.join(this.config.basePath, tempPath);

    try {
      await fs.writeFile(fullPath, content);
      this.logger.debug(`Temporary file stored: ${tempPath}`);
      return tempPath;
    } catch (error) {
      this.logger.error(`Failed to store temporary file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Clean up temporary files older than specified age
   */
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<void> {
    const tempDir = path.join(this.config.basePath, 'temp');
    const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < maxAge) {
          await fs.unlink(filePath);
          this.logger.debug(`Cleaned up temporary file: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup temporary files:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    codebaseCount: number;
  }> {
    try {
      const codebasesDir = path.join(this.config.basePath, 'codebases');
      let totalSize = 0;
      let fileCount = 0;
      let codebaseCount = 0;

      const codebases = await fs.readdir(codebasesDir);
      codebaseCount = codebases.length;

      for (const codebase of codebases) {
        const codebasePath = path.join(codebasesDir, codebase);
        const stats = await this.getDirectoryStats(codebasePath);
        totalSize += stats.size;
        fileCount += stats.fileCount;
      }

      return { totalSize, fileCount, codebaseCount };
    } catch (error) {
      this.logger.error('Failed to get storage stats:', error);
      return { totalSize: 0, fileCount: 0, codebaseCount: 0 };
    }
  }

  /**
   * Generate storage path for a file
   */
  private generateStoragePath(codebaseId: string, filePath: string): string {
    // Sanitize file path
    const sanitizedPath = filePath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
    return path.join('codebases', codebaseId, sanitizedPath);
  }

  /**
   * Get directory statistics recursively
   */
  private async getDirectoryStats(dirPath: string): Promise<{ size: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          const subStats = await this.getDirectoryStats(itemPath);
          totalSize += subStats.size;
          fileCount += subStats.fileCount;
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return { size: totalSize, fileCount };
  }

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }
}
