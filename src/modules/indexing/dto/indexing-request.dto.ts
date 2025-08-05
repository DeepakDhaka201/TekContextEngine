import { IsOptional, IsString, IsBoolean, IsNumber, IsObject, ValidateNested, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LanguageConfigDto {
  @ApiProperty({ description: 'Whether this language is enabled for parsing' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Docker image for parsing this language' })
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiPropertyOptional({ description: 'Additional options for the parser' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class GitSyncConfigDto {
  @ApiPropertyOptional({ description: 'Use shallow clone (faster, less history)' })
  @IsOptional()
  @IsBoolean()
  shallow?: boolean;

  @ApiPropertyOptional({ description: 'Include deleted files in sync' })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Maximum file size to process (bytes)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFileSize?: number;

  @ApiPropertyOptional({ description: 'Patterns to exclude from sync' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}

export class CodeParsingConfigDto {
  @ApiPropertyOptional({ description: 'Language-specific parsing configuration' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  languages?: {
    java?: LanguageConfigDto;
    typescript?: LanguageConfigDto;
  };

  @ApiPropertyOptional({ description: 'Maximum file size to parse (bytes)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFileSize?: number;

  @ApiPropertyOptional({ description: 'Output format for parsing results' })
  @IsOptional()
  @IsString()
  outputFormat?: 'json' | 'protobuf';
}

export class GraphUpdateConfigDto {
  @ApiPropertyOptional({ description: 'Batch size for graph updates' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Enable vector indexing for semantic search' })
  @IsOptional()
  @IsBoolean()
  enableVectorIndex?: boolean;

  @ApiPropertyOptional({ description: 'Vector dimensions for embeddings' })
  @IsOptional()
  @IsNumber()
  @Min(128)
  @Max(2048)
  vectorDimensions?: number;

  @ApiPropertyOptional({ description: 'Indexing mode: sync or async' })
  @IsOptional()
  @IsString()
  indexingMode?: 'sync' | 'async';
}

export class FullIndexRequestDto {
  @ApiPropertyOptional({ description: 'Description of the indexing job' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Git sync configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GitSyncConfigDto)
  gitSync?: GitSyncConfigDto;

  @ApiPropertyOptional({ description: 'Code parsing configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodeParsingConfigDto)
  codeParsing?: CodeParsingConfigDto;

  @ApiPropertyOptional({ description: 'Graph update configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GraphUpdateConfigDto)
  graphUpdate?: GraphUpdateConfigDto;
}

export class IncrementalUpdateRequestDto {
  @ApiProperty({ description: 'Base commit hash to start from' })
  @IsString()
  baseCommit: string;

  @ApiProperty({ description: 'Target commit hash to update to' })
  @IsString()
  targetCommit: string;

  @ApiPropertyOptional({ description: 'Description of the incremental update' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Git sync configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GitSyncConfigDto)
  gitSync?: GitSyncConfigDto;

  @ApiPropertyOptional({ description: 'Code parsing configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodeParsingConfigDto)
  codeParsing?: CodeParsingConfigDto;

  @ApiPropertyOptional({ description: 'Graph update configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GraphUpdateConfigDto)
  graphUpdate?: GraphUpdateConfigDto;
}
