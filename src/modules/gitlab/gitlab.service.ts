import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gitlab } from '@gitbeaker/rest';
import { GitLabRepository, GitLabFile, FileInfo } from '@/common/types';

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name);
  private readonly gitlab: InstanceType<typeof Gitlab>;

  constructor(private configService: ConfigService) {
    const gitlabUrl = this.configService.get<string>('GITLAB_URL', 'https://gitlab.com');
    const gitlabToken = this.configService.get<string>('GITLAB_TOKEN');

    if (!gitlabToken) {
      throw new Error('GITLAB_TOKEN is required');
    }

    this.gitlab = new Gitlab({
      host: gitlabUrl,
      token: gitlabToken,
    });

    this.logger.log(`GitLab service initialized with URL: ${gitlabUrl}`);
  }

  /**
   * Extract project ID from GitLab URL
   * Supports various GitLab URL formats:
   * - https://gitlab.com/group/project
   * - https://gitlab.com/group/subgroup/project
   * - https://gitlab.example.com/namespace/project
   */
  extractProjectIdFromUrl(gitlabUrl: string): string {
    try {
      const url = new URL(gitlabUrl);
      let pathParts = url.pathname.split('/').filter(Boolean);
      
      // Remove trailing .git if present
      if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
        pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');
      }
      
      // Remove common GitLab paths that aren't part of the project path
      const ignoredPrefixes = ['-', 'tree', 'blob', 'commits', 'merge_requests', 'issues'];
      const treeIndex = pathParts.findIndex(part => ignoredPrefixes.includes(part));
      if (treeIndex > 0) {
        pathParts = pathParts.slice(0, treeIndex);
      }
      
      if (pathParts.length < 2) {
        throw new Error('Invalid GitLab URL format - must contain at least namespace/project');
      }

      // Join all parts as GitLab supports nested groups
      const projectPath = pathParts.join('/');
      return encodeURIComponent(projectPath);
    } catch (error) {
      this.logger.error(`Failed to extract project ID from URL: ${gitlabUrl}`, error);
      throw new BadRequestException(`Invalid GitLab URL format: ${gitlabUrl}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(projectId: string | number): Promise<GitLabRepository> {
    try {
      const project = await this.gitlab.Projects.show(projectId);
      return project as GitLabRepository;
    } catch (error) {
      this.logger.error(`Failed to get repository info for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to access GitLab project: ${projectId}`);
    }
  }

  /**
   * List repository files
   */
  async listFiles(
    projectId: string | number,
    options: {
      ref?: string;
      path?: string;
      recursive?: boolean;
    } = {}
  ): Promise<GitLabFile[]> {
    try {
      const files = await this.gitlab.Repositories.allRepositoryTrees(projectId, {
        ref: options.ref || 'main',
        path: options.path || '',
        recursive: options.recursive || false,
      });

      return files as GitLabFile[];
    } catch (error) {
      this.logger.error(`Failed to list files for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to list files for project: ${projectId}`);
    }
  }

  /**
   * Get file content
   */
  async getFileContent(
    projectId: string | number,
    filePath: string,
    ref: string = 'main'
  ): Promise<FileInfo> {
    try {
      const file = await this.gitlab.RepositoryFiles.show(projectId, filePath, ref);
      // Map GitLab API response to our FileInfo interface
      return {
        id: file.file_path || filePath,
        name: file.file_name || filePath.split('/').pop() || '',
        path: file.file_path || filePath,
        size: file.size || 0,
        encoding: file.encoding || 'base64',
        content_sha256: file.content_sha256 || '',
        ref: file.ref || ref,
        blob_id: file.blob_id || '',
        commit_id: file.commit_id || '',
        last_commit_id: file.last_commit_id || '',
        content: file.content,
      } as FileInfo;
    } catch (error) {
      this.logger.error(`Failed to get file content for ${filePath} in project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get file content: ${filePath}`);
    }
  }

  /**
   * Get commits for a project
   */
  async getCommits(
    projectId: string | number,
    options: {
      ref?: string;
      since?: string;
      until?: string;
      path?: string;
      all?: boolean;
    } = {}
  ): Promise<any[]> {
    try {
      const commits = await this.gitlab.Commits.all(projectId, options);
      return commits;
    } catch (error) {
      this.logger.error(`Failed to get commits for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get commits for project: ${projectId}`);
    }
  }

  /**
   * Get branches for a project
   */
  async getBranches(projectId: string | number): Promise<any[]> {
    try {
      const branches = await this.gitlab.Branches.all(projectId);
      return branches;
    } catch (error) {
      this.logger.error(`Failed to get branches for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get branches for project: ${projectId}`);
    }
  }

  /**
   * Test connection to GitLab
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.gitlab.Users.showCurrentUser();
      return true;
    } catch (error) {
      this.logger.error('GitLab connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    try {
      return await this.gitlab.Users.showCurrentUser();
    } catch (error) {
      this.logger.error('Failed to get current user:', error);
      throw new BadRequestException('Unable to authenticate with GitLab');
    }
  }

  /**
   * Get comparison between two commits (for incremental sync)
   */
  async getCommitDiff(
    projectId: string | number,
    fromCommit: string,
    toCommit: string
  ): Promise<any> {
    try {
      const comparison = await this.gitlab.Repositories.compare(projectId, fromCommit, toCommit);
      return comparison;
    } catch (error) {
      this.logger.error(`Failed to get commit diff for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get commit comparison: ${fromCommit}...${toCommit}`);
    }
  }

  /**
   * Create project webhook for automatic sync
   */
  async createWebhook(
    projectId: string | number,
    webhookUrl: string,
    secretToken?: string
  ): Promise<any> {
    try {
      const webhook = await this.gitlab.ProjectHooks.add(projectId, webhookUrl, {
        pushEvents: true,
        mergeRequestsEvents: true,
        issuesEvents: false,
        confidentialIssuesEvents: false,
        tagPushEvents: true,
        noteEvents: false,
        jobEvents: false,
        pipelineEvents: false,
        wikiPageEvents: false,
        deploymentEvents: false,
        releasesEvents: false,
        subgroupEvents: false,
        enableSslVerification: true,
        token: secretToken,
      });
      
      this.logger.log(`Webhook created for project ${projectId}: ${webhook.id}`);
      return webhook;
    } catch (error) {
      this.logger.error(`Failed to create webhook for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to create webhook for project: ${projectId}`);
    }
  }

  /**
   * List project webhooks
   */
  async listWebhooks(projectId: string | number): Promise<any[]> {
    try {
      const webhooks = await this.gitlab.ProjectHooks.all(projectId);
      return webhooks;
    } catch (error) {
      this.logger.error(`Failed to list webhooks for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to list webhooks for project: ${projectId}`);
    }
  }

  /**
   * Delete project webhook
   */
  async deleteWebhook(projectId: string | number, webhookId: number): Promise<void> {
    try {
      await this.gitlab.ProjectHooks.remove(projectId, webhookId);
      this.logger.log(`Webhook ${webhookId} deleted for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to delete webhook ${webhookId} for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to delete webhook: ${webhookId}`);
    }
  }

  /**
   * Get repository archive (for initial clone)
   * Note: Archive functionality may require direct HTTP calls depending on GitBeaker version
   */
  async getRepositoryArchive(
    projectId: string | number,
    options: {
      format?: 'zip' | 'tar.gz' | 'tar.bz2' | 'tar';
      sha?: string;
    } = {}
  ): Promise<string> {
    // Return the archive URL instead of attempting to download
    const gitlabUrl = this.configService.get<string>('GITLAB_URL', 'https://gitlab.com');
    const archiveUrl = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId.toString())}/repository/archive.${options.format || 'zip'}`;
    
    this.logger.log(`Repository archive URL generated for project ${projectId}: ${archiveUrl}`);
    return archiveUrl;
  }

  /**
   * Validate GitLab URL format
   */
  isValidGitlabUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      
      // Remove .git suffix if present
      if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
        pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');
      }
      
      // Must have at least namespace/project
      return pathParts.length >= 2;
    } catch {
      return false;
    }
  }

  /**
   * Get project languages (for language detection)
   */
  async getProjectLanguages(projectId: string | number): Promise<Record<string, number>> {
    try {
      const languages = await this.gitlab.Projects.showLanguages(projectId);
      return languages;
    } catch (error) {
      this.logger.error(`Failed to get languages for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get project languages: ${projectId}`);
    }
  }

  /**
   * Get file raw content (alternative approach for file processing)
   */
  async getFileRaw(
    projectId: string | number,
    filePath: string,
    ref: string = 'main'
  ): Promise<string> {
    try {
      const file = await this.gitlab.RepositoryFiles.showRaw(projectId, filePath, ref);
      return file as string;
    } catch (error) {
      this.logger.error(`Failed to get raw file for ${filePath} in project ${projectId}:`, error);
      throw new BadRequestException(`Unable to get raw file: ${filePath}`);
    }
  }
}