import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Codebase, TekProject } from '@/entities';
import { CreateCodebaseDto } from './dto';
import { CodebaseAdapter } from './adapters';
import { GitlabService } from '../gitlab/gitlab.service';

@Injectable()
export class CodebaseService {
  private readonly logger = new Logger(CodebaseService.name);

  constructor(
    @InjectRepository(Codebase)
    private codebaseRepository: Repository<Codebase>,
    @InjectRepository(TekProject)
    private tekProjectRepository: Repository<TekProject>,
    private gitlabService: GitlabService,
  ) {}

  /**
   * Create a codebase within a TekProject
   */
  async create(createDto: CreateCodebaseDto): Promise<Codebase> {
    this.logger.log(`Creating codebase: ${createDto.name} for project: ${createDto.projectId}`);

    try {
      // Validate project exists
      const tekProject = await this.findTekProjectById(createDto.projectId);

      // Validate GitLab URL and extract project ID
      const gitlabProjectId = this.gitlabService.extractProjectIdFromUrl(createDto.gitlabUrl);
      
      // Verify GitLab project exists and is accessible
      const gitlabRepo = await this.gitlabService.getRepository(gitlabProjectId);
      
      if (!gitlabRepo) {
        throw new BadRequestException('GitLab project not found or not accessible');
      }

      // Create codebase using adapter
      const codebase = CodebaseAdapter.fromCreateDto(createDto, tekProject, gitlabRepo);
      const savedCodebase = await this.codebaseRepository.save(codebase);
      
      this.logger.log(`Codebase created successfully: ${savedCodebase.id}`);
      return savedCodebase;
    } catch (error) {
      this.logger.error(`Failed to create codebase: ${createDto.name}`, error);
      throw error;
    }
  }

  /**
   * Get codebase by ID
   */
  async findById(id: string): Promise<Codebase> {
    const codebase = await this.codebaseRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!codebase) {
      throw new NotFoundException(`Codebase ${id} not found`);
    }

    return codebase;
  }

  /**
   * List codebases for a TekProject
   */
  async findByProjectId(projectId: string): Promise<Codebase[]> {
    return await this.codebaseRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get codebase for indexing (used by indexing pipeline operations)
   */
  async findForIndexing(codebaseId: string): Promise<{
    tekProject: TekProject;
    codebase: Codebase;
  }> {
    this.logger.log(`Preparing codebase for indexing: ${codebaseId}`);

    const codebase = await this.codebaseRepository.findOne({
      where: { id: codebaseId },
      relations: ['project'],
    });

    if (!codebase) {
      throw new NotFoundException(`Codebase ${codebaseId} not found`);
    }

    return { 
      tekProject: codebase.project,
      codebase 
    };
  }

  /**
   * Helper method to find TekProject by ID
   */
  private async findTekProjectById(id: string): Promise<TekProject> {
    const tekProject = await this.tekProjectRepository.findOne({
      where: { id },
    });

    if (!tekProject) {
      throw new NotFoundException(`TekProject ${id} not found`);
    }

    return tekProject;
  }
}