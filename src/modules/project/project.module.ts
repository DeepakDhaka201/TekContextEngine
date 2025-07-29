import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { 
  TekProject, 
  Codebase, 
  DocsBucket,
  Document
} from '@/entities';
import { TekProjectService } from './tekproject.service';
import { CodebaseService } from './codebase.service';
import { DocumentService } from './document.service';
import { TekProjectController } from './tekproject.controller';
import { CodebaseController } from './codebase.controller';
import { DocsBucketController, DocumentController } from './document.controller';
import { GitlabModule } from '../gitlab/gitlab.module';
import { IndexingModule } from '../indexing/indexing.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TekProject,
      Codebase,
      DocsBucket,
      Document,
    ]),
    GitlabModule,
    IndexingModule,
  ],
  controllers: [TekProjectController, CodebaseController, DocsBucketController, DocumentController],
  providers: [TekProjectService, CodebaseService, DocumentService],
  exports: [TekProjectService, CodebaseService, DocumentService],
})
export class ProjectModule {}