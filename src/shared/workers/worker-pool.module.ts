import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkerPoolService } from './worker-pool.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WorkerPoolService],
  exports: [WorkerPoolService],
})
export class WorkerPoolModule {}
