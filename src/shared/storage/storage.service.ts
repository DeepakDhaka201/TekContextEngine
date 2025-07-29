import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private readonly logger = new Logger(StorageService.name);
  private readonly config: StorageConfig;

  constructor(private configService: ConfigService) {
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

    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    if (this.config.type === 'local') {
      try {
        await fs.mkdir(this.config.basePath, { recursive: true });
        await fs.mkdir(path.join(this.config.basePath, 'codebases'), { recursive: true });
        await fs.mkdir(path.join(this.config.basePath, 'temp'), { recursive: true });
        await fs.mkdir(path.join(this.config.basePath, 'cache'), { recursive: true });
        
        this.logger.log(`Local storage initialized at: ${this.config.basePath}`);
      } catch (error) {
        this.logger.error('Failed to initialize local storage:', error);
        throw error;
      }
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
    // Validate file size
    if (content.length > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size: ${this.config.maxFileSize} bytes`);
    }

    // Validate file extension
    const extension = path.extname(originalName).toLowerCase();
    if (this.config.allowedExtensions && !this.config.allowedExtensions.includes(extension)) {
      throw new Error(`File extension not allowed: ${extension}`);
    }

    // Calculate hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Generate storage path
    const storagePath = this.generateStoragePath(codebaseId, filePath);
    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content);

      const storedFile: StoredFile = {
        id: crypto.randomUUID(),
        originalName,
        path: storagePath,
        size: content.length,
        hash,
        createdAt: new Date(),
      };

      this.logger.debug(`File stored: ${storagePath} (${content.length} bytes)`);
      return storedFile;
    } catch (error) {
      this.logger.error(`Failed to store file ${originalName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve file content
   */
  async getFile(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      const content = await fs.readFile(fullPath);
      this.logger.debug(`File retrieved: ${storagePath} (${content.length} bytes)`);
      return content;
    } catch (error) {
      this.logger.error(`Failed to retrieve file ${storagePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.config.basePath, storagePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
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
