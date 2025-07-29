import { TekProject, ProjectStatus } from '@/entities';
import { CreateTekProjectDto, UpdateTekProjectDto } from '../dto';

export class TekProjectAdapter {
  /**
   * Map CreateTekProjectDto to TekProject entity
   */
  static fromCreateDto(dto: CreateTekProjectDto): TekProject {
    const tekProject = new TekProject();
    tekProject.name = dto.name;
    tekProject.slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    tekProject.description = dto.description || '';
    tekProject.status = ProjectStatus.ACTIVE;
    tekProject.metadata = {
      techStack: dto.techStack || [],
      createdBy: 'system', // TODO: Add user context
    };
    return tekProject;
  }

  /**
   * Map UpdateTekProjectDto to update existing TekProject entity
   */
  static fromUpdateDto(existingProject: TekProject, dto: UpdateTekProjectDto): TekProject {
    const updatedProject = { ...existingProject };
    
    if (dto.name !== undefined) {
      updatedProject.name = dto.name;
      updatedProject.slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    if (dto.description !== undefined) {
      updatedProject.description = dto.description;
    }
    
    if (dto.status !== undefined) {
      updatedProject.status = dto.status as ProjectStatus;
    }
    
    if (dto.techStack !== undefined) {
      updatedProject.metadata = {
        ...updatedProject.metadata,
        techStack: dto.techStack,
      };
    }
    
    updatedProject.updatedAt = new Date();
    return updatedProject;
  }
}