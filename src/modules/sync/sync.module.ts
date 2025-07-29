import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexingModule } from '../indexing/indexing.module';

/**
 * @deprecated This module is deprecated and will be removed.
 * All sync functionality has been moved to the IndexingModule.
 * 
 * The SyncModule now just re-exports the IndexingModule for backward compatibility.
 * Update your imports to use IndexingModule directly.
 */
@Module({
  imports: [
    ConfigModule,
    IndexingModule, // New pipeline-based indexing system
  ],
  exports: [
    IndexingModule,
  ],
})
export class SyncModule {}