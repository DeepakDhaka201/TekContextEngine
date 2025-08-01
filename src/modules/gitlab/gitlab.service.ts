import { Injectable, Inject, LoggerService, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Gitlab } from '@gitbeaker/rest';
import { GitLabRepository } from '@/common/types';
import { GitConfiguration } from '@/config';

@Injectable()
export class GitlabService {
  private readonly gitlab: InstanceType<typeof Gitlab>;
  private readonly gitConfig: GitConfiguration;

  constructor(
    configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.logger.debug('[GITLAB-SERVICE] Initializing GitLab service', 'GitlabService');

    this.gitConfig = GitConfiguration.getInstance(configService);
    const gitlabConfig = this.gitConfig.getGitLabConfig();

    this.logger.debug('[GITLAB-SERVICE] GitLab configuration loaded', 'GitlabService');
    this.logger.debug({
      url: gitlabConfig.url,
      hasToken: !!gitlabConfig.token,
      tokenLength: gitlabConfig.token?.length || 0
    }, 'GitlabService');

    // Initialize GitLab with proper token
    if (!gitlabConfig.token) {
      this.logger.error('[GITLAB-SERVICE] GitLab token is missing from configuration', 'GitlabService');
      throw new Error('GITLAB_TOKEN is required');
    }

    this.gitlab = new Gitlab({
      host: gitlabConfig.url,
      token: gitlabConfig.token,
    });

    this.logger.log('[GITLAB-SERVICE] GitLab service initialized successfully', {
      url: gitlabConfig.url
    });

    this.logger.log(`GitLab service initialized with URL: ${gitlabConfig.url}`);
  }

  /**
   * Extract project ID from GitLab URL
   * Supports various GitLab URL formats:
   * - https://gitlab.com/group/project
   * - https://gitlab.com/group/subgroup/project
   * - https://gitlab.example.com/namespace/project
   */
  extractProjectIdFromUrl(gitlabUrl: string): string {
    this.logger.debug('[GITLAB-SERVICE] Extracting project ID from GitLab URL', {
      gitlabUrl
    });

    try {
      const url = new URL(gitlabUrl);
      let pathParts = url.pathname.split('/').filter(Boolean);

      this.logger.debug('[GITLAB-SERVICE] URL parsed successfully', {
        host: url.host,
        pathname: url.pathname,
        pathParts,
        pathPartsCount: pathParts.length
      });

      // Remove trailing .git if present
      if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
        const originalLastPart = pathParts[pathParts.length - 1];
        pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');

        this.logger.debug('[GITLAB-SERVICE] Removed .git suffix', {
          originalLastPart,
          newLastPart: pathParts[pathParts.length - 1]
        });
      }

      // Remove common GitLab paths that aren't part of the project path
      const ignoredPrefixes = ['-', 'tree', 'blob', 'commits', 'merge_requests', 'issues'];
      const treeIndex = pathParts.findIndex(part => ignoredPrefixes.includes(part));

      this.logger.debug('[GITLAB-SERVICE] Checking for ignored prefixes', {
        ignoredPrefixes,
        treeIndex,
        foundIgnoredPrefix: treeIndex >= 0 ? pathParts[treeIndex] : null
      });

      if (treeIndex > 0) {
        const originalPathParts = [...pathParts];
        pathParts = pathParts.slice(0, treeIndex);

        this.logger.debug('[GITLAB-SERVICE] Trimmed path parts after ignored prefix', {
          originalPathParts,
          trimmedPathParts: pathParts,
          removedParts: originalPathParts.slice(treeIndex)
        });
      }

      if (pathParts.length < 2) {
        this.logger.error('[GITLAB-SERVICE] Invalid GitLab URL format - insufficient path parts', {
          pathParts,
          pathPartsCount: pathParts.length,
          gitlabUrl
        });
        throw new Error('Invalid GitLab URL format - must contain at least namespace/project');
      }

      // Join all parts as GitLab supports nested groups
      const projectPath = pathParts.join('/');

      this.logger.debug('[GITLAB-SERVICE] Project ID extracted successfully', {
        projectPath,
        pathParts,
        gitlabUrl
      });

      // Don't encode here - let GitLab SDK handle encoding
      return projectPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[GITLAB-SERVICE] Failed to extract project ID from URL', {
        gitlabUrl,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Failed to extract project ID from URL: ${gitlabUrl}`, error);
      throw new BadRequestException(`Invalid GitLab URL format: ${gitlabUrl}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(projectId: string | number): Promise<GitLabRepository> {
    this.logger.debug('[GITLAB-SERVICE] Getting repository information', {
      projectId
    });

    try {
      const requestStartTime = Date.now();
      const project = await this.gitlab.Projects.show(projectId);
      const requestDuration = Date.now() - requestStartTime;

      this.logger.debug('[GITLAB-SERVICE] Repository information retrieved successfully', {
        projectId,
        projectName: project.name,
        projectPath: project.path_with_namespace,
        defaultBranch: project.default_branch,
        visibility: project.visibility,
        requestDurationMs: requestDuration
      });

      return project as GitLabRepository;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('[GITLAB-SERVICE] Failed to get repository information', {
        projectId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      this.logger.error(`Failed to get repository info for project ${projectId}:`, error);
      throw new BadRequestException(`Unable to access GitLab project: ${projectId}`);
    }
  }


}