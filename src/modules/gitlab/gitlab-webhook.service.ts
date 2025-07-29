import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Codebase, SyncMode } from '@/entities';
import { PipelineOrchestratorService } from '@/modules/indexing/pipeline/services/pipeline-orchestrator.service';
import { IndexPipelineType } from '@/modules/indexing/entities/index-pipeline.entity';
import * as crypto from 'crypto';

export interface GitLabWebhookPayload {
  object_kind: string;
  event_name: string;
  before: string;
  after: string;
  ref: string;
  checkout_sha: string;
  user_id: number;
  user_name: string;
  user_username: string;
  user_email: string;
  user_avatar: string;
  project_id: number;
  project: {
    id: number;
    name: string;
    description: string;
    web_url: string;
    avatar_url: string;
    git_ssh_url: string;
    git_http_url: string;
    namespace: string;
    visibility_level: number;
    path_with_namespace: string;
    default_branch: string;
    homepage: string;
    url: string;
    ssh_url: string;
    http_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    title: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  total_commits_count: number;
  repository: {
    name: string;
    url: string;
    description: string;
    homepage: string;
    git_http_url: string;
    git_ssh_url: string;
    visibility_level: number;
  };
}

export interface WebhookProcessingResult {
  processed: boolean;
  pipelineId?: string;
  reason?: string;
  error?: string;
}

@Injectable()
export class GitLabWebhookService {
  private readonly logger = new Logger(GitLabWebhookService.name);

  constructor(
    @InjectRepository(Codebase)
    private codebaseRepository: Repository<Codebase>,
    private pipelineOrchestrator: PipelineOrchestratorService,
    private configService: ConfigService,
  ) {}

  /**
   * Process incoming GitLab webhook
   */
  async processWebhook(
    payload: GitLabWebhookPayload,
    signature?: string,
    codebaseId?: string
  ): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing GitLab webhook: ${payload.object_kind} for project ${payload.project_id}`);

    try {
      // Find codebase(s) that match this webhook
      const codebases = await this.findMatchingCodebases(payload, codebaseId);
      
      if (codebases.length === 0) {
        return {
          processed: false,
          reason: 'No matching codebases found for webhook',
        };
      }

      // Process webhook for each matching codebase
      const results: WebhookProcessingResult[] = [];
      
      for (const codebase of codebases) {
        // Verify webhook signature if secret is configured
        if (codebase.webhookSecret && signature) {
          const isValid = await this.verifyWebhookSignature(
            JSON.stringify(payload),
            signature,
            codebase.webhookSecret
          );
          
          if (!isValid) {
            this.logger.warn(`Invalid webhook signature for codebase ${codebase.id}`);
            results.push({
              processed: false,
              reason: 'Invalid webhook signature',
            });
            continue;
          }
        }

        // Check if codebase is configured for webhook sync
        if (codebase.syncMode !== SyncMode.WEBHOOK && codebase.syncMode !== SyncMode.AUTO) {
          this.logger.log(`Codebase ${codebase.id} not configured for webhook sync`);
          results.push({
            processed: false,
            reason: 'Codebase not configured for webhook sync',
          });
          continue;
        }

        // Process the webhook based on event type
        const result = await this.processWebhookEvent(payload, codebase);
        results.push(result);
      }

      // Return the first successful result or the last result
      const successfulResult = results.find(r => r.processed);
      return successfulResult || results[results.length - 1];

    } catch (error) {
      this.logger.error('Failed to process GitLab webhook:', error);
      return {
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Process webhook event based on type
   */
  private async processWebhookEvent(
    payload: GitLabWebhookPayload,
    codebase: Codebase
  ): Promise<WebhookProcessingResult> {
    switch (payload.object_kind) {
      case 'push':
        return this.processPushEvent(payload, codebase);
      
      case 'merge_request':
        return this.processMergeRequestEvent(payload, codebase);
      
      case 'tag_push':
        return this.processTagPushEvent(payload, codebase);
      
      default:
        this.logger.log(`Unsupported webhook event type: ${payload.object_kind}`);
        return {
          processed: false,
          reason: `Unsupported webhook event type: ${payload.object_kind}`,
        };
    }
  }

  /**
   * Process push event
   */
  private async processPushEvent(
    payload: GitLabWebhookPayload,
    codebase: Codebase
  ): Promise<WebhookProcessingResult> {
    // Check if push is to the tracked branch
    const branchName = payload.ref.replace('refs/heads/', '');
    if (branchName !== codebase.branch) {
      this.logger.log(`Push to non-tracked branch ${branchName}, ignoring`);
      return {
        processed: false,
        reason: `Push to non-tracked branch: ${branchName}`,
      };
    }

    // Skip if this is a zero commit (branch deletion)
    if (payload.after === '0000000000000000000000000000000000000000') {
      this.logger.log('Branch deletion detected, ignoring');
      return {
        processed: false,
        reason: 'Branch deletion event',
      };
    }

    // Check if there are actually commits to process
    if (payload.total_commits_count === 0) {
      this.logger.log('No commits in push event, ignoring');
      return {
        processed: false,
        reason: 'No commits in push event',
      };
    }

    // Create pipeline for webhook sync
    const pipeline = await this.pipelineOrchestrator.createPipeline({
      projectId: codebase.project.id,
      codebaseId: codebase.id,
      type: IndexPipelineType.INCREMENTAL, // Webhook pushes are typically incremental
      baseCommit: payload.before !== '0000000000000000000000000000000000000000' ? payload.before : undefined,
      targetCommit: payload.after,
      priority: 2, // Higher priority for webhook events
      description: `Webhook push: ${payload.commits.length} commits`,
    });

    this.logger.log(`Created webhook pipeline ${pipeline.id} for codebase ${codebase.id}`);

    return {
      processed: true,
      pipelineId: pipeline.id,
    };
  }

  /**
   * Process merge request event
   */
  private async processMergeRequestEvent(
    payload: any,
    codebase: Codebase
  ): Promise<WebhookProcessingResult> {
    // Only process merged merge requests to the tracked branch
    if (payload.object_attributes?.state !== 'merged') {
      return {
        processed: false,
        reason: 'Merge request not merged',
      };
    }

    const targetBranch = payload.object_attributes?.target_branch;
    if (targetBranch !== codebase.branch) {
      return {
        processed: false,
        reason: `Merge request target branch ${targetBranch} does not match tracked branch`,
      };
    }

    // Create pipeline for the merge
    const pipeline = await this.pipelineOrchestrator.createPipeline({
      projectId: codebase.project.id,
      codebaseId: codebase.id,
      type: IndexPipelineType.INCREMENTAL, // Merge is incremental sync
      priority: 2,
      description: `Merge request webhook`,
    });

    this.logger.log(`Created merge request pipeline ${pipeline.id} for codebase ${codebase.id}`);

    return {
      processed: true,
      pipelineId: pipeline.id,
    };
  }

  /**
   * Process tag push event
   */
  private async processTagPushEvent(
    payload: GitLabWebhookPayload,
    codebase: Codebase
  ): Promise<WebhookProcessingResult> {
    // Skip tag deletions
    if (payload.after === '0000000000000000000000000000000000000000') {
      return {
        processed: false,
        reason: 'Tag deletion event',
      };
    }

    // Only process tags that match certain patterns (e.g., version tags)
    const tagName = payload.ref.replace('refs/tags/', '');
    const versionTagPattern = /^v?\d+\.\d+\.\d+/;
    
    if (!versionTagPattern.test(tagName)) {
      return {
        processed: false,
        reason: `Tag ${tagName} does not match version pattern`,
      };
    }

    // Create pipeline for the tagged commit
    const pipeline = await this.pipelineOrchestrator.createPipeline({
      projectId: codebase.project.id,
      codebaseId: codebase.id,
      type: IndexPipelineType.FULL, // Tag pushes often warrant full resync
      priority: 1, // Lower priority for tag events
      description: `Tag webhook: ${tagName}`,
    });

    this.logger.log(`Created tag pipeline ${pipeline.id} for codebase ${codebase.id} (tag: ${tagName})`);

    return {
      processed: true,
      pipelineId: pipeline.id,
    };
  }

  /**
   * Find codebases that match the webhook payload
   */
  private async findMatchingCodebases(
    payload: GitLabWebhookPayload,
    codebaseId?: string
  ): Promise<Codebase[]> {
    if (codebaseId) {
      // Specific codebase requested
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
      });
      
      return codebase ? [codebase] : [];
    }

    // Find by GitLab project ID or URL
    const codebases = await this.codebaseRepository.find({
      where: [
        { gitlabProjectId: payload.project_id },
        { gitlabUrl: payload.project.web_url },
        { gitlabUrl: payload.project.http_url },
        { gitlabUrl: payload.project.git_http_url },
        { gitlabUrl: payload.project.git_ssh_url },
      ],
    });

    return codebases;
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      // GitLab uses X-Gitlab-Token header for simple token verification
      // or X-Hub-Signature-256 for HMAC-SHA256 signature
      
      if (signature.startsWith('sha256=')) {
        // HMAC-SHA256 signature verification
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
          
        const receivedSignature = signature.replace('sha256=', '');
        
        return crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(receivedSignature, 'hex')
        );
      } else {
        // Simple token verification
        return signature === secret;
      }
    } catch (error) {
      this.logger.error('Failed to verify webhook signature:', error);
      return false;
    }
  }

  /**
   * Generate webhook secret for a codebase
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get webhook URL for a codebase
   */
  getWebhookUrl(codebaseId: string): string {
    const baseUrl = this.configService.get('APP_BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/api/v1/gitlab/webhook/${codebaseId}`;
  }

  /**
   * Get webhook configuration for GitLab
   */
  getWebhookConfig(codebaseId: string, secret: string) {
    return {
      url: this.getWebhookUrl(codebaseId),
      push_events: true,
      issues_events: false,
      merge_requests_events: true,
      tag_push_events: true,
      note_events: false,
      job_events: false,
      pipeline_events: false,
      wiki_page_events: false,
      deployment_events: false,
      releases_events: false,
      subgroup_events: false,
      enable_ssl_verification: true,
      token: secret,
      push_events_branch_filter: '', // Can be configured per codebase
    };
  }

  /**
   * Test webhook configuration
   */
  async testWebhook(codebaseId: string): Promise<boolean> {
    try {
      const codebase = await this.codebaseRepository.findOne({
        where: { id: codebaseId },
      });

      if (!codebase) {
        throw new Error(`Codebase ${codebaseId} not found`);
      }

      // Create a test payload
      const testPayload: Partial<GitLabWebhookPayload> = {
        object_kind: 'push',
        event_name: 'push',
        before: '0000000000000000000000000000000000000000',
        after: 'test123456789',
        ref: `refs/heads/${codebase.branch}`,
        project_id: codebase.gitlabProjectId || 0,
        total_commits_count: 0,
        project: {
          id: codebase.gitlabProjectId || 0,
          name: codebase.name,
          web_url: codebase.gitlabUrl,
          git_http_url: codebase.gitlabUrl,
        } as any,
        commits: [],
      };

      const result = await this.processWebhook(testPayload as GitLabWebhookPayload);
      
      this.logger.log(`Webhook test for codebase ${codebaseId}: ${result.processed ? 'SUCCESS' : 'FAILED'}`);
      return result.processed;
    } catch (error) {
      this.logger.error(`Webhook test failed for codebase ${codebaseId}:`, error);
      return false;
    }
  }
}