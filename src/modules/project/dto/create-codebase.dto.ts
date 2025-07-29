import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateCodebaseDto {
  @IsUUID()
  projectId: string;

  @IsString()
  name: string;

  @IsString()
  gitlabUrl: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsIn(['manual', 'auto', 'webhook'])
  indexMode?: 'manual' | 'auto' | 'webhook';

  @IsOptional()
  @IsString()
  language?: string;
}