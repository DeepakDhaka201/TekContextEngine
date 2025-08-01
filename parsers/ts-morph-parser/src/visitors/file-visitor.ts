import { SourceFile } from 'ts-morph';
import { ParseResult, FileNode } from '../models/parse-result';
import { ParserOptions } from '../parser';
import * as crypto from 'crypto';
import * as path from 'path';

export class FileVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions,
    private codebaseName: string
  ) {}

  visitSourceFile(sourceFile: SourceFile, projectPath: string): void {
    try {
      const filePath = sourceFile.getFilePath();
      const absolutePath = path.resolve(projectPath, filePath);
      const content = sourceFile.getFullText();
      
      // Create checksum
      const checksum = crypto.createHash('md5').update(content).digest('hex');
      
      // Count lines
      const lineCount = content.split('\n').length;
      
      // Determine file characteristics
      const fileName = path.basename(filePath);
      const extension = path.extname(fileName);
      const isTest = this.isTestFile(filePath);
      const framework = this.detectFrameworkFromFile(filePath, content);
      
      // Extract package name from file path
      const packageName = this.extractPackageName(filePath);

      const fileNode: FileNode = {
        path: filePath, // Use relative path
        fileName,
        packageName,
        fileExtension: extension,
        fileSize: content.length,
        checksum,
        lastModified: Date.now(), // Current timestamp as we don't have file stats
        isTestFile: isTest,
        sourceCode: content
      };
      
      this.result.files.push(fileNode);
      
      if (this.options.verbose) {
        console.log(`   📄 File: ${fileName} (${lineCount} lines, ${extension})`);
      }
      
    } catch (error) {
      console.error(`Error processing file ${sourceFile.getFilePath()}:`, error);
    }
  }

  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /__tests__\//,
      /\/test\//,
      /\/tests\//
    ];
    
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  private detectFrameworkFromFile(filePath: string, content: string): string | undefined {
    // React detection
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      return 'react';
    }
    
    // Vue detection
    if (filePath.endsWith('.vue')) {
      return 'vue';
    }
    
    // Svelte detection
    if (filePath.endsWith('.svelte')) {
      return 'svelte';
    }
    
    // Angular detection
    if (content.includes('@Component') || content.includes('@Injectable') || content.includes('@NgModule')) {
      return 'angular';
    }
    
    // NestJS detection
    if (content.includes('@Controller') || content.includes('@Injectable') || content.includes('@Module')) {
      return 'nestjs';
    }
    
    // Next.js API routes
    if (filePath.includes('/api/') && filePath.includes('/pages/')) {
      return 'nextjs';
    }
    
    // Express/Node.js detection
    if (content.includes('express') || content.includes('app.listen') || content.includes('router.')) {
      return 'express';
    }
    
    return undefined;
  }

  private extractPackageName(filePath: string): string {
    // Convert file path to package-like structure
    const packagePath = filePath
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/\.(ts|tsx|js|jsx)$/, '') // Remove file extension
      .replace(/\//g, '.') // Replace slashes with dots
      .replace(/index$/, '') // Remove index from end
      .replace(/\.$/, ''); // Remove trailing dot

    // Get directory path only (remove filename)
    const parts = packagePath.split('.');
    if (parts.length > 1) {
      parts.pop(); // Remove the last part (filename)
      return parts.join('.');
    }

    return packagePath || 'default';
  }
}