import { IsString, IsOptional, IsIn, IsArray, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  bucketId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['markdown', 'pdf', 'text', 'html', 'documentation', 'specification', 'guide', 'other'])
  type: 'markdown' | 'pdf' | 'text' | 'html' | 'documentation' | 'specification' | 'guide' | 'other';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}