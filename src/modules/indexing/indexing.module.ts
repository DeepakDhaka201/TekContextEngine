import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TekProject,
  Codebase
} from '@/entities';
import { IndexJob } from './entities/index-job.entity';
import { JobOrchestratorService } from './jobs/services/job-orchestrator.service';
import { JobWorkerService } from './jobs/services/job-worker.service';
import { TaskConfigService } from './config/task-config.service';
import { DockerParserService } from './services/docker-parser.service';
import { ParserOutputTransformerService } from './services/parser-output-transformer.service';
import { Neo4jService } from './services/neo4j.service';
import { GraphService } from './services/graph.service';
import { GitSyncTask } from './jobs/tasks/git-sync.task';
import { CodeParsingTask } from './jobs/tasks/code-parsing.task';
import { GraphUpdateTask } from './jobs/tasks/graph-update.task';
import { CleanupTask } from './jobs/tasks/cleanup.task';
import { IndexingController } from './indexing.controller';

import { GitlabModule } from '../gitlab/gitlab.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TekProject,
      Codebase,
      IndexJob,
    ]),
    forwardRef(() => GitlabModule),
  ],
  controllers: [IndexingController],
  providers: [
    JobOrchestratorService,
    JobWorkerService,
    TaskConfigService,
    DockerParserService,
    ParserOutputTransformerService,
    Neo4jService,
    GraphService,
    GitSyncTask,
    CodeParsingTask,
    GraphUpdateTask,
    CleanupTask,
  ],
  exports: [
    JobOrchestratorService,
    JobWorkerService,
    TaskConfigService,
  ],
})
export class IndexingModule {}