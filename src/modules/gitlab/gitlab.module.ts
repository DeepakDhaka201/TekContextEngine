import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitlabService } from './gitlab.service';
import { GitClientService } from './git-client.service';
import { Codebase } from '@/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Codebase]),
  ],
  providers: [
    GitlabService,
    GitClientService,
  ],
  exports: [
    GitlabService,
    GitClientService,
  ],
})
export class GitlabModule {}
