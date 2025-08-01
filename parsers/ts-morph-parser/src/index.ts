#!/usr/bin/env node

import { Command } from 'commander';
import { TypeScriptParser } from './parser';
import { FrameworkDetector } from './frameworks/framework-detector';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('ts-morph-parser')
  .description('TypeScript parser for Neo4j knowledge graph')
  .version('1.0.0');

program
  .arguments('<input-directory> <output-file>')
  .option('-f, --framework <framework>', 'Force specific framework detection (auto, react, angular, vue, nestjs, express)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--include-node-modules', 'Include node_modules in analysis')
  .option('--max-file-size <size>', 'Maximum file size to process in KB', '500')
  .action(async (inputDir: string, outputFile: string, options: any) => {
    try {
      console.log('🚀 Starting TypeScript parser...');
      console.log(`📁 Input directory: ${inputDir}`);
      console.log(`📄 Output file: ${outputFile}`);
      
      // Detect framework
      const frameworkDetector = new FrameworkDetector();
      const detectedFramework = options.framework === 'auto' || !options.framework 
        ? await frameworkDetector.detectFramework(inputDir)
        : options.framework;
      
      console.log(`🔍 Framework: ${detectedFramework}`);
      
      // Parse TypeScript project
      const parser = new TypeScriptParser({
        framework: detectedFramework,
        verbose: options.verbose,
        includeNodeModules: options.includeNodeModules,
        maxFileSizeKb: parseInt(options.maxFileSize),
      });
      
      const result = await parser.parseProject(inputDir, path.basename(inputDir));
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      
      // Write result to file
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      
      console.log('✅ Parsing completed successfully!');
      console.log(`📊 Statistics:`);
      console.log(`   - Files: ${result.files.length}`);
      console.log(`   - Classes: ${result.classes.length}`);
      console.log(`   - Interfaces: ${result.interfaces.length}`);
      console.log(`   - Enums: ${result.enums.length}`);
      console.log(`   - Methods: ${result.methods.length}`);
      console.log(`   - Fields: ${result.fields.length}`);
      console.log(`   - Dependencies: ${result.dependencies.length}`);
      console.log(`   - API Endpoints: ${result.apiEndpoints.length}`);
      console.log(`   - Relationships: ${result.relationships.length}`);
      console.log(`   - Framework: ${result.metadata.framework}`);
      
    } catch (error) {
      console.error('❌ Error parsing TypeScript project:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);