import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { DatabaseModule } from './shared/database/database.module';
import { StorageModule } from './shared/storage/storage.module';
import { WorkerPoolModule } from './shared/workers/worker-pool.module';
import { ProjectModule } from './modules/project/project.module';
import { SyncModule } from './modules/sync/sync.module';
import { IndexingModule } from './modules/indexing/indexing.module';
import { GitlabModule } from './modules/gitlab/gitlab.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Logging
    WinstonModule.forRootAsync({
      useFactory: () => {
        return {
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.colorize({ all: true }),
                winston.format.printf(({ timestamp, level, message, context }) => {
                  const contextStr = context ? `[${context}] ` : '';
                  return `${timestamp} ${level}: ${contextStr}${message}`;
                }),
              ),
            }),
          ],
        };
      },
      inject: [],
    }),

    // Database
    DatabaseModule,

    // Storage
    StorageModule,

    // Worker Pools
    WorkerPoolModule,

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    ProjectModule,
    SyncModule, // Legacy - marked for deprecation
    IndexingModule, // New pipeline-based indexing system
    GitlabModule,
    HealthModule,
    WebSocketModule,
  ],
})
export class AppModule {}
