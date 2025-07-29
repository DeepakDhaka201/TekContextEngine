import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateDocsBucketDto {
  @IsUUID()
  projectId: string;

  @IsString()
  name: string;

  @IsIn(['API_DOCS', 'USER_FLOWS', 'SECURITY_GUIDELINES', 'ARCHITECTURE', 'DEPLOYMENT', 'OTHER'])
  type: 'API_DOCS' | 'USER_FLOWS' | 'SECURITY_GUIDELINES' | 'ARCHITECTURE' | 'DEPLOYMENT' | 'OTHER';

  @IsOptional()
  @IsString()
  description?: string;
}