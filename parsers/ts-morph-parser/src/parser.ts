import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { ParseResult, FileNode } from './models/parse-result';
import { FrameworkDetector, Framework } from './frameworks/framework-detector';
import { FileVisitor } from './visitors/file-visitor';
import { ClassVisitor } from './visitors/class-visitor';
import { InterfaceVisitor } from './visitors/interface-visitor';
import { EnumVisitor } from './visitors/enum-visitor';
import { MethodVisitor } from './visitors/method-visitor';
import { DependencyVisitor } from './visitors/dependency-visitor';
import { RelationshipVisitor } from './visitors/relationship-visitor';

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface ParserOptions {
  framework?: Framework;
  verbose?: boolean;
  includeNodeModules?: boolean;
  maxFileSizeKb?: number;
  skipTests?: boolean;
}

export class TypeScriptParser {
  private project: Project;
  private options: ParserOptions;
  private frameworkDetector: FrameworkDetector;

  constructor(options: ParserOptions = {}) {
    this.options = {
      framework: 'unknown',
      verbose: false,
      includeNodeModules: false,
      maxFileSizeKb: 500,
      skipTests: false,
      ...options
    };

    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 7, // ES2020
        module: 1, // CommonJS
        declaration: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    });

    this.frameworkDetector = new FrameworkDetector();
  }

  async parseProject(projectPath: string, codebaseName?: string): Promise<ParseResult> {
    const startTime = Date.now();

    console.log('🔍 Analyzing TypeScript project...');

    // Use project name as codebase name if not provided
    const actualCodebaseName = codebaseName || path.basename(projectPath);

    // Detect framework if not specified
    if (!this.options.framework || this.options.framework === 'unknown') {
      this.options.framework = await this.frameworkDetector.detectFramework(projectPath);
    }

    // Initialize result with new structure
    const result: ParseResult = {
      metadata: {
        codebaseName: actualCodebaseName,
        version: '1.0.0',
        parserVersion: '2.0.0',
        parseTime: new Date().toISOString(),
        parsingDurationMs: 0, // Will be set at the end
        framework: this.options.framework,
        detectedFrameworks: [this.options.framework],
        statistics: {
          totalFiles: 0,
          totalLines: 0,
          totalClasses: 0,
          totalInterfaces: 0,
          totalMethods: 0,
          totalFields: 0,
          complexity: 0,
          testCoverage: 0,
          duplicateLines: 0,
          averageMethodComplexity: 0,
          maxMethodComplexity: 0,
          linesOfCode: 0,
          commentLines: 0,
          blankLines: 0
        },
        configuration: {},
        errors: null,
        warnings: null
      },
      codebaseName: actualCodebaseName,
      files: [],
      classes: [],
      interfaces: [],
      enums: [],
      methods: [],
      fields: [],
      dependencies: [],
      relationships: [],
      apiEndpoints: [],
      lambdaExpressions: [],
      methodReferences: [],
      testCases: [],
      documents: []
    };

    // Find TypeScript files
    const tsFiles = await this.findTypeScriptFiles(projectPath);
    console.log(`📁 Found ${tsFiles.length} TypeScript files`);

    // Add files to project
    for (const filePath of tsFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(projectPath, filePath);
        this.project.createSourceFile(relativePath, content, { overwrite: true });
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠ Could not read file: ${filePath}`);
        }
      }
    }

    // Get all source files
    const sourceFiles = this.project.getSourceFiles();
    console.log(`📝 Processing ${sourceFiles.length} source files...`);

    // Create visitors
    const fileVisitor = new FileVisitor(result, this.options, actualCodebaseName);
    const classVisitor = new ClassVisitor(result, this.options, actualCodebaseName);
    const interfaceVisitor = new InterfaceVisitor(result, this.options, actualCodebaseName);
    const enumVisitor = new EnumVisitor(result, this.options, actualCodebaseName);
    const methodVisitor = new MethodVisitor(result, this.options, actualCodebaseName);
    const dependencyVisitor = new DependencyVisitor(result, projectPath);
    const relationshipVisitor = new RelationshipVisitor(result, this.options);

    // Process files
    for (const sourceFile of sourceFiles) {
      if (this.options.verbose) {
        console.log(`   Processing: ${sourceFile.getFilePath()}`);
      }

      try {
        // Visit file
        fileVisitor.visitSourceFile(sourceFile, projectPath);

        // Visit classes
        classVisitor.visitSourceFile(sourceFile);

        // Visit interfaces
        interfaceVisitor.visitSourceFile(sourceFile);

        // Visit enums
        enumVisitor.visitSourceFile(sourceFile);

        // Visit methods
        methodVisitor.visitSourceFile(sourceFile);

        // Build relationships
        relationshipVisitor.buildRelationships();
        
      } catch (error) {
        console.error(`❌ Error processing ${sourceFile.getFilePath()}:`, error);
      }
    }

    // Extract dependencies
    await dependencyVisitor.extractDependencies();

    // Framework-specific analysis is now handled within individual visitors

    // Update metadata statistics
    const endTime = Date.now();
    result.metadata.parsingDurationMs = endTime - startTime;
    result.metadata.statistics.totalFiles = result.files.length;
    result.metadata.statistics.totalClasses = result.classes.length;
    result.metadata.statistics.totalInterfaces = result.interfaces.length;
    result.metadata.statistics.totalMethods = result.methods.length;
    result.metadata.statistics.totalFields = result.fields.length;

    // Calculate complexity metrics
    const methodComplexities = result.methods.map(m => m.cyclomaticComplexity);
    result.metadata.statistics.complexity = methodComplexities.reduce((sum, c) => sum + c, 0);
    result.metadata.statistics.averageMethodComplexity = methodComplexities.length > 0
      ? result.metadata.statistics.complexity / methodComplexities.length : 0;
    result.metadata.statistics.maxMethodComplexity = methodComplexities.length > 0
      ? Math.max(...methodComplexities) : 0;

    // Calculate line counts (simplified for now)
    result.metadata.statistics.totalLines = result.files.reduce((sum, file) => {
      // For now, use a simple heuristic since we don't have detailed line analysis
      return sum + (file.sourceCode?.split('\n').length || 0);
    }, 0);
    result.metadata.statistics.linesOfCode = Math.floor(result.metadata.statistics.totalLines * 0.7); // Estimate
    result.metadata.statistics.commentLines = Math.floor(result.metadata.statistics.totalLines * 0.2); // Estimate
    result.metadata.statistics.blankLines = result.metadata.statistics.totalLines -
      result.metadata.statistics.linesOfCode - result.metadata.statistics.commentLines;

    console.log(`⏱ Parsing completed in ${endTime - startTime}ms`);
    console.log(`📊 Statistics: ${result.classes.length} classes, ${result.interfaces.length} interfaces, ${result.methods.length} methods`);

    return result;
  }

  private async findTypeScriptFiles(projectPath: string): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];

    const ignorePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
      '**/*.min.js'
    ];

    if (this.options.skipTests) {
      ignorePatterns.push(
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/__tests__/**',
        '**/test/**',
        '**/tests/**'
      );
    }

    if (!this.options.includeNodeModules) {
      ignorePatterns.push('node_modules/**');
    }

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: projectPath,
          absolute: true,
          ignore: ignorePatterns
        });
        allFiles.push(...files);
      } catch (error) {
        console.warn(`⚠ Error finding files with pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and filter by file size
    const uniqueFiles = [...new Set(allFiles)];
    const filteredFiles: string[] = [];

    for (const file of uniqueFiles) {
      try {
        const stats = await fs.stat(file);
        const sizeKb = stats.size / 1024;
        
        if (sizeKb <= this.options.maxFileSizeKb!) {
          filteredFiles.push(file);
        } else if (this.options.verbose) {
          console.warn(`⚠ Skipping large file (${sizeKb.toFixed(1)}KB): ${file}`);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠ Could not stat file: ${file}`);
        }
      }
    }

    return filteredFiles.sort();
  }
}