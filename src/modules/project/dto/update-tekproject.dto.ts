import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ProjectStatus } from '@/entities';

export class UpdateTekProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];
}