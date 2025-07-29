import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitlabService } from './gitlab.service';
import { GitClientService } from './git-client.service';
import { GitLabWebhookService } from './gitlab-webhook.service';
import { Codebase } from '@/entities';
import { IndexingModule } from '../indexing/indexing.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Codebase]),
    IndexingModule,
  ],
  providers: [
    GitlabService,
    GitClientService,
    GitLabWebhookService,
  ],
  exports: [
    GitlabService,
    GitClientService,
    GitLabWebhookService,
  ],
})
export class GitlabModule {}
