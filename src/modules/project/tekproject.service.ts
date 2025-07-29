import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TekProject, ProjectStatus } from '@/entities';
import { PaginatedResult, PaginationOptions } from '@/common/types';
import { CreateTekProjectDto, UpdateTekProjectDto } from './dto';
import { TekProjectAdapter } from './adapters';

@Injectable()
export class TekProjectService {
  private readonly logger = new Logger(TekProjectService.name);

  constructor(
    @InjectRepository(TekProject)
    private tekProjectRepository: Repository<TekProject>,
  ) {}

  /**
   * Create a new TekProject (organization/product level)
   */
  async create(createDto: CreateTekProjectDto): Promise<TekProject> {
    this.logger.log(`Creating TekProject: ${createDto.name}`);

    try {
      const tekProject = TekProjectAdapter.fromCreateDto(createDto);
      const savedProject = await this.tekProjectRepository.save(tekProject);

      this.logger.log(`TekProject created successfully: ${savedProject.id}`);
      return savedProject;
    } catch (error) {
      this.logger.error(`Failed to create TekProject: ${createDto.name}`, error);
      throw error;
    }
  }

  /**
   * Get TekProject by ID with relations
   */
  async findById(id: string): Promise<TekProject> {
    const tekProject = await this.tekProjectRepository.findOne({
      where: { id },
      relations: ['codebases', 'docsBuckets'],
    });

    if (!tekProject) {
      throw new NotFoundException(`TekProject ${id} not found`);
    }

    return tekProject;
  }

  /**
   * List TekProjects with pagination
   */
  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<TekProject>> {
    const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;
    
    const [tekProjects, total] = await this.tekProjectRepository.findAndCount({
      relations: ['codebases', 'docsBuckets'],
      order: { [sort]: orderBy.toUpperCase() as 'ASC' | 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return {
      data: tekProjects,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasNext: page * perPage < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Update TekProject
   */
  async update(id: string, updateDto: UpdateTekProjectDto): Promise<TekProject> {
    const existingProject = await this.findById(id);
    const updatedProject = TekProjectAdapter.fromUpdateDto(existingProject, updateDto);
    
    return await this.tekProjectRepository.save(updatedProject);
  }

  /**
   * Delete TekProject (soft delete by setting status to DELETED)
   */
  async delete(id: string): Promise<void> {
    const tekProject = await this.tekProjectRepository.findOne({
      where: { id },
      relations: ['codebases', 'docsBuckets']
    });
    
    if (!tekProject) {
      throw new NotFoundException(`TekProject ${id} not found`);
    }
    
    // Soft delete cascading to related entities
    tekProject.status = ProjectStatus.DELETED;
    tekProject.updatedAt = new Date();
    
    // Soft delete codebases
    if (tekProject.codebases) {
      tekProject.codebases.forEach(codebase => {
        codebase.status = 'ARCHIVED' as any;
        codebase.updatedAt = new Date();
      });
    }
    
    // Archive docs buckets
    if (tekProject.docsBuckets) {
      tekProject.docsBuckets.forEach(bucket => {
        bucket.status = 'ARCHIVED' as any;
        bucket.updatedAt = new Date();
      });
    }
    
    await this.tekProjectRepository.save(tekProject);
    this.logger.log(`TekProject deleted with cascading: ${id}`);
  }
}