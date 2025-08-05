import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DockerParserOptions {
  dockerImage: string;
  sourcePath: string;
  outputPath: string;
  options?: string[];
  timeout?: number;
}

export interface ParserResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

@Injectable()
export class DockerParserService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Execute a Docker-based parser
   */
  async executeParser(options: DockerParserOptions): Promise<ParserResult> {
    const startTime = Date.now();
    const { dockerImage, sourcePath, outputPath, options: dockerOptions = [], timeout = 600000 } = options;

    // Use a unique container name so we can copy files out before removal
    const containerName = `java-parser-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    this.logger.debug(`[DOCKER-PARSER] Starting parser execution`, {
      dockerImage,
      sourcePath,
      outputPath,
      options: dockerOptions
    });

    try {
      // Ensure output directory exists with proper permissions
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Set proper permissions for Docker container to write
      try {
        await fs.chmod(outputDir, 0o777);
        this.logger.debug(`[DOCKER-PARSER] Set permissions 777 on output directory: ${outputDir}`);
      } catch (chmodError) {
        this.logger.warn(`[DOCKER-PARSER] Could not set permissions on output directory: ${chmodError}`);
      }

      // Create a temporary output file with proper permissions
      const tempOutputFile = path.join(outputDir, `temp-${Date.now()}.json`);
      try {
        await fs.writeFile(tempOutputFile, '{}');
        await fs.chmod(tempOutputFile, 0o666);
        await fs.unlink(tempOutputFile);
        this.logger.debug(`[DOCKER-PARSER] Verified write permissions in output directory`);
      } catch (permError) {
        this.logger.warn(`[DOCKER-PARSER] Could not verify write permissions: ${permError}`);
      }

      // Convert paths to absolute paths for Docker volume mounting
      const absoluteSourcePath = path.resolve(sourcePath);
      const absoluteOutputDir = path.resolve(outputDir);

      this.logger.debug(`[DOCKER-PARSER] Resolved paths for Docker volumes`, {
        sourcePath,
        absoluteSourcePath,
        outputDir,
        absoluteOutputDir
      });

      // Build Docker command
      // For Java parser, dockerOptions contains JVM options that should be passed via JAVA_OPTS environment variable
      const containerOutputPath = `/tmp/parser-output.json`;

      const dockerArgs = [
        'run',
        '--name', containerName,
        '-v', `${absoluteSourcePath}:/workspace:ro`,
      ];

      // Add JVM options as environment variable for Java parsers
      if (dockerOptions && dockerOptions.length > 0) {
        const javaOpts = dockerOptions.join(' ');
        dockerArgs.push('-e', `JAVA_OPTS=${javaOpts}`);

        this.logger.debug(`[DOCKER-PARSER] Setting JAVA_OPTS environment variable`, {
          javaOpts
        });
      }

      // Add the Docker image
      dockerArgs.push(dockerImage);

      // Add application arguments (codebase name, input directory, output file)
      // Generate a codebase name from the source path
      const codebaseName = path.basename(sourcePath) || 'codebase';
      dockerArgs.push(
        codebaseName,
        '/workspace',
        containerOutputPath
      );

      this.logger.debug(`[DOCKER-PARSER] Executing Docker command`, {
        command: 'docker',
        args: dockerArgs
      });

      // Execute Docker container (without --rm so we can copy files out)
      const result = await this.executeDockerCommand(dockerArgs, timeout);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          duration: Date.now() - startTime
        };
      }

        // Copy the output file from the container to the host
        this.logger.debug(`[DOCKER-PARSER] Copying output file from container`, {
          containerName,
          containerOutputPath,
          outputPath
        });

        const copyResult = await this.copyFileFromContainer(containerName, containerOutputPath, outputPath);

        if (!copyResult.success) {
          return {
            success: false,
            error: `Failed to copy output file from container: ${copyResult.error}`,
            duration: Date.now() - startTime
          };
        }

        // Read and parse output file
        const output = await this.readParserOutput(outputPath);

        this.logger.log(`[DOCKER-PARSER] Parser execution completed successfully`, {
          dockerImage,
          duration: Date.now() - startTime,
          outputSize: JSON.stringify(output).length
        });

        return {
          success: true,
          output,
          duration: Date.now() - startTime
        };

      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`[DOCKER-PARSER] Parser execution failed`, {
        dockerImage,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up the container
      try {
        await this.removeContainer(containerName);
      } catch (cleanupError) {
        this.logger.warn(`[DOCKER-PARSER] Failed to clean up container ${containerName}`, {
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
      }
    }
  }

  /**
   * Execute Docker command with timeout
   */
  private executeDockerCommand(args: string[], timeout: number): Promise<{ success: boolean; error?: string; stdout?: string; stderr?: string }> {
    return new Promise((resolve) => {
      const process = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let isResolved = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          process.kill('SIGKILL');
          resolve({
            success: false,
            error: `Docker execution timed out after ${timeout}ms`,
            stdout,
            stderr
          });
        }
      }, timeout);

      // Collect output
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      process.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);

          if (code === 0) {
            resolve({
              success: true,
              stdout,
              stderr
            });
          } else {
            resolve({
              success: false,
              error: `Docker process exited with code ${code}. stderr: ${stderr}`,
              stdout,
              stderr
            });
          }
        }
      });

      // Handle process errors
      process.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: `Failed to start Docker process: ${error.message}`,
            stdout,
            stderr
          });
        }
      });
    });
  }

  /**
   * Read and parse parser output file
   */
  private async readParserOutput(outputPath: string): Promise<any> {
    try {
      // Check if output file exists
      await fs.access(outputPath);
      
      // Read file content
      const content = await fs.readFile(outputPath, 'utf-8');
      
      // Parse JSON
      const parsed = JSON.parse(content);

      // Debug: Log the actual parser output structure
      this.logger.log(`[DOCKER-PARSER] Raw parser output structure:`, {
        topLevelKeys: Object.keys(parsed),
        hasFiles: !!parsed.files,
        filesIsArray: Array.isArray(parsed.files),
        filesCount: parsed.files?.length || 0,
        sampleFile: parsed.files?.[0] ? {
          path: parsed.files[0].path,
          topLevelKeys: Object.keys(parsed.files[0]),
          hasClasses: !!parsed.files[0].classes,
          classesCount: parsed.files[0].classes?.length || 0,
          hasSymbols: !!parsed.files[0].symbols,
          symbolsCount: parsed.files[0].symbols?.length || 0
        } : 'No files'
      });

      // Clean up output file
      await fs.unlink(outputPath).catch(() => {
        // Ignore cleanup errors
      });

      return parsed;
      
    } catch (error) {
      throw new Error(`Failed to read parser output from ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if Docker is available
   */
  async checkDockerAvailability(): Promise<boolean> {
    try {
      const result = await this.executeDockerCommand(['--version'], 5000);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Pull Docker image if not available locally
   */
  async ensureDockerImage(imageName: string): Promise<boolean> {
    try {
      this.logger.debug(`[DOCKER-PARSER] Checking Docker image availability: ${imageName}`);

      // First try: Check if image exists locally using 'docker image inspect'
      const inspectResult = await this.executeDockerCommand(['image', 'inspect', imageName], 10000);

      this.logger.debug(`[DOCKER-PARSER] Image inspect result for ${imageName}:`, {
        success: inspectResult.success,
        error: inspectResult.error
      });

      if (inspectResult.success) {
        this.logger.log(`[DOCKER-PARSER] Docker image found locally: ${imageName}`);
        return true;
      }

      // Second try: Check using 'docker images' command as fallback
      this.logger.debug(`[DOCKER-PARSER] Trying fallback method to check local images`);
      const imagesResult = await this.executeDockerCommand(['images', '--format', 'table {{.Repository}}:{{.Tag}}'], 10000);

      if (imagesResult.success) {
        // Parse the output to check if our image is listed
        const isLocallyAvailable = await this.checkImageInLocalList(imageName);

        if (isLocallyAvailable) {
          this.logger.log(`[DOCKER-PARSER] Docker image found locally via fallback method: ${imageName}`);
          return true;
        }
      }

      // If image is not available locally, try to pull it
      this.logger.log(`[DOCKER-PARSER] Image not found locally, attempting to pull: ${imageName}`);
      const pullResult = await this.executeDockerCommand(['pull', imageName], 300000); // 5 minutes timeout for pull

      if (pullResult.success) {
        this.logger.log(`[DOCKER-PARSER] Successfully pulled Docker image: ${imageName}`);
        return true;
      } else {
        this.logger.error(`[DOCKER-PARSER] Failed to pull Docker image: ${imageName}`, {
          error: pullResult.error
        });

        // Final fallback: Try to use the image anyway (it might exist but inspect failed)
        this.logger.debug(`[DOCKER-PARSER] Attempting final fallback check for: ${imageName}`);
        const finalCheck = await this.testImageUsability(imageName);

        if (finalCheck) {
          this.logger.log(`[DOCKER-PARSER] Image is usable despite previous failures: ${imageName}`);
          return true;
        }

        return false;
      }

    } catch (error) {
      this.logger.error(`[DOCKER-PARSER] Error checking/pulling Docker image: ${imageName}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Check if image exists in local Docker images list
   */
  private async checkImageInLocalList(imageName: string): Promise<boolean> {
    try {
      const result = await this.executeDockerCommand(['images', '--format', '{{.Repository}}:{{.Tag}}'], 10000);

      if (!result.success || !result.stdout) {
        this.logger.debug(`[DOCKER-PARSER] Failed to get local images list`, {
          success: result.success,
          error: result.error
        });
        return false;
      }

      // Parse the stdout to check if our image is listed
      const imageLines = result.stdout.trim().split('\n');
      const isFound = imageLines.some(line => line.trim() === imageName);

      this.logger.debug(`[DOCKER-PARSER] Local images check for ${imageName}:`, {
        found: isFound,
        totalImages: imageLines.length,
        searchedImage: imageName
      });

      return isFound;

    } catch (error) {
      this.logger.debug(`[DOCKER-PARSER] Error checking local image list:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Test if an image is usable by trying to run a simple command
   */
  private async testImageUsability(imageName: string): Promise<boolean> {
    try {
      this.logger.debug(`[DOCKER-PARSER] Testing image usability: ${imageName}`);

      // Try to run a simple command to test if the image exists and is usable
      const testResult = await this.executeDockerCommand([
        'run', '--rm', '--entrypoint', 'echo', imageName, 'test'
      ], 30000);

      if (testResult.success) {
        this.logger.debug(`[DOCKER-PARSER] Image usability test passed: ${imageName}`);
        return true;
      } else {
        this.logger.debug(`[DOCKER-PARSER] Image usability test failed: ${imageName}`, {
          error: testResult.error
        });
        return false;
      }

    } catch (error) {
      this.logger.debug(`[DOCKER-PARSER] Error testing image usability:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Copy a file from a Docker container to the host
   */
  private async copyFileFromContainer(containerName: string, containerPath: string, hostPath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const process = spawn('docker', ['cp', `${containerName}:${containerPath}`, hostPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Docker cp failed with exit code ${code}. stderr: ${stderr}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to execute docker cp: ${error.message}`
        });
      });
    });
  }

  /**
   * Remove a Docker container
   */
  private async removeContainer(containerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('docker', ['rm', '-f', containerName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to remove container ${containerName}, exit code: ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute docker rm: ${error.message}`));
      });
    });
  }
}
