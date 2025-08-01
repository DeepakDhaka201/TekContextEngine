import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TekProject,
  Codebase
} from '@/entities';
import { IndexPipeline } from './entities/index-pipeline.entity';
import { PipelineOrchestratorService } from './pipeline/services/pipeline-orchestrator.service';
import { PipelineWorkerService } from './pipeline/services/pipeline-worker.service';
import { PipelineConfigService } from './config/pipeline-config.service';
import { GitSyncTask } from './pipeline/tasks/git-sync.task';
import { CodeParsingTask } from './pipeline/tasks/code-parsing.task';
import { GraphUpdateTask } from './pipeline/tasks/graph-update.task';
import { CleanupTask } from './pipeline/tasks/cleanup.task';
import { IndexingController } from './indexing.controller';

import { GitlabModule } from '../gitlab/gitlab.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TekProject,
      Codebase,
      IndexPipeline,
    ]),
    forwardRef(() => GitlabModule),
  ],
  controllers: [IndexingController],
  providers: [
    PipelineOrchestratorService,
    PipelineWorkerService,
    PipelineConfigService,
    GitSyncTask,
    CodeParsingTask,
    GraphUpdateTask,
    CleanupTask,
  ],
  exports: [
    PipelineOrchestratorService,
    PipelineWorkerService,
    PipelineConfigService,
  ],
})
export class IndexingModule {}