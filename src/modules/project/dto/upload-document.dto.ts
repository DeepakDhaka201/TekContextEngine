import { IsString, IsOptional, IsIn, IsArray, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  bucketId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['markdown', 'pdf', 'text', 'html', 'other'])
  type: 'markdown' | 'pdf' | 'text' | 'html' | 'other';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}