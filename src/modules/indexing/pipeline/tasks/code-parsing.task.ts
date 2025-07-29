import { Injectable } from '@nestjs/common';
import { BaseTask } from '../interfaces/base-task.interface';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
import { IndexPipelineType } from '../../entities/index-pipeline.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class CodeParsingTask extends BaseTask {
  readonly name = 'code_parsing';
  readonly description = 'Parse source code and extract symbols';
  readonly requiredSteps: string[] = ['gitSync'];
  readonly optionalSteps: string[] = [];

  shouldExecute(context: PipelineContext): boolean {
    return !!(context.data.gitSync?.filesChanged?.length);
  }

  async validate(context: PipelineContext): Promise<void> {
    await super.validate(context);
    
    if (!context.data.gitSync?.clonePath) {
      throw new Error('Git sync must complete before code parsing');
    }

    const clonePath = context.data.gitSync.clonePath;
    try {
      await fs.access(clonePath);
    } catch (error) {
      throw new Error(`Repository path not accessible: ${clonePath}`);
    }
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { pipeline, data, config, logger } = context;
    const clonePath = data.gitSync!.clonePath;
    
    // Determine which files to process based on pipeline type
    let filesToProcess: string[] = [];
    
    if (pipeline.type === IndexPipelineType.INCREMENTAL) {
      // For incremental, process only changed and added files (not deleted)
      filesToProcess = [
        ...data.gitSync!.filesAdded,
        ...data.gitSync!.filesChanged
      ];
      logger.info('Incremental parsing mode', {
        added: data.gitSync!.filesAdded.length,
        changed: data.gitSync!.filesChanged.length,
        deleted: data.gitSync!.filesDeleted.length,
      });
    } else {
      // For full sync, process all added files
      filesToProcess = data.gitSync!.filesAdded;
      logger.info('Full parsing mode', {
        totalFiles: filesToProcess.length
      });
    }
    
    let totalSymbolsExtracted = 0;
    let filesProcessed = 0;
    const parsingResults: any[] = [];
    const languages: Record<string, number> = {};
    
    try {
      logger.info('Starting code parsing', { 
        totalFiles: filesToProcess.length,
        languages: Object.keys(config.parsing.languages).filter(lang => 
          config.parsing.languages[lang].enabled
        )
      });

      // Group files by language
      const filesByLanguage = this.groupFilesByLanguage(filesToProcess);
      
      // Process each language
      for (const [language, languageFiles] of Object.entries(filesByLanguage)) {
        if (!config.parsing.languages[language]?.enabled) {
          continue;
        }

        logger.info(`Parsing ${language} files`, { count: languageFiles.length });
        
        const languageResult = await this.parseLanguageFiles(
          language,
          languageFiles,
          clonePath,
          config,
          context
        );
        
        totalSymbolsExtracted += languageResult.symbolsExtracted;
        filesProcessed += languageResult.filesProcessed;
        parsingResults.push(...languageResult.results);
        languages[language] = languageResult.filesProcessed;
      }

      logger.info('Code parsing completed', {
        filesProcessed,
        totalSymbolsExtracted,
        languages,
      });

      // Store results in context
      context.data.codeParsing = {
        symbolsExtracted: totalSymbolsExtracted,
        filesProcessed,
        parsingResults,
        languages,
      };

      // Update context metrics
      context.metrics.totalFilesProcessed += filesProcessed;
      context.metrics.totalSymbolsExtracted += totalSymbolsExtracted;

      return {
        success: true,
        duration: 0,
        data: context.data.codeParsing,
        metrics: {
          filesProcessed,
          symbolsExtracted: totalSymbolsExtracted,
        },
      };

    } catch (error) {
      logger.error('Code parsing failed', { error: error.message });
      
      return {
        success: false,
        duration: 0,
        error: `Code parsing failed: ${error.message}`,
      };
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    const files = context.data.gitSync?.filesChanged?.length || 0;
    return Math.max(60000, files * 100); // Minimum 1 minute, ~100ms per file
  }

  private groupFilesByLanguage(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const language = this.getLanguageFromExtension(ext);
      
      if (language) {
        if (!groups[language]) {
          groups[language] = [];
        }
        groups[language].push(file);
      }
    }
    
    return groups;
  }

  private getLanguageFromExtension(ext: string): string | null {
    const extensionMap: Record<string, string> = {
      '.js': 'typescript',
      '.jsx': 'typescript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.java': 'java',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c': 'cpp',
      '.h': 'cpp',
      '.hpp': 'cpp',
    };
    
    return extensionMap[ext] || null;
  }

  private async parseLanguageFiles(
    language: string,
    files: string[],
    repoPath: string,
    config: any,
    context: PipelineContext
  ): Promise<{
    symbolsExtracted: number;
    filesProcessed: number;
    results: any[];
  }> {
    const languageConfig = config.parsing.languages[language];
    
    if (config.docker.enabled && languageConfig.dockerImage) {
      return this.parseWithDocker(language, files, repoPath, languageConfig, context);
    } else {
      return this.parseWithLocalTools(language, files, repoPath, languageConfig, context);
    }
  }

  private async parseWithDocker(
    language: string,
    files: string[],
    repoPath: string,
    languageConfig: any,
    context: PipelineContext
  ): Promise<any> {
    const { config, tempDirectory, logger } = context;
    
    // Create file list for processing
    const fileListPath = path.join(tempDirectory, `${language}-files.txt`);
    await fs.writeFile(fileListPath, files.join('\n'));
    
    // Build Docker command
    const dockerCmd = [
      'docker run',
      '--rm',
      `--memory=${config.docker.memoryLimit}`,
      `--cpus=${config.docker.cpuLimit}`,
      `--network=${config.docker.networkMode}`,
      `-v "${repoPath}:/workspace:ro"`,
      `-v "${tempDirectory}:/output"`,
      languageConfig.dockerImage,
      '/workspace',
      `/output/${language}-results.json`,
      `/output/${language}-files.txt`
    ].join(' ');

    logger.debug('Running Docker parser', { command: dockerCmd });

    try {
      const { stdout, stderr } = await execAsync(dockerCmd, {
        timeout: config.docker.timeout,
      });

      logger.debug('Docker parser output', { stdout, stderr });

      // Read results
      const resultsPath = path.join(tempDirectory, `${language}-results.json`);
      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(resultsContent);

      return {
        symbolsExtracted: results.symbols?.length || 0,
        filesProcessed: results.files?.length || 0,
        results: results.symbols || [],
      };

    } catch (error) {
      logger.error(`Docker parsing failed for ${language}`, { error: error.message });
      throw error;
    }
  }

  private async parseWithLocalTools(
    language: string,
    files: string[],
    repoPath: string,
    languageConfig: any,
    context: PipelineContext
  ): Promise<any> {
    const { logger } = context;
    
    logger.warn(`Local parsing not implemented for ${language}, using mock results`);
    
    // Mock implementation - replace with actual local parsing tools
    await new Promise(resolve => setTimeout(resolve, 1000 * files.length * 0.1));
    
    return {
      symbolsExtracted: files.length * 5, // Mock: 5 symbols per file
      filesProcessed: files.length,
      results: files.map(file => ({
        file,
        symbols: Array.from({ length: 5 }, (_, i) => ({
          name: `symbol_${i}`,
          type: 'function',
          line: i + 1,
        })),
      })),
    };
  }

  async cleanup(context: PipelineContext): Promise<void> {
    // Clean up temporary parsing files
    const { tempDirectory } = context;
    
    try {
      const files = await fs.readdir(tempDirectory);
      const parsingFiles = files.filter(file => 
        file.endsWith('-files.txt') || file.endsWith('-results.json')
      );
      
      for (const file of parsingFiles) {
        await fs.rm(path.join(tempDirectory, file), { force: true });
      }
      
      context.logger.debug('Code parsing cleanup completed');
    } catch (error) {
      context.logger.warn('Code parsing cleanup failed', { error: error.message });
    }
  }
}