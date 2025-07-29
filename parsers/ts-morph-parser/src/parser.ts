import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { ParseResult, FileNode } from './models/parse-result';
import { FrameworkDetector, Framework } from './frameworks/framework-detector';
import { FileVisitor } from './visitors/file-visitor';
import { ClassVisitor } from './visitors/class-visitor';
import { InterfaceVisitor } from './visitors/interface-visitor';
import { MethodVisitor } from './visitors/method-visitor';
import { DependencyVisitor } from './visitors/dependency-visitor';
import { RelationshipVisitor } from './visitors/relationship-visitor';
import { FrameworkAnalyzer } from './analyzers/framework-analyzer';
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
        target: SyntaxKind.ES2020,
        module: SyntaxKind.CommonJS,
        declaration: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    });

    this.frameworkDetector = new FrameworkDetector();
  }

  async parseProject(projectPath: string): Promise<ParseResult> {
    const startTime = Date.now();
    
    console.log('🔍 Analyzing TypeScript project...');
    
    // Detect framework if not specified
    if (!this.options.framework || this.options.framework === 'unknown') {
      this.options.framework = await this.frameworkDetector.detectFramework(projectPath);
    }

    // Initialize result
    const result: ParseResult = {
      files: [],
      classes: [],
      interfaces: [],
      methods: [],
      dependencies: [],
      relationships: [],
      apiEndpoints: [],
      components: [],
      services: [],
      modules: [],
      metadata: {
        framework: this.options.framework,
        version: '1.0.0',
        parseTime: new Date().toISOString(),
        statistics: {
          totalFiles: 0,
          totalLines: 0,
          complexity: 0
        }
      }
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
    const fileVisitor = new FileVisitor(result, this.options);
    const classVisitor = new ClassVisitor(result, this.options);
    const interfaceVisitor = new InterfaceVisitor(result, this.options);
    const methodVisitor = new MethodVisitor(result, this.options);
    const dependencyVisitor = new DependencyVisitor(result, projectPath);
    const relationshipVisitor = new RelationshipVisitor(result);

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
        
        // Visit methods
        methodVisitor.visitSourceFile(sourceFile);
        
        // Build relationships
        relationshipVisitor.visitSourceFile(sourceFile);
        
      } catch (error) {
        console.error(`❌ Error processing ${sourceFile.getFilePath()}:`, error);
      }
    }

    // Extract dependencies
    await dependencyVisitor.extractDependencies();

    // Framework-specific analysis
    const frameworkAnalyzer = new FrameworkAnalyzer(this.options.framework!);
    await frameworkAnalyzer.analyze(result, sourceFiles, projectPath);

    // Update metadata
    result.metadata.statistics.totalFiles = result.files.length;
    result.metadata.statistics.totalLines = result.files.reduce((sum, file) => sum + file.lineCount, 0);
    result.metadata.statistics.complexity = result.methods.reduce((sum, method) => sum + method.cyclomaticComplexity, 0);

    const endTime = Date.now();
    console.log(`⏱ Parsing completed in ${endTime - startTime}ms`);

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