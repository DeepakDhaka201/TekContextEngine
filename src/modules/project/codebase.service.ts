import { Injectable, Inject, LoggerService, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Codebase, TekProject } from '@/entities';
import { CreateCodebaseDto } from './dto';
import { PaginationOptions, PaginatedResult } from '@/common/types';
import { CodebaseAdapter } from './adapters';
import { GitlabService } from '../gitlab/gitlab.service';

@Injectable()
export class CodebaseService {
  constructor(
    @InjectRepository(Codebase)
    private codebaseRepository: Repository<Codebase>,
    @InjectRepository(TekProject)
    private tekProjectRepository: Repository<TekProject>,
    private gitlabService: GitlabService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
   * List codebases for a TekProject with pagination
   */
  async findByProjectId(
    projectId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Codebase>> {
    const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;

    const [codebases, total] = await this.codebaseRepository.findAndCount({
      where: { project: { id: projectId } },
      relations: ['project'],
      order: { [sort]: orderBy.toUpperCase() as 'ASC' | 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return {
      data: codebases,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasNext: page * perPage < total,
      hasPrevious: page > 1,
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