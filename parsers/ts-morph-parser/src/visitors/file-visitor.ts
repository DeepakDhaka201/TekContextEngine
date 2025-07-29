import { SourceFile } from 'ts-morph';
import { ParseResult, FileNode } from '../models/parse-result';
import { ParserOptions } from '../parser';
import * as crypto from 'crypto';
import * as path from 'path';

export class FileVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
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
      
      const fileNode: FileNode = {
        path: absolutePath,
        fileName,
        checksum,
        lineCount,
        extension,
        isTest,
        framework
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
}